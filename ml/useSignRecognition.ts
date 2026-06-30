"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  initHandTracking,
  detectForVideo,
  resultToFeatures,
  disposeHandTracking,
  FEATURE_COUNT,
} from "./mediapipeHands";
import {
  loadSignModel,
  predictFromSequence,
  type SignModel,
} from "./tfjsPredictor";
import { phraseForLabel, isNoSign } from "./labels";
import { drawLandmarks } from "./drawLandmarks";
import type { Prediction } from "@/types/prediction";
import type { Language } from "@/i18n/translations";

export type RecognitionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "error";

/** Live, raw top prediction used for "detecting…" feedback. */
export type LivePrediction = { label: string; confidence: number };

type Options = {
  language: Language;
  /** Called when a confident sign is committed (stabilized). */
  onResult?: (prediction: Prediction) => void;
};

// Real-time tuning. The model was trained on 40 frames spanning the central
// portion of each sign clip, so we sample our 40 frames evenly across a fixed
// time window rather than using whatever the raw camera framerate produces.
const WINDOW_MS = 2000; // temporal span fed to the model
const MIN_SPAN_MS = 1100; // wait until we have at least this much history
const INFERENCE_INTERVAL_MS = 250; // how often we run the model
const STABILITY_COUNT = 3; // identical top labels needed to commit

type FrameSample = {
  features: Float32Array;
  present: boolean;
  t: number;
};

/**
 * Real-time sign recognition.
 *
 * Per video frame: MediaPipe detects landmarks → 128-D features (matching
 * training) → pushed into a timestamped ring buffer and drawn as an overlay.
 * Every ~250ms the buffer is resampled to 40 frames evenly spaced across a 2s
 * window and run through the TF.js model. Predictions are stabilized: a label
 * must repeat for several consecutive inferences before it is committed.
 */
export function useSignRecognition({ language, onResult }: Options) {
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [live, setLive] = useState<LivePrediction | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modelRef = useRef<SignModel | null>(null);
  const framesRef = useRef<FrameSample[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastInferenceRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const recentLabelsRef = useRef<string[]>([]);
  const committedLabelRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const languageRef = useRef<Language>(language);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // If the language changes while a result is showing, re-localize its phrase.
  useEffect(() => {
    setPrediction((prev) =>
      prev ? { ...prev, phrase: phraseForLabel(prev.label, language) } : prev,
    );
  }, [language]);

  const prepare = useCallback(async () => {
    if (modelRef.current) return;
    setStatus("loading");
    setError(null);
    try {
      const [, model] = await Promise.all([
        initHandTracking(),
        loadSignModel(),
      ]);
      modelRef.current = model;
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to load the model.",
      );
    }
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    framesRef.current = [];
    recentLabelsRef.current = [];
    setHandDetected(false);
    setLive(null);
    if (modelRef.current) setStatus("ready");
  }, []);

  /** Resample the timestamped buffer to exactly `length` evenly-spaced frames. */
  const resample = useCallback(
    (now: number, length: number): { seq: Float32Array[]; coverage: number } => {
      const frames = framesRef.current;
      const seq: Float32Array[] = [];
      let present = 0;
      const start = now - WINDOW_MS;
      for (let i = 0; i < length; i++) {
        const target = start + (WINDOW_MS * i) / (length - 1);
        // Nearest frame by timestamp.
        let best = frames[0];
        let bestDist = Infinity;
        for (const f of frames) {
          const d = Math.abs(f.t - target);
          if (d < bestDist) {
            bestDist = d;
            best = f;
          }
        }
        if (best) {
          seq.push(best.features);
          if (best.present) present++;
        } else {
          seq.push(new Float32Array(FEATURE_COUNT));
        }
      }
      return { seq, coverage: present / length };
    },
    [],
  );

  const runInference = useCallback(async (model: SignModel, now: number) => {
    const { seq, coverage } = resample(now, model.sequenceLength);
    if (coverage < model.minHandCoverage) {
      // Hands left the frame: clear stabilization so stale labels don't commit.
      recentLabelsRef.current = [];
      setLive(null);
      return;
    }

    try {
      const { prediction: pred } = await predictFromSequence(model, seq);

      // Live feedback: show the raw top sign (unless it's the background class).
      if (!isNoSign(pred.label)) {
        setLive({ label: pred.label, confidence: pred.confidence });
      } else {
        setLive(null);
      }

      // Stabilization: require the same confident, non-background label to
      // repeat across consecutive inferences before committing it.
      const history = recentLabelsRef.current;
      const confident =
        !isNoSign(pred.label) && pred.confidence >= model.confidenceThreshold;
      history.push(confident ? pred.label : "");
      if (history.length > STABILITY_COUNT) history.shift();

      const stable =
        history.length === STABILITY_COUNT &&
        history.every((l) => l === pred.label) &&
        confident;

      if (stable && committedLabelRef.current !== pred.label) {
        committedLabelRef.current = pred.label;
        const phrase = phraseForLabel(pred.label, languageRef.current);
        const enriched: Prediction = { ...pred, phrase };
        setPrediction(enriched);
        onResultRef.current?.(enriched);
      } else if (coverage < model.minHandCoverage) {
        committedLabelRef.current = null;
      }
    } catch {
      // Swallow transient inference errors; the loop keeps running.
    }
  }, [resample]);

  const start = useCallback(
    async (video: HTMLVideoElement, overlay?: HTMLCanvasElement | null) => {
      if (!modelRef.current) await prepare();
      const model = modelRef.current;
      if (!model) return;

      canvasRef.current = overlay ?? null;
      runningRef.current = true;
      setStatus("running");
      lastVideoTimeRef.current = -1;
      framesRef.current = [];
      recentLabelsRef.current = [];
      committedLabelRef.current = null;

      const loop = () => {
        if (!runningRef.current) return;

        if (
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current = video.currentTime;
          const ts = performance.now();
          const result = detectForVideo(video, ts);

          // Live landmark overlay for immediate visual feedback.
          if (canvasRef.current) {
            drawLandmarks(canvasRef.current, video, result);
          }

          const { features, handPresent } = resultToFeatures(result);
          setHandDetected(handPresent);

          // Append to the timestamped ring buffer; drop frames older than the
          // window (with a small margin).
          const frames = framesRef.current;
          frames.push({ features, present: handPresent, t: ts });
          const cutoff = ts - WINDOW_MS - 200;
          while (frames.length > 0 && frames[0].t < cutoff) frames.shift();

          // Run inference once we have enough temporal history.
          const span = ts - frames[0].t;
          if (
            span >= MIN_SPAN_MS &&
            ts - lastInferenceRef.current > INFERENCE_INTERVAL_MS
          ) {
            lastInferenceRef.current = ts;
            void runInference(model, ts);
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    },
    [prepare, runInference],
  );

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      disposeHandTracking();
    };
  }, []);

  return {
    status,
    prediction,
    live,
    handDetected,
    error,
    prepare,
    start,
    stop,
  };
}

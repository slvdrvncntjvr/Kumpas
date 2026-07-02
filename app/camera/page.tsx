"use client";

import { useEffect, useRef, useState } from "react";
import { CameraPreview } from "@/components/CameraPreview";
import { SpeakButton } from "@/components/SpeakButton";
import { formatConfidence, confidenceLevel } from "@/utils/confidence";
import type { Prediction } from "@/types/prediction";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useSignRecognition } from "@/ml/useSignRecognition";

/**
 * FSL Camera — real-time sign recognition.
 *
 * Pipeline: getUserMedia video → MediaPipe Hands (live landmark overlay) →
 * 128-D landmark features sampled across a 2s window → TF.js model
 * (converted from the Keras training pipeline) → stabilized phrase.
 */
export default function CameraPage() {
  const { language, t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [active, setActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { status, prediction, live, handDetected, error, prepare, start, stop } =
    useSignRecognition({ language });

  // Preload the model + MediaPipe on mount so the first Start is responsive.
  useEffect(() => {
    void prepare();
  }, [prepare]);

  const stopCamera = () => {
    stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  // Stop the camera stream on unmount. Self-contained so it doesn't depend on
  // the re-created stopCamera closure; `stop` from the hook is stable.
  useEffect(() => {
    return () => {
      stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [stop]);

  const startCamera = async () => {
    setCameraError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(t("camera.notAvailable"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);
        void start(videoRef.current, overlayRef.current);
      }
    } catch {
      setCameraError(t("camera.denied"));
    }
  };

  const confLabel = (value: number) => {
    const level = confidenceLevel(value);
    return t(`camera.conf${level.charAt(0).toUpperCase()}${level.slice(1)}`);
  };

  const isLoadingModel = status === "loading";
  const modelFailed = status === "error";

  // Live status badge over the video.
  const badge = (() => {
    if (!handDetected) {
      return <LiveBadge tone="muted">{t("camera.noHand")}</LiveBadge>;
    }
    if (live) {
      return (
        <LiveBadge tone="active">
          {t("camera.detecting")} {live.label} · {formatConfidence(live.confidence)}
        </LiveBadge>
      );
    }
    return <LiveBadge tone="active">{t("camera.detecting")}</LiveBadge>;
  })();

  return (
    <div className="flex flex-col gap-6 page-enter">
      <header>
        <h1 className="text-3xl font-black tracking-tight">
          {t("camera.title")}
        </h1>
      </header>

      {isLoadingModel && (
        <p className="rounded-button bg-surface-alt px-4 py-3 text-sm font-semibold text-text-muted">
          {t("camera.loadingModel")}
        </p>
      )}
      {modelFailed && (
        <p className="rounded-button bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {t("camera.modelError")}
          {error ? ` (${error})` : ""}
        </p>
      )}

      <CameraPreview
        ref={videoRef}
        overlayRef={overlayRef}
        active={active}
        error={cameraError ?? (active ? null : t("camera.cameraOff"))}
        badge={active ? badge : undefined}
      />

      <div className="flex gap-3">
        {!active ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={isLoadingModel}
            className="flex min-h-12 flex-1 items-center justify-center rounded-button bg-bee-yellow px-6 text-lg font-black text-bee-black transition-colors hover:bg-bee-yellow-bright disabled:opacity-60"
          >
            {t("camera.start")}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="flex min-h-12 flex-1 items-center justify-center rounded-button border-2 border-bee-black bg-surface px-6 text-lg font-bold transition-colors hover:bg-surface-alt"
          >
            {t("camera.stop")}
          </button>
        )}
      </div>

      {active && (
        <div
          aria-live="polite"
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-[var(--shadow)]"
        >
          {prediction ? (
            <PredictionView
              prediction={prediction}
              confLabel={confLabel}
              confidenceLabel={t("camera.confidence")}
              detectedLabel={t("camera.detectedSign")}
              outputLabel={t("camera.outputPhrase")}
              speakLabel={t("camera.speakOutput")}
            />
          ) : (
            <p className="py-4 text-center font-semibold text-text-muted">
              {t("camera.waitingForSign")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LiveBadge({
  tone,
  children,
}: {
  tone: "muted" | "active";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-bold shadow-[var(--shadow)] ${
        tone === "active"
          ? "bg-bee-yellow text-bee-black"
          : "bg-bee-black/80 text-white"
      }`}
    >
      {tone === "active" && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-bee-black" />
      )}
      {children}
    </span>
  );
}

function PredictionView({
  prediction,
  confLabel,
  confidenceLabel,
  detectedLabel,
  outputLabel,
  speakLabel,
}: {
  prediction: Prediction;
  confLabel: (v: number) => string;
  confidenceLabel: string;
  detectedLabel: string;
  outputLabel: string;
  speakLabel: string;
}) {
  return (
    <>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {detectedLabel}
        </p>
        <p className="text-2xl font-black">{prediction.label}</p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-sm font-bold">
          <span>
            {confidenceLabel} ({confLabel(prediction.confidence)})
          </span>
          <span>{formatConfidence(prediction.confidence)}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-pill bg-surface-alt">
          <div
            className="h-full rounded-pill bg-bee-yellow transition-[width]"
            style={{ width: formatConfidence(prediction.confidence) }}
          />
        </div>
      </div>

      {prediction.phrase && (
        <div className="rounded-button bg-surface-alt p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {outputLabel}
          </p>
          <p className="mt-1 text-xl font-bold">{prediction.phrase}</p>
        </div>
      )}

      {prediction.phrase && (
        <SpeakButton text={prediction.phrase} label={speakLabel} />
      )}
    </>
  );
}

"use client";

import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

/**
 * MediaPipe Web hand-landmark extraction for real-time sign recognition.
 *
 * This mirrors the Python training pipeline (extract_landmarks.py) exactly so
 * the browser features match what the model was trained on:
 *   - 21 landmarks per hand, (x, y, z)
 *   - wrist-relative (subtract landmark 0)
 *   - divided by palm scale = ||wrist → middle-MCP (landmark 9)|| in x/y
 *   - packed into a 128-D vector: [hand0 63][hand1 63][present0][present1]
 *   - a single hand always occupies slot 0; two hands ordered by wrist x
 */

export const FEATURE_COUNT = 128;

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;

/** Lazily initialize the MediaPipe Hand Landmarker (VIDEO mode). */
export async function initHandTracking(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // WASM assets are served locally from /public for offline support.
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
    const instance = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: "/models/mediapipe/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.4,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
    landmarker = instance;
    return instance;
  })();

  return initPromise;
}

export function disposeHandTracking(): void {
  landmarker?.close();
  landmarker = null;
  initPromise = null;
}

/** Detect hands in a video frame at the given timestamp (ms). */
export function detectForVideo(
  video: HTMLVideoElement,
  timestampMs: number,
): HandLandmarkerResult | null {
  if (!landmarker) return null;
  return landmarker.detectForVideo(video, timestampMs);
}

type Vec3 = { x: number; y: number; z: number };

/**
 * Convert a MediaPipe result into the model's 128-D feature vector.
 * Returns the feature array plus whether any hand was present in this frame.
 */
export function resultToFeatures(result: HandLandmarkerResult | null): {
  features: Float32Array;
  handPresent: boolean;
} {
  const features = new Float32Array(FEATURE_COUNT);
  if (!result || result.landmarks.length === 0) {
    return { features, handPresent: false };
  }

  const hands: number[][] = [];
  // Track original wrist x for deterministic two-hand ordering.
  const wristX: number[] = [];

  for (const landmarks of result.landmarks) {
    const coords = landmarks as Vec3[];
    if (coords.length < 21) continue;

    const wrist = coords[0];
    // Wrist-relative coordinates.
    const centered = coords.map((p) => ({
      x: p.x - wrist.x,
      y: p.y - wrist.y,
      z: p.z - wrist.z,
    }));

    // Palm scale = distance wrist → middle-finger MCP (landmark 9) in x/y.
    let palmScale = Math.hypot(centered[9].x, centered[9].y);
    if (palmScale < 1e-6) {
      // Fallback: max x/y norm across all landmarks.
      palmScale = Math.max(
        ...centered.map((p) => Math.hypot(p.x, p.y)),
      );
    }
    if (palmScale < 1e-6) continue;

    const flat: number[] = [];
    for (const p of centered) {
      flat.push(p.x / palmScale, p.y / palmScale, p.z / palmScale);
    }
    hands.push(flat);
    wristX.push(wrist.x);
  }

  if (hands.length === 0) {
    return { features, handPresent: false };
  }

  // Order two hands by original wrist x-position (matches training).
  let ordered = hands;
  if (hands.length === 2) {
    ordered =
      wristX[0] <= wristX[1] ? [hands[0], hands[1]] : [hands[1], hands[0]];
  }

  ordered.slice(0, 2).forEach((flat, slot) => {
    const offset = slot * 63;
    for (let i = 0; i < 63; i++) {
      features[offset + i] = flat[i];
    }
    features[126 + slot] = 1.0;
  });

  return { features, handPresent: true };
}

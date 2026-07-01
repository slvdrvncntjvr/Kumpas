"use client";

import * as tf from "@tensorflow/tfjs";
import type { Prediction } from "@/types/prediction";
import { FEATURE_COUNT } from "./mediapipeHands";

/**
 * TensorFlow.js sign predictor. Loads the model converted from the Keras
 * training pipeline (convert_to_tfjs.py) and runs inference on a sequence of
 * 128-D landmark feature frames.
 *
 * Inference contract (must match training):
 *   input  : [1, sequenceLength, 128] float32
 *   output : [number of labels] softmax probabilities
 */

const MODEL_URL = "/models/sign-model/model.json";
const LABELS_URL = "/models/sign-model/labels.json";
const METADATA_URL = "/models/sign-model/metadata.json";

export type SignModel = {
  model: tf.LayersModel;
  labels: string[];
  sequenceLength: number;
  featureCount: number;
  confidenceThreshold: number;
  minHandCoverage: number;
};

let cached: SignModel | null = null;
let loadPromise: Promise<SignModel> | null = null;

/** Load (and cache) the model, labels, and inference metadata. */
export async function loadSignModel(): Promise<SignModel> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [model, labels, metadata] = await Promise.all([
      tf.loadLayersModel(MODEL_URL),
      fetch(LABELS_URL).then((r) => r.json() as Promise<string[]>),
      fetch(METADATA_URL)
        .then((r) => r.json())
        .catch(() => ({})),
    ]);

    cached = {
      model,
      labels,
      sequenceLength: metadata?.sequence_length ?? 40,
      featureCount: metadata?.feature_count ?? FEATURE_COUNT,
      confidenceThreshold: metadata?.webcam_test?.confidence_threshold ?? 0.8,
      minHandCoverage: metadata?.webcam_test?.minimum_hand_coverage ?? 0.25,
    };
    return cached;
  })();

  return loadPromise;
}

/**
 * Run inference on a sequence of feature frames.
 * `sequence` is sequenceLength × featureCount.
 * Returns the top prediction plus the full probability vector.
 */
export async function predictFromSequence(
  signModel: SignModel,
  sequence: Float32Array[],
): Promise<{ prediction: Prediction; probabilities: number[] }> {
  const { model, labels, sequenceLength, featureCount } = signModel;

  // Build a flat [seq * feature] buffer.
  const flat = new Float32Array(sequenceLength * featureCount);
  for (let t = 0; t < sequenceLength; t++) {
    const frame = sequence[t];
    if (frame) flat.set(frame, t * featureCount);
  }

  const probabilities = tf.tidy(() => {
    const input = tf.tensor(flat, [1, sequenceLength, featureCount]);
    const output = model.predict(input) as tf.Tensor;
    return output.dataSync();
  });

  // argmax
  let bestIndex = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[bestIndex]) bestIndex = i;
  }

  const prediction: Prediction = {
    label: labels[bestIndex] ?? `class_${bestIndex}`,
    phrase: labels[bestIndex] ?? "",
    confidence: probabilities[bestIndex],
  };

  return { prediction, probabilities: Array.from(probabilities) };
}

export function disposeSignModel(): void {
  cached?.model.dispose();
  cached = null;
  loadPromise = null;
}

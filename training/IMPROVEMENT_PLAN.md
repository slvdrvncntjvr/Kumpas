# Recognition accuracy and latency plan

## Goal

Deliver reliable isolated-phrase spotting with a result shortly after the user
finishes signing. Continuous sentence recognition is a later project and
requires token-level labels, `NO_SIGN`, and language-aware decoding.

## Phase 1: measure and segment (implemented)

- Detect phrase start/end from image-relative wrist and hand-shape motion.
- Keep manual fixed-window capture as a fallback.
- Log expected/predicted labels, confidence, accepted/rejected state, detected
  phrase duration, and end-to-result latency.
- Generate live metrics and a confusion matrix.

Exit criteria:

- At least 20 live trials per phrase from each test signer.
- Automatic capture starts and ends correctly on at least 95% of attempts.
- Median end-to-result latency is below 750 ms.

## Phase 2: collect representative data (human work required)

- Collect `NO_SIGN`: idle hands, transitions, partial phrases, unrelated
  gestures, and hands entering/leaving the frame.
- Expand every phrase across signers, signing speeds, distances, lighting, and
  backgrounds. Target 50-100 reviewed examples per phrase for the next pilot.
- Store authoritative signer/session IDs in metadata.
- Hold out complete signers for validation and testing.

Exit criteria:

- Every class exists in train/validation/test signer-exclusive splits.
- No signer appears in more than one split.
- Live false activations and rejected-sign rates are reported, not hidden by
  clip-only accuracy.

## Phase 3: temporal model experiment

Only start after Phase 1 produces a representative live benchmark.

- Compare the current Conv1D/global-average model with a small order-sensitive
  causal TCN or GRU.
- Add temporal speed augmentation and action-boundary jitter.
- Calibrate confidence on held-out signers.
- Select the model using signer-held-out macro F1, false activations, and live
  latency—not training accuracy.

Exit criteria:

- Signer-held-out macro F1 improves over the current model.
- No class recall is below the agreed safety threshold.
- Model inference remains below 100 ms on the target device.

## Phase 4: browser phrase spotting

- Run MediaPipe and model inference off the UI thread.
- Maintain a rolling landmark buffer and the same segmentation state machine.
- Require stable predictions and a `NO_SIGN` reset before emitting another
  phrase.
- Measure camera FPS, end-to-result latency, and false activations on target
  phones and laptops.

## Current limitations

- Baseline-v5 has an initial trained `NO_SIGN` class, but live false-activation
  performance has not been benchmarked yet.
- The existing split uses filename stems as an unverified signer/session proxy.
- The new multi-sign phrase clips have limited signer diversity.
- Offline test support is only three clips per class and is not production
  evidence.

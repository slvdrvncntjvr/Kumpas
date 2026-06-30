import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

/** MediaPipe hand connections (pairs of landmark indices). */
const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

const BEE_YELLOW = "#f9c800";
const BEE_BLACK = "#121212";

/**
 * Draw detected hand landmarks and connections onto an overlay canvas sized to
 * match the video. The video is mirrored (selfie view) in CSS, so we mirror the
 * x-coordinates here to keep the skeleton aligned.
 */
export function drawLandmarks(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: HandLandmarkerResult | null,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = video.videoWidth || canvas.width;
  const h = video.videoHeight || canvas.height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  ctx.clearRect(0, 0, w, h);
  if (!result || result.landmarks.length === 0) return;

  for (const landmarks of result.landmarks) {
    // Connections.
    ctx.strokeStyle = BEE_YELLOW;
    ctx.lineWidth = Math.max(2, w * 0.004);
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo((1 - pa.x) * w, pa.y * h);
      ctx.lineTo((1 - pb.x) * w, pb.y * h);
      ctx.stroke();
    }

    // Joints.
    const r = Math.max(3, w * 0.006);
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc((1 - p.x) * w, p.y * h, r, 0, Math.PI * 2);
      ctx.fillStyle = BEE_BLACK;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, w * 0.002);
      ctx.strokeStyle = BEE_YELLOW;
      ctx.stroke();
    }
  }
}

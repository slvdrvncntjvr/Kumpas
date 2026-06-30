"use client";

import { forwardRef } from "react";
import { Camera } from "lucide-react";

type CameraPreviewProps = {
  active: boolean;
  error: string | null;
  /** Optional ref for the landmark overlay canvas. */
  overlayRef?: React.Ref<HTMLCanvasElement>;
  /** Optional badge content shown over the video (e.g. live detection). */
  badge?: React.ReactNode;
};

/** Video preview surface for the camera demo, with a landmark overlay. */
export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  function CameraPreview({ active, error, overlayRef, badge }, ref) {
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border border-border bg-bee-ink shadow-[var(--shadow)]">
        {/* Mirrored selfie view. */}
        <video
          ref={ref}
          playsInline
          muted
          className={`h-full w-full -scale-x-100 object-cover ${
            active ? "" : "hidden"
          }`}
        />
        {/* Landmark overlay, sized to the video and mirrored to match. */}
        <canvas
          ref={overlayRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${
            active ? "" : "hidden"
          }`}
        />

        {active && badge && (
          <div className="absolute inset-x-0 top-0 flex justify-center p-3">
            {badge}
          </div>
        )}

        {!active && (
          <div className="hex-pattern absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Camera aria-hidden="true" className="h-12 w-12 text-text-muted" />
            <p className="text-sm font-semibold text-text-muted">
              {error ?? "Camera is off. Press Start to begin the demo."}
            </p>
          </div>
        )}
      </div>
    );
  },
);

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class SegmentEvent:
    state: str
    motion: float
    started: bool = False
    completed: bool = False
    reason: str | None = None
    start_time: float | None = None
    end_time: float | None = None


def activity_motion(previous: np.ndarray | None, current: np.ndarray) -> float:
    """Return a motion score for two (2, 65) hand activity arrays.

    Each present hand contains image-relative wrist x/y followed by 21
    wrist-relative, palm-scaled xyz landmarks. Missing hands are all NaN.
    """
    if previous is None:
        return 0.0
    if previous.shape != (2, 65) or current.shape != (2, 65):
        raise ValueError("Activity arrays must have shape (2, 65).")

    scores: list[float] = []
    for slot in range(2):
        previous_present = bool(np.isfinite(previous[slot]).all())
        current_present = bool(np.isfinite(current[slot]).all())
        if previous_present != current_present:
            scores.append(0.10)
            continue
        if not current_present:
            continue

        wrist_motion = float(np.linalg.norm(current[slot, :2] - previous[slot, :2]))
        previous_shape = previous[slot, 2:].reshape(21, 3)
        current_shape = current[slot, 2:].reshape(21, 3)
        shape_motion = float(
            np.linalg.norm(current_shape - previous_shape, axis=1).mean()
        )
        scores.append((2.0 * wrist_motion) + (0.25 * shape_motion))
    return max(scores, default=0.0)


class MotionSegmenter:
    def __init__(
        self,
        *,
        start_threshold: float,
        stop_threshold: float,
        start_frames: int,
        end_hold_seconds: float,
        minimum_sign_seconds: float,
        maximum_sign_seconds: float,
        smoothing: float,
    ) -> None:
        if start_threshold <= stop_threshold:
            raise ValueError("start_threshold must be greater than stop_threshold.")
        if start_frames < 1:
            raise ValueError("start_frames must be positive.")
        if not 0.0 < smoothing <= 1.0:
            raise ValueError("smoothing must be in (0, 1].")
        if minimum_sign_seconds <= 0 or maximum_sign_seconds <= minimum_sign_seconds:
            raise ValueError("maximum_sign_seconds must exceed minimum_sign_seconds.")

        self.start_threshold = start_threshold
        self.stop_threshold = stop_threshold
        self.start_frames = start_frames
        self.end_hold_seconds = end_hold_seconds
        self.minimum_sign_seconds = minimum_sign_seconds
        self.maximum_sign_seconds = maximum_sign_seconds
        self.smoothing = smoothing
        self.reset()

    def reset(self) -> None:
        self.state = "idle"
        self.smoothed_motion = 0.0
        self.active_frames = 0
        self.candidate_start_time: float | None = None
        self.recording_start_time: float | None = None
        self.stable_start_time: float | None = None

    def update(
        self,
        *,
        motion: float,
        has_hands: bool,
        timestamp: float,
    ) -> SegmentEvent:
        self.smoothed_motion = (
            (self.smoothing * max(0.0, motion))
            + ((1.0 - self.smoothing) * self.smoothed_motion)
        )

        if self.state == "idle":
            if has_hands and self.smoothed_motion >= self.start_threshold:
                if self.active_frames == 0:
                    self.candidate_start_time = timestamp
                self.active_frames += 1
            else:
                self.active_frames = 0
                self.candidate_start_time = None

            if self.active_frames < self.start_frames:
                return SegmentEvent("idle", self.smoothed_motion)

            self.state = "recording"
            self.recording_start_time = (
                self.candidate_start_time
                if self.candidate_start_time is not None
                else timestamp
            )
            self.stable_start_time = None
            return SegmentEvent(
                "recording",
                self.smoothed_motion,
                started=True,
                start_time=self.recording_start_time,
            )

        assert self.recording_start_time is not None
        elapsed = timestamp - self.recording_start_time
        stable = not has_hands or self.smoothed_motion <= self.stop_threshold
        if stable:
            if self.stable_start_time is None:
                self.stable_start_time = timestamp
        else:
            self.stable_start_time = None

        reason: str | None = None
        end_time: float | None = None
        if elapsed >= self.maximum_sign_seconds:
            reason = "maximum_duration"
            end_time = timestamp
        elif (
            elapsed >= self.minimum_sign_seconds
            and self.stable_start_time is not None
            and timestamp - self.stable_start_time >= self.end_hold_seconds
        ):
            reason = "stable_hands"
            end_time = self.stable_start_time

        if reason is None:
            return SegmentEvent(
                "recording",
                self.smoothed_motion,
                start_time=self.recording_start_time,
            )

        event = SegmentEvent(
            "complete",
            self.smoothed_motion,
            completed=True,
            reason=reason,
            start_time=self.recording_start_time,
            end_time=end_time,
        )
        self.reset()
        return event

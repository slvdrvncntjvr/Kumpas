from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from sign_segmenter import MotionSegmenter, activity_motion


def activity(wrist_x: float = 0.5) -> np.ndarray:
    value = np.full((2, 65), np.nan, dtype=np.float32)
    value[0] = 0.0
    value[0, :2] = [wrist_x, 0.5]
    return value


class ActivityMotionTests(unittest.TestCase):
    def test_identical_activity_has_no_motion(self) -> None:
        value = activity()
        self.assertEqual(activity_motion(value, value.copy()), 0.0)

    def test_wrist_translation_is_detected(self) -> None:
        self.assertAlmostEqual(activity_motion(activity(0.5), activity(0.6)), 0.2)

    def test_hand_appearance_is_motion(self) -> None:
        missing = np.full((2, 65), np.nan, dtype=np.float32)
        self.assertEqual(activity_motion(missing, activity()), 0.10)


class MotionSegmenterTests(unittest.TestCase):
    def make_segmenter(self) -> MotionSegmenter:
        return MotionSegmenter(
            start_threshold=0.05,
            stop_threshold=0.02,
            start_frames=3,
            end_hold_seconds=0.5,
            minimum_sign_seconds=0.6,
            maximum_sign_seconds=3.0,
            smoothing=1.0,
        )

    def test_requires_consecutive_motion_to_start(self) -> None:
        segmenter = self.make_segmenter()
        self.assertFalse(
            segmenter.update(motion=0.06, has_hands=True, timestamp=0.0).started
        )
        segmenter.update(motion=0.01, has_hands=True, timestamp=0.1)
        segmenter.update(motion=0.06, has_hands=True, timestamp=0.2)
        segmenter.update(motion=0.06, has_hands=True, timestamp=0.3)
        event = segmenter.update(motion=0.06, has_hands=True, timestamp=0.4)
        self.assertTrue(event.started)
        self.assertEqual(event.start_time, 0.2)

    def test_completes_after_stable_hold(self) -> None:
        segmenter = self.make_segmenter()
        for timestamp in (0.0, 0.1, 0.2):
            event = segmenter.update(
                motion=0.06, has_hands=True, timestamp=timestamp
            )
        self.assertTrue(event.started)
        segmenter.update(motion=0.08, has_hands=True, timestamp=0.8)
        segmenter.update(motion=0.01, has_hands=True, timestamp=1.0)
        event = segmenter.update(motion=0.01, has_hands=True, timestamp=1.5)
        self.assertTrue(event.completed)
        self.assertEqual(event.reason, "stable_hands")
        self.assertEqual(event.end_time, 1.0)

    def test_maximum_duration_forces_completion(self) -> None:
        segmenter = self.make_segmenter()
        for timestamp in (0.0, 0.1, 0.2):
            segmenter.update(motion=0.06, has_hands=True, timestamp=timestamp)
        event = segmenter.update(motion=0.08, has_hands=True, timestamp=3.1)
        self.assertTrue(event.completed)
        self.assertEqual(event.reason, "maximum_duration")


if __name__ == "__main__":
    unittest.main()

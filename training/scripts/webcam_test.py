from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
from tensorflow import keras

from extract_landmarks import create_landmarker, result_to_features
from sign_segmenter import MotionSegmenter, activity_motion


ROOT = Path(__file__).resolve().parents[1]
WINDOW_NAME = "Kumpas webcam test"


def load_config() -> dict:
    with (ROOT / "config.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize_label(value: str) -> str:
    return re.sub(r"[\s_-]+", " ", value.strip()).casefold()


def open_camera(index: int) -> cv2.VideoCapture:
    capture = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if capture.isOpened():
        return capture
    capture.release()
    return cv2.VideoCapture(index)


def prepare_frame(frame: np.ndarray, width: int, height: int) -> np.ndarray:
    return cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)


def put_lines(
    frame: np.ndarray,
    lines: list[tuple[str, tuple[int, int, int]]],
    start_y: int = 32,
) -> None:
    y = start_y
    for text, color in lines:
        cv2.putText(
            frame,
            text,
            (16, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 0, 0),
            4,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            text,
            (16, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            color,
            2,
            cv2.LINE_AA,
        )
        y += 28


def result_to_activity(result) -> np.ndarray:
    activity = np.full((2, 65), np.nan, dtype=np.float32)
    hands: list[tuple[float, np.ndarray]] = []
    for landmarks in result.hand_landmarks:
        coordinates = np.array(
            [[point.x, point.y, point.z] for point in landmarks], dtype=np.float32
        )
        wrist = coordinates[0].copy()
        centered = coordinates - wrist
        palm_scale = float(np.linalg.norm(centered[9, :2]))
        if palm_scale < 1e-6:
            palm_scale = float(np.linalg.norm(centered[:, :2], axis=1).max())
        if palm_scale < 1e-6:
            continue
        value = np.concatenate([wrist[:2], (centered / palm_scale).reshape(-1)])
        hands.append((float(wrist[0]), value))

    if len(hands) == 2:
        hands.sort(key=lambda item: item[0])
    for slot, (_, value) in enumerate(hands[:2]):
        activity[slot] = value
    return activity


def detect_frame(frame: np.ndarray, landmarker) -> tuple[np.ndarray, np.ndarray]:
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(image)
    return result_to_features(result), result_to_activity(result)


def resample_features(
    observations: list[tuple[float, np.ndarray]], sequence_length: int
) -> tuple[np.ndarray, float]:
    if not observations:
        raise RuntimeError("No sign observations were captured.")
    indices = np.rint(
        np.linspace(0, len(observations) - 1, sequence_length)
    ).astype(int)
    sequence = np.stack([observations[int(index)][1] for index in indices]).astype(
        np.float32
    )
    coverage = float(sequence[:, 126:128].max(axis=1).mean())
    return sequence, coverage


def prediction_result(
    probabilities: np.ndarray, labels: list[str], coverage: float
) -> dict:
    top_indices = np.argsort(probabilities)[::-1][:3]
    return {
        "label": labels[int(top_indices[0])],
        "confidence": float(probabilities[top_indices[0]]),
        "coverage": coverage,
        "top_three": [
            f"{labels[int(index)]} {probabilities[index]:.0%}" for index in top_indices
        ],
        "top_labels": [labels[int(index)] for index in top_indices],
        "top_confidences": [float(probabilities[index]) for index in top_indices],
    }


def append_trial(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not path.is_file()
    with path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(row))
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def record_trial(
    *,
    path: Path | None,
    config: dict,
    mode: str,
    expected: str | None,
    result: dict,
    segment_seconds: float,
    prediction_latency_ms: float,
    completion_reason: str,
) -> None:
    if path is None:
        return
    webcam = config["webcam_test"]
    accepted = bool(
        result["confidence"] >= webcam["confidence_threshold"]
        and result["coverage"] >= webcam["minimum_hand_coverage"]
    )
    append_trial(
        path,
        {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "model_version": config["version"],
            "mode": mode,
            "expected": expected or "",
            "predicted": result["label"],
            "confidence": f"{result['confidence']:.8f}",
            "hand_coverage": f"{result['coverage']:.8f}",
            "segment_seconds": f"{segment_seconds:.4f}",
            "prediction_latency_ms": f"{prediction_latency_ms:.2f}",
            "accepted": str(accepted).lower(),
            "completion_reason": completion_reason,
            "top_three": json.dumps(
                list(zip(result["top_labels"], result["top_confidences"])),
                ensure_ascii=False,
            ),
        },
    )


def capture_clip(
    capture: cv2.VideoCapture,
    seconds: float,
    width: int,
    height: int,
) -> tuple[list[np.ndarray], bool]:
    frames: list[np.ndarray] = []
    started = time.perf_counter()
    cancelled = False

    while True:
        elapsed = time.perf_counter() - started
        if elapsed >= seconds:
            break
        ok, frame = capture.read()
        if not ok:
            continue
        frame = prepare_frame(frame, width, height)
        frames.append(frame.copy())
        remaining = max(0.0, seconds - elapsed)
        preview = frame.copy()
        put_lines(
            preview,
            [
                (f"RECORDING  {remaining:0.1f}s", (40, 40, 255)),
                ("Perform one sign now", (255, 255, 255)),
                ("Q / Esc: cancel", (220, 220, 220)),
            ],
        )
        progress = min(1.0, elapsed / seconds)
        cv2.rectangle(preview, (16, height - 30), (width - 16, height - 16), (60, 60, 60), -1)
        cv2.rectangle(
            preview,
            (16, height - 30),
            (16 + round((width - 32) * progress), height - 16),
            (30, 180, 255),
            -1,
        )
        cv2.imshow(WINDOW_NAME, preview)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            cancelled = True
            break
    return frames, cancelled


def extract_sequence(
    frames: list[np.ndarray],
    config: dict,
    landmarker,
) -> tuple[np.ndarray, float]:
    if not frames:
        raise RuntimeError("No webcam frames were captured.")
    crop = config["temporal_crop"]
    first_frame = round((len(frames) - 1) * crop["start_ratio"])
    last_frame = round((len(frames) - 1) * crop["end_ratio"])
    indices = np.rint(
        np.linspace(first_frame, last_frame, config["sequence_length"])
    ).astype(int)
    sequence = np.zeros(
        (config["sequence_length"], config["feature_count"]), dtype=np.float32
    )

    for sequence_index, frame_index in enumerate(indices):
        rgb = cv2.cvtColor(frames[int(frame_index)], cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        sequence[sequence_index] = result_to_features(landmarker.detect(image))

    coverage = float(sequence[:, 126:128].max(axis=1).mean())
    return sequence, coverage


def predict(model: keras.Model, sequence: np.ndarray) -> np.ndarray:
    return model.predict(sequence[np.newaxis, ...], verbose=0)[0]


def run_self_test(config: dict, model: keras.Model) -> int:
    cache_path = ROOT / config["paths"]["cache_dir"] / "test.npz"
    if not cache_path.is_file():
        print(f"Missing test cache: {cache_path}")
        return 1
    with np.load(cache_path) as data:
        sequence = data["X"][0].astype(np.float32)
        expected = int(data["y"][0])
    probabilities = predict(model, sequence)
    predicted = int(probabilities.argmax())
    result = {
        "expected": config["labels"][expected],
        "predicted": config["labels"][predicted],
        "confidence": float(probabilities[predicted]),
        "passed": predicted == expected,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["passed"] else 1


def run_auto_test(
    *,
    capture: cv2.VideoCapture,
    config: dict,
    landmarker,
    model: keras.Model,
    expected: str | None,
    log_path: Path | None,
) -> int:
    webcam = config["webcam_test"]
    settings = config["auto_capture"]
    segmenter = MotionSegmenter(
        start_threshold=settings["start_motion_threshold"],
        stop_threshold=settings["stop_motion_threshold"],
        start_frames=settings["start_frames"],
        end_hold_seconds=settings["end_hold_seconds"],
        minimum_sign_seconds=settings["minimum_sign_seconds"],
        maximum_sign_seconds=settings["maximum_sign_seconds"],
        smoothing=settings["motion_smoothing"],
    )
    pre_roll: deque[tuple[float, np.ndarray]] = deque()
    segment: list[tuple[float, np.ndarray]] = []
    previous_activity: np.ndarray | None = None
    latest_result: dict | None = None

    while True:
        ok, frame = capture.read()
        if not ok:
            print("The webcam stopped returning frames.")
            return 1
        frame = prepare_frame(frame, webcam["width"], webcam["height"])
        features, activity = detect_frame(frame, landmarker)
        timestamp = time.perf_counter()
        has_hands = bool(np.isfinite(activity).all(axis=1).any())
        motion = activity_motion(previous_activity, activity)
        previous_activity = activity
        observation = (timestamp, features)

        state_before = segmenter.state
        if state_before == "idle":
            pre_roll.append(observation)
            cutoff = timestamp - settings["pre_roll_seconds"]
            while pre_roll and pre_roll[0][0] < cutoff:
                pre_roll.popleft()

        event = segmenter.update(
            motion=motion,
            has_hands=has_hands,
            timestamp=timestamp,
        )
        if event.started:
            start_cutoff = (event.start_time or timestamp) - settings["pre_roll_seconds"]
            segment = [item for item in pre_roll if item[0] >= start_cutoff]
        elif state_before == "recording":
            segment.append(observation)

        if event.completed:
            assert event.start_time is not None and event.end_time is not None
            end_cutoff = event.end_time + settings["post_roll_seconds"]
            trimmed = [item for item in segment if item[0] <= end_cutoff]
            processing_started = time.perf_counter()
            sequence, coverage = resample_features(
                trimmed, config["sequence_length"]
            )
            probabilities = predict(model, sequence)
            latest_result = prediction_result(
                probabilities, config["labels"], coverage
            )
            prediction_latency_ms = (
                time.perf_counter() - event.end_time
            ) * 1000.0
            segment_seconds = event.end_time - event.start_time
            latest_result.update(
                {
                    "segment_seconds": segment_seconds,
                    "prediction_latency_ms": prediction_latency_ms,
                    "completion_reason": event.reason,
                    "processing_ms": (time.perf_counter() - processing_started)
                    * 1000.0,
                }
            )
            record_trial(
                path=log_path,
                config=config,
                mode="auto",
                expected=expected,
                result=latest_result,
                segment_seconds=segment_seconds,
                prediction_latency_ms=prediction_latency_ms,
                completion_reason=event.reason or "unknown",
            )
            print(json.dumps(latest_result, ensure_ascii=False))
            segment = []
            pre_roll.clear()
            pre_roll.append(observation)

        preview = frame.copy()
        recording = event.state == "recording"
        lines = [
            (
                "RECORDING - finish and hold"
                if recording
                else "AUTO - move your hands to begin",
                (40, 40, 255) if recording else (255, 255, 255),
            ),
            (
                f"Motion {event.motion:.3f}  start {settings['start_motion_threshold']:.3f}",
                (220, 220, 220),
            ),
            ("R: reset  |  Q / Esc: quit", (220, 220, 220)),
        ]
        if expected:
            lines.append((f"Expected: {expected}", (255, 220, 80)))
        if latest_result is not None:
            confident = bool(
                latest_result["confidence"] >= webcam["confidence_threshold"]
                and latest_result["coverage"] >= webcam["minimum_hand_coverage"]
            )
            color = (60, 220, 60) if confident else (0, 180, 255)
            lines.extend(
                [
                    (
                        f"{'RESULT' if confident else 'UNSURE'}: "
                        f"{latest_result['label']} {latest_result['confidence']:.1%}",
                        color,
                    ),
                    (
                        f"Sign {latest_result['segment_seconds']:.2f}s  "
                        f"latency {latest_result['prediction_latency_ms']:.0f}ms",
                        color,
                    ),
                    (
                        "Top 3: " + " | ".join(latest_result["top_three"]),
                        (255, 255, 255),
                    ),
                ]
            )
        put_lines(preview, lines)
        cv2.putText(
            preview,
            "TEST ONLY - unrelated motion can still trigger a prediction",
            (16, webcam["height"] - 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.imshow(WINDOW_NAME, preview)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            return 0
        if key == ord("r"):
            segmenter.reset()
            pre_roll.clear()
            segment = []
            previous_activity = None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Capture a webcam sign and classify it with the baseline model."
    )
    parser.add_argument("--camera", type=int, default=0, help="OpenCV camera index")
    parser.add_argument(
        "--probe", action="store_true", help="Read one webcam frame and exit"
    )
    parser.add_argument(
        "--self-test", action="store_true", help="Test model loading on cached data"
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Automatically detect sign start/end from hand motion",
    )
    parser.add_argument(
        "--expected",
        help="Expected label for live benchmark logging, e.g. CEDULA",
    )
    parser.add_argument(
        "--log",
        type=Path,
        help="CSV trial log path; defaults inside the current artifact directory",
    )
    args = parser.parse_args()

    config = load_config()
    paths = config["paths"]
    webcam = config["webcam_test"]
    model_path = ROOT / paths["artifact_dir"] / "model" / "best.keras"
    landmarker_path = ROOT / paths["hand_landmarker_model"]
    expected = None
    if args.expected:
        normalized_expected = normalize_label(args.expected)
        if normalized_expected == "no sign":
            expected = "NO_SIGN"
        else:
            expected = next(
                (
                    label
                    for label in config["labels"]
                    if normalize_label(label) == normalized_expected
                ),
                None,
            )
        if expected is None:
            print(f"Unknown expected label: {args.expected}")
            print("Available labels: " + ", ".join([*config["labels"], "NO_SIGN"]))
            return 1
    log_path = args.log
    if log_path is None and expected is not None:
        log_path = ROOT / paths["artifact_dir"] / "live" / "webcam_trials.csv"
    elif log_path is not None and not log_path.is_absolute():
        log_path = ROOT / log_path

    if not model_path.is_file():
        print(f"Missing trained model: {model_path}")
        return 1
    model = keras.models.load_model(model_path)
    if args.self_test:
        return run_self_test(config, model)

    capture = open_camera(args.camera)
    if not capture.isOpened():
        print(f"Could not open camera index {args.camera}.")
        print("Close other camera applications or try --camera 1.")
        return 1
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, webcam["width"])
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, webcam["height"])

    if args.probe:
        ok = False
        frame = None
        for _ in range(10):
            ok, frame = capture.read()
            if ok:
                break
        capture.release()
        if not ok or frame is None:
            print(f"Camera index {args.camera} opened but returned no frame.")
            return 1
        print(
            json.dumps(
                {
                    "camera": args.camera,
                    "opened": True,
                    "frame_width": int(frame.shape[1]),
                    "frame_height": int(frame.shape[0]),
                },
                indent=2,
            )
        )
        return 0

    if not landmarker_path.is_file():
        capture.release()
        print(f"Missing Hand Landmarker model: {landmarker_path}")
        return 1

    latest_result: dict | None = None
    try:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
        with create_landmarker(config, landmarker_path) as landmarker:
            if args.auto:
                return run_auto_test(
                    capture=capture,
                    config=config,
                    landmarker=landmarker,
                    model=model,
                    expected=expected,
                    log_path=log_path,
                )
            while True:
                ok, frame = capture.read()
                if not ok:
                    print("The webcam stopped returning frames.")
                    return 1
                frame = prepare_frame(frame, webcam["width"], webcam["height"])
                preview = frame.copy()
                lines = [
                    (
                        f"SPACE: capture a {webcam['capture_seconds']:g}-second sign",
                        (255, 255, 255),
                    ),
                    ("Q / Esc: quit", (220, 220, 220)),
                ]
                if expected:
                    lines.append((f"Expected: {expected}", (255, 220, 80)))
                if latest_result is not None:
                    confident = (
                        latest_result["confidence"] >= webcam["confidence_threshold"]
                        and latest_result["coverage"] >= webcam["minimum_hand_coverage"]
                    )
                    status = "RESULT" if confident else "UNSURE"
                    color = (60, 220, 60) if confident else (0, 180, 255)
                    lines.extend(
                        [
                            (
                                f"{status}: {latest_result['label']}  {latest_result['confidence']:.1%}",
                                color,
                            ),
                            (
                                f"Hand coverage: {latest_result['coverage']:.1%}",
                                color,
                            ),
                            (
                                "Top 3: " + " | ".join(latest_result["top_three"]),
                                (255, 255, 255),
                            ),
                        ]
                    )
                put_lines(preview, lines)
                if "NO_SIGN" not in config["labels"]:
                    cv2.putText(
                        preview,
                        "TEST ONLY - NO_SIGN class is missing",
                        (16, webcam["height"] - 18),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (0, 0, 255),
                        2,
                        cv2.LINE_AA,
                    )
                cv2.imshow(WINDOW_NAME, preview)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    break
                if key != ord(" "):
                    continue

                capture_started = time.perf_counter()
                frames, cancelled = capture_clip(
                    capture,
                    webcam["capture_seconds"],
                    webcam["width"],
                    webcam["height"],
                )
                if cancelled:
                    break
                capture_ended = time.perf_counter()
                processing = frames[-1].copy()
                put_lines(processing, [("Processing 40 frames...", (255, 255, 255))])
                cv2.imshow(WINDOW_NAME, processing)
                cv2.waitKey(1)
                sequence, coverage = extract_sequence(frames, config, landmarker)
                probabilities = predict(model, sequence)
                latest_result = prediction_result(
                    probabilities, config["labels"], coverage
                )
                crop = config["temporal_crop"]
                segment_seconds = (
                    capture_ended - capture_started
                ) * (crop["end_ratio"] - crop["start_ratio"])
                prediction_latency_ms = (
                    time.perf_counter() - capture_ended
                ) * 1000.0
                latest_result.update(
                    {
                        "segment_seconds": segment_seconds,
                        "prediction_latency_ms": prediction_latency_ms,
                        "completion_reason": "fixed_window",
                    }
                )
                record_trial(
                    path=log_path,
                    config=config,
                    mode="manual",
                    expected=expected,
                    result=latest_result,
                    segment_seconds=segment_seconds,
                    prediction_latency_ms=prediction_latency_ms,
                    completion_reason="fixed_window",
                )
                print(json.dumps(latest_result, ensure_ascii=False))
    finally:
        capture.release()
        cv2.destroyAllWindows()
    return 0


if __name__ == "__main__":
    sys.exit(main())

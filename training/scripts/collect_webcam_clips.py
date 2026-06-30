from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

import cv2


ROOT = Path(__file__).resolve().parents[1]
WINDOW_NAME = "Kumpas dataset collection"


def put_text(frame, text: str, y: int, color: tuple[int, int, int]) -> None:
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


def next_index(output_dir: Path) -> int:
    values = [
        int(match.group(1))
        for path in output_dir.glob("*.mp4")
        if (match := re.fullmatch(r"(\d+)", path.stem))
    ]
    return max(values, default=0) + 1


def record_clip(
    capture: cv2.VideoCapture,
    output_path: Path,
    seconds: float,
    width: int,
    height: int,
    fps: float,
) -> bool:
    writer = cv2.VideoWriter(
        str(output_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
    )
    if not writer.isOpened():
        raise RuntimeError(f"Could not create video: {output_path}")
    started = time.perf_counter()
    cancelled = False
    try:
        while time.perf_counter() - started < seconds:
            ok, frame = capture.read()
            if not ok:
                continue
            frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            writer.write(frame)
            preview = frame.copy()
            remaining = max(0.0, seconds - (time.perf_counter() - started))
            put_text(preview, f"RECORDING {remaining:.1f}s", 32, (40, 40, 255))
            put_text(preview, "Q / Esc: discard", 60, (220, 220, 220))
            cv2.imshow(WINDOW_NAME, preview)
            if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                cancelled = True
                break
    finally:
        writer.release()
    if cancelled:
        output_path.unlink(missing_ok=True)
    return not cancelled


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Collect webcam videos for a sign or the NO_SIGN class."
    )
    parser.add_argument("label_slug", help="Folder name such as no_sign or cedula")
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--seconds", type=float, default=6.0)
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    args = parser.parse_args()
    if args.count < 1 or args.seconds <= 0:
        parser.error("--count and --seconds must be positive")

    output_dir = ROOT / "clips" / "clips" / args.label_slug
    output_dir.mkdir(parents=True, exist_ok=True)
    capture = cv2.VideoCapture(args.camera, cv2.CAP_DSHOW)
    if not capture.isOpened():
        capture.release()
        capture = cv2.VideoCapture(args.camera)
    if not capture.isOpened():
        print(f"Could not open camera index {args.camera}.")
        return 1
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)
    fps = capture.get(cv2.CAP_PROP_FPS)
    if fps <= 1 or fps > 120:
        fps = 30.0

    saved = 0
    index = next_index(output_dir)
    try:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
        while saved < args.count:
            ok, frame = capture.read()
            if not ok:
                continue
            frame = cv2.resize(
                frame, (args.width, args.height), interpolation=cv2.INTER_AREA
            )
            preview = frame.copy()
            put_text(
                preview,
                f"{args.label_slug.upper()}  {saved}/{args.count}",
                32,
                (255, 255, 255),
            )
            put_text(preview, "SPACE: record  |  Q / Esc: quit", 60, (220, 220, 220))
            if args.label_slug.casefold() == "no_sign":
                put_text(
                    preview,
                    "Record idle hands, transitions, and unrelated gestures",
                    88,
                    (0, 210, 255),
                )
            cv2.imshow(WINDOW_NAME, preview)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            if key != ord(" "):
                continue

            output_path = output_dir / f"{index}.mp4"
            if record_clip(
                capture,
                output_path,
                args.seconds,
                args.width,
                args.height,
                fps,
            ):
                print(f"Saved {output_path}")
                saved += 1
                index += 1
    finally:
        capture.release()
        cv2.destroyAllWindows()
    print(f"Collected {saved} clips in {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

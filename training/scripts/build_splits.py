from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]


def load_config() -> dict:
    with (ROOT / "config.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def normalized_video_path(video_base: str, csv_path: str) -> str:
    relative = Path(csv_path.replace("\\", "/"))
    return (Path(video_base) / relative).as_posix()


def content_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    config = load_config()
    paths = config["paths"]
    labels = config["labels"]
    train_source = pd.read_csv(ROOT / paths["train_csv"]).assign(
        source_split="train"
    )
    test_source = pd.read_csv(ROOT / paths["test_csv"]).assign(source_split="test")
    selected = pd.concat([train_source, test_source], ignore_index=True)
    selected = selected[selected["label"].isin(labels)].copy()
    selected["video_path"] = selected["vid_path"].map(
        lambda value: normalized_video_path(paths["video_base"], value)
    )
    selected["content_hash"] = selected["video_path"].map(
        lambda value: content_hash(ROOT / value)
    )
    label_to_index = {label: index for index, label in enumerate(labels)}
    selected["class_index"] = selected["label"].map(label_to_index)
    source_row_count = len(selected)
    selected = selected.drop_duplicates(["label", "content_hash"]).copy()
    selected["group_id"] = selected.apply(
        lambda row: f"{row['class_index']}:{row['content_hash']}", axis=1
    )

    ratios = config["split_ratios"]
    rng = np.random.default_rng(config["random_seed"])
    split_parts: dict[str, list[pd.DataFrame]] = {
        "train": [],
        "validation": [],
        "test": [],
    }
    split_groups: dict[str, list[str]] = {
        "train": [],
        "validation": [],
        "test": [],
    }

    for label in labels:
        label_rows = selected[selected["label"] == label]
        groups = label_rows["group_id"].to_numpy(dtype=str)
        if len(groups) < 3:
            print(f"{label} has fewer than three unique video contents.")
            return 1

        shuffled = groups.copy()
        rng.shuffle(shuffled)
        validation_count = max(1, round(len(groups) * ratios["validation"]))
        test_count = max(1, round(len(groups) * ratios["test"]))
        while validation_count + test_count >= len(groups):
            if test_count >= validation_count and test_count > 1:
                test_count -= 1
            elif validation_count > 1:
                validation_count -= 1
            else:
                break

        test_groups = shuffled[:test_count].tolist()
        validation_groups = shuffled[test_count : test_count + validation_count].tolist()
        train_groups = shuffled[test_count + validation_count :].tolist()

        for split_name, assigned_groups in (
            ("train", train_groups),
            ("validation", validation_groups),
            ("test", test_groups),
        ):
            split_groups[split_name].extend(assigned_groups)
            split_parts[split_name].append(
                label_rows[label_rows["group_id"].isin(assigned_groups)].copy()
            )

    split_frames = {
        name: pd.concat(parts, ignore_index=True)
        for name, parts in split_parts.items()
    }

    artifact_dir = ROOT / paths["artifact_dir"]
    split_dir = artifact_dir / "splits"
    split_dir.mkdir(parents=True, exist_ok=True)
    columns = [
        "video_path",
        "label",
        "class_index",
        "group_id",
        "source_split",
    ]
    for split_name, frame in split_frames.items():
        frame = frame.sort_values(["class_index", "group_id", "video_path"])
        frame[columns].to_csv(split_dir / f"{split_name}.csv", index=False)

    all_group_sets = [set(values) for values in split_groups.values()]
    group_overlap = any(
        all_group_sets[left] & all_group_sets[right]
        for left in range(len(all_group_sets))
        for right in range(left + 1, len(all_group_sets))
    )
    report = {
        "provisional": True,
        "group_assumption": (
            "Exact duplicate video contents are collapsed and split exclusively. "
            "Signer identity remains unavailable."
        ),
        "group_overlap": group_overlap,
        "duplicate_rows_removed": int(source_row_count - len(selected)),
        "unique_video_contents": int(len(selected)),
        "groups": split_groups,
        "rows": {name: int(len(frame)) for name, frame in split_frames.items()},
        "class_counts": {
            name: {
                label: int((frame["label"] == label).sum()) for label in labels
            }
            for name, frame in split_frames.items()
        },
    }
    report_path = artifact_dir / "split_report.json"
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"Split manifests: {split_dir}")
    return 1 if group_overlap else 0


if __name__ == "__main__":
    sys.exit(main())

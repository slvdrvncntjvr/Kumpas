from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, confusion_matrix

matplotlib.use("Agg")
import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]


def load_config() -> dict:
    with (ROOT / "config.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    config = load_config()
    default_trials = (
        ROOT
        / config["paths"]["artifact_dir"]
        / "live"
        / "webcam_trials.csv"
    )
    parser = argparse.ArgumentParser(
        description="Summarize labeled webcam trials and live latency."
    )
    parser.add_argument("--trials", type=Path, default=default_trials)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()

    trials_path = args.trials
    if not trials_path.is_absolute():
        trials_path = ROOT / trials_path
    if not trials_path.is_file():
        print(f"Missing webcam trial log: {trials_path}")
        return 1

    trials = pd.read_csv(trials_path, keep_default_na=False)
    required = {
        "expected",
        "predicted",
        "confidence",
        "accepted",
        "prediction_latency_ms",
        "segment_seconds",
    }
    missing = sorted(required - set(trials.columns))
    if missing:
        print(f"Trial log is missing columns: {missing}")
        return 1
    evaluated = trials[trials["expected"].astype(str).str.len() > 0].copy()
    if evaluated.empty:
        print("No trials have an expected label; rerun with --expected LABEL.")
        return 1

    evaluated["accepted"] = evaluated["accepted"].astype(str).str.lower() == "true"
    evaluated["confidence"] = evaluated["confidence"].astype(float)
    evaluated["prediction_latency_ms"] = evaluated[
        "prediction_latency_ms"
    ].astype(float)
    evaluated["segment_seconds"] = evaluated["segment_seconds"].astype(float)
    labels = [
        label
        for label in config["labels"]
        if label in set(evaluated["expected"]) | set(evaluated["predicted"])
    ]
    unknown = sorted(
        (set(evaluated["expected"]) | set(evaluated["predicted"])) - set(labels)
    )
    labels.extend(unknown)

    accepted = evaluated[evaluated["accepted"]]
    no_sign = evaluated[evaluated["expected"] == "NO_SIGN"]
    signed = evaluated[evaluated["expected"] != "NO_SIGN"]
    report = {
        "model_version": config["version"],
        "trial_count": int(len(evaluated)),
        "class_counts": {
            label: int((evaluated["expected"] == label).sum()) for label in labels
        },
        "raw_accuracy": float(
            accuracy_score(evaluated["expected"], evaluated["predicted"])
        ),
        "acceptance_rate": float(evaluated["accepted"].mean()),
        "signed_acceptance_rate": (
            float(signed["accepted"].mean()) if not signed.empty else None
        ),
        "no_sign_false_activation_rate": (
            float(no_sign["accepted"].mean()) if not no_sign.empty else None
        ),
        "accepted_accuracy": (
            float(accuracy_score(accepted["expected"], accepted["predicted"]))
            if not accepted.empty
            else None
        ),
        "confidence": {
            "median": float(evaluated["confidence"].median()),
            "minimum": float(evaluated["confidence"].min()),
        },
        "prediction_latency_ms": {
            "median": float(evaluated["prediction_latency_ms"].median()),
            "p95": float(np.percentile(evaluated["prediction_latency_ms"], 95)),
        },
        "segment_seconds": {
            "median": float(evaluated["segment_seconds"].median()),
            "p95": float(np.percentile(evaluated["segment_seconds"], 95)),
        },
    }

    output_dir = args.output_dir or trials_path.parent
    if not output_dir.is_absolute():
        output_dir = ROOT / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = output_dir / "webcam_metrics.json"
    metrics_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    matrix = confusion_matrix(
        evaluated["expected"], evaluated["predicted"], labels=labels
    )
    size = max(8.0, len(labels) * 0.8)
    figure, axis = plt.subplots(figsize=(size, size * 0.8))
    ConfusionMatrixDisplay(matrix, display_labels=labels).plot(
        ax=axis, cmap="Blues", xticks_rotation=45, colorbar=False
    )
    figure.tight_layout()
    figure.savefig(output_dir / "webcam_confusion_matrix.png", dpi=160)
    plt.close(figure)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"Metrics: {metrics_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

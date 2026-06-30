from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import matplotlib
import numpy as np
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    recall_score,
)

matplotlib.use("Agg")
import matplotlib.pyplot as plt

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
from tensorflow import keras


ROOT = Path(__file__).resolve().parents[1]


def load_config() -> dict:
    with (ROOT / "config.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    config = load_config()
    paths = config["paths"]
    cache_path = ROOT / paths["cache_dir"] / "test.npz"
    model_path = ROOT / paths["artifact_dir"] / "model" / "best.keras"
    evaluation_dir = ROOT / paths["artifact_dir"] / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)

    if not cache_path.is_file() or not model_path.is_file():
        print("Missing test cache or trained model.")
        return 1

    with np.load(cache_path) as data:
        X_test = data["X"].astype(np.float32)
        y_test = data["y"].astype(np.int64)

    model = keras.models.load_model(model_path)
    probabilities = model.predict(X_test, verbose=0)
    predictions = probabilities.argmax(axis=1)
    label_indices = list(range(len(config["labels"])))
    per_class_recall = recall_score(
        y_test,
        predictions,
        labels=label_indices,
        average=None,
        zero_division=0,
    )
    macro_f1 = f1_score(
        y_test,
        predictions,
        labels=label_indices,
        average="macro",
        zero_division=0,
    )
    has_no_sign = "NO_SIGN" in config["labels"]
    provisional = True
    metric_gate = bool(macro_f1 >= 0.75 and per_class_recall.min() >= 0.60)
    blocking_reasons = [
        "Signer/session grouping has not been verified from authoritative metadata."
    ]
    if not has_no_sign:
        blocking_reasons.append("NO_SIGN training and test data are absent.")
    warning = " ".join(blocking_reasons)
    metrics = {
        "provisional": provisional,
        "warning": warning,
        "blocking_reasons": blocking_reasons,
        "sample_count": int(len(y_test)),
        "accuracy": float(accuracy_score(y_test, predictions)),
        "macro_f1": float(macro_f1),
        "minimum_class_recall": float(per_class_recall.min()),
        "metric_gate": metric_gate,
        "integration_ready": bool(metric_gate and has_no_sign and not provisional),
        "classification_report": classification_report(
            y_test,
            predictions,
            labels=label_indices,
            target_names=config["labels"],
            output_dict=True,
            zero_division=0,
        ),
    }
    metrics_path = evaluation_dir / "metrics.json"
    metrics_path.write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    matrix = confusion_matrix(y_test, predictions, labels=label_indices)
    figure, axis = plt.subplots(figsize=(10, 8))
    ConfusionMatrixDisplay(matrix, display_labels=config["labels"]).plot(
        ax=axis, cmap="Blues", xticks_rotation=35, colorbar=False
    )
    figure.tight_layout()
    figure.savefig(evaluation_dir / "confusion_matrix.png", dpi=160)
    plt.close(figure)

    np.savez_compressed(
        evaluation_dir / "predictions.npz",
        y_true=y_test,
        y_pred=predictions,
        probabilities=probabilities,
    )
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(f"Metrics: {metrics_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

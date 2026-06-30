"""
Convert the trained Keras sign-recognition model to TensorFlow.js format for
in-browser inference. Outputs model.json + weight shards into the web app's
public/models/sign-model/ directory.

Keras 3 models do not convert cleanly to tfjs-layers (the topology uses a
different inbound-node/batch_shape format). To get a clean, browser-loadable
LayersModel, we rebuild the identical architecture in tf_keras (legacy Keras
2.x, which the tfjs converter fully supports), copy the trained weights across
by layer order, then convert that model.

Usage:
    python scripts/convert_to_tfjs.py --version baseline-v5
"""

from __future__ import annotations

import argparse
import json
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_MODEL_DIR = ROOT.parent / "public" / "models" / "sign-model"


def load_config() -> dict:
    with (ROOT / "config.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def build_tfkeras_model(config: dict, num_classes: int):
    """Rebuild the training architecture using tf_keras (legacy Keras 2.x)."""
    import tf_keras as k

    inputs = k.Input(
        shape=(config["sequence_length"], config["feature_count"]),
        name="landmark_sequence",
    )
    x = k.layers.Conv1D(64, 5, padding="same", name="temporal_conv_1")(inputs)
    x = k.layers.BatchNormalization(name="batch_norm_1")(x)
    x = k.layers.Activation("relu", name="relu_1")(x)
    x = k.layers.MaxPooling1D(2, name="temporal_pool")(x)
    x = k.layers.Conv1D(96, 3, padding="same", name="temporal_conv_2")(x)
    x = k.layers.BatchNormalization(name="batch_norm_2")(x)
    x = k.layers.Activation("relu", name="relu_2")(x)
    x = k.layers.GlobalAveragePooling1D(name="temporal_average")(x)
    x = k.layers.Dropout(0.3, name="dropout_1")(x)
    x = k.layers.Dense(64, activation="relu", name="embedding")(x)
    x = k.layers.Dropout(0.2, name="dropout_2")(x)
    outputs = k.layers.Dense(
        num_classes, activation="softmax", name="sign_probabilities"
    )(x)
    return k.Model(inputs, outputs, name="kumpas_web")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="baseline-v5")
    parser.add_argument("--which", default="best", choices=["best", "final"])
    args = parser.parse_args()

    model_dir = ROOT / "artifacts" / args.version / "model"
    model_path = model_dir / f"{args.which}.keras"
    labels_path = model_dir / "labels.json"
    if not model_path.is_file():
        print(f"Missing model: {model_path}")
        return 1

    config = load_config()
    labels = json.loads(labels_path.read_text(encoding="utf-8"))

    # 1. Load the trained Keras 3 model to read its weights.
    import keras

    print(f"Loading trained model: {model_path}")
    trained = keras.models.load_model(model_path)

    # 2. Rebuild the identical architecture in tf_keras and copy weights.
    print("Rebuilding architecture in tf_keras and copying weights ...")
    web_model = build_tfkeras_model(config, len(labels))

    trained_layers = {layer.name: layer for layer in trained.layers}
    copied = 0
    for layer in web_model.layers:
        source = trained_layers.get(layer.name)
        if source is not None:
            weights = source.get_weights()
            if weights:
                layer.set_weights(weights)
                copied += 1
    print(f"Copied weights for {copied} layers.")

    # 3. Convert the tf_keras model to TF.js Layers format. Stub heavy optional
    #    deps the tensorflowjs package imports at module load but does not need
    #    for a plain Keras LayersModel conversion.
    for stub in (
        "tensorflow_decision_forests",
        "tensorflow_hub",
        "jax",
        "jax.experimental",
        "jax.experimental.jax2tf",
    ):
        sys.modules.setdefault(stub, types.ModuleType(stub))

    import tensorflowjs as tfjs

    WEB_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Converting to TF.js Layers format -> {WEB_MODEL_DIR}")
    tfjs.converters.save_keras_model(web_model, str(WEB_MODEL_DIR))

    # 4. Copy labels and write inference metadata.
    (WEB_MODEL_DIR / "labels.json").write_text(
        json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    metadata = {
        "version": args.version,
        "sequence_length": config["sequence_length"],
        "feature_count": config["feature_count"],
        "temporal_crop": config["temporal_crop"],
        "hand_landmarker": config["hand_landmarker"],
        "webcam_test": config["webcam_test"],
    }
    (WEB_MODEL_DIR / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

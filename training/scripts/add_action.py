import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Add a new action to the pipeline")
    parser.add_argument("folder_name", help="Name of the folder in clips/clips/ (e.g. marriage_license)")
    parser.add_argument("--category", default="UNCATEGORIZED", help="Category for labels.csv")
    parser.add_argument(
        "--skip-pipeline",
        action="store_true",
        help="Update metadata without running DVC; useful when adding a batch",
    )
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parents[1]
    clips_dir = root_dir / "clips" / "clips" / args.folder_name

    if not clips_dir.exists():
        print(f"Error: Folder {clips_dir} does not exist.")
        sys.exit(1)

    videos = list(clips_dir.glob("*.mp4")) + list(clips_dir.glob("*.MOV")) + list(clips_dir.glob("*.mov"))
    if not videos:
        print(f"Error: No videos found in {clips_dir}")
        sys.exit(1)

    label_name = (
        "NO_SIGN"
        if args.folder_name.lower() == "no_sign"
        else args.folder_name.replace("_", " ").upper()
    )
    print(f"Adding {len(videos)} videos for action: {label_name} (Folder: {args.folder_name})")

    # 1. Update labels.csv
    labels_csv_path = root_dir / "labels.csv"
    labels: list[dict[str, str]] = []
    with open(labels_csv_path, "r", encoding="utf-8") as f:
        labels = list(csv.DictReader(f))
    existing_label = next(
        (row for row in labels if row["label"] == label_name), None
    )
    if existing_label is None:
        label_id = max(int(row["id"]) for row in labels) + 1
        with open(labels_csv_path, "a", encoding="utf-8", newline='') as f:
            writer = csv.writer(f)
            writer.writerow([label_id, label_name, args.category])
        print("Updated labels.csv")
    else:
        label_id = int(existing_label["id"])
        print(f"{label_name} already in labels.csv with ID {label_id}")

    # 2. Update config.json
    config_path = root_dir / "config.json"
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    if label_name not in config.get("labels", []):
        config.setdefault("labels", []).append(label_name)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        print("Updated config.json")
    else:
        print(f"{label_name} already in config.json")

    # 3. Update train.csv
    train_csv_path = root_dir / "train.csv"
    existing_vids = set()
    with open(train_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing_vids.add(row["vid_path"])

    new_entries = 0
    with open(train_csv_path, "a", encoding="utf-8", newline='') as f:
        writer = csv.writer(f)
        for video in videos:
            vid_rel_path = f"clips\\{args.folder_name}\\{video.name}"
            # Windows style path is used in train.csv
            if vid_rel_path not in existing_vids:
                writer.writerow([vid_rel_path, label_id, label_name, args.category])
                new_entries += 1

    print(f"Added {new_entries} new videos to train.csv")

    if new_entries == 0 and existing_label and label_name in config.get("labels", []):
        print("No new changes to commit. Everything is up to date!")
        # We can still run the pipeline if the user wants, but maybe we skip or just run.

    if args.skip_pipeline:
        print("Skipped DVC pipeline run.")
        return

    # 4. Version the clips and run the repository-level DVC pipeline.
    print("\n--- Running Pipeline ---")
    repo_root = root_dir.parent
    commands = [
        ["dvc", "add", "training/clips"],
        ["dvc", "repro"],
    ]
    for command in commands:
        print(f"\n=> Running {' '.join(command)} ...")
        result = subprocess.run(command, cwd=str(repo_root))
        if result.returncode != 0:
            print(f"Error running {' '.join(command)}. Aborting pipeline.")
            sys.exit(result.returncode)

    print("\nPipeline completed successfully! Your new word is ready to use.")

if __name__ == "__main__":
    main()

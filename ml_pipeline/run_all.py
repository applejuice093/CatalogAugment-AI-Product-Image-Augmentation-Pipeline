#!/usr/bin/env python3
"""
CatalogAugment AI — Master End-to-End Pipeline Runner
Executes all 4 stages sequentially (Weeks 1–4) and saves a full execution summary.
"""

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

STAGES = [
    ("Week 1: Dataset Preparation & Baseline EDA", ["01_dataset_preparation.py"]),
    ("Week 2: Albumentations Conventional Pipeline", ["02_albumentations_pipeline.py"]),
    ("Week 3A-1: Bria RMBG-1.4 Neural Segmentation", ["03_diffusers_generative.py", "--segment-only"]),
    ("Week 3A-2: Diffusers Generative Pipeline & Quality Gate", ["03_diffusers_generative.py", "--skip-segment"]),
    ("Week 3B–4: PyTorch Training & Robustness Evaluation", ["04_pytorch_train_and_evaluate.py"]),
]


def main():
    overall_start = time.time()
    print("=" * 78)
    print(f"CatalogAugment AI — Full End-to-End Pipeline Execution ({datetime.now().isoformat(timespec='seconds')})")
    print("=" * 78)

    stage_results = []
    for idx, (label, script_args) in enumerate(STAGES, 1):
        script = script_args[0]
        extra = script_args[1:]
        script_path = BASE_DIR / script
        print(f"\n>>> [{idx}/{len(STAGES)}] Starting {label} ({' '.join(script_args)})...")
        t0 = time.time()
        proc = subprocess.run([sys.executable, "-u", str(script_path), *extra], check=False)
        elapsed = round(time.time() - t0, 2)
        stage_results.append({
            "stage": label,
            "script": script,
            "exit_code": proc.returncode,
            "duration_seconds": elapsed,
            "status": "PASSED" if proc.returncode == 0 else "FAILED",
        })
        print(f"<<< [{idx}/{len(STAGES)}] {label} finished with exit_code={proc.returncode} in {elapsed}s")
        if proc.returncode != 0:
            print(f"\n[ABORTED] Pipeline stopped due to failure in {script}")
            sys.exit(proc.returncode)
        # Allow Windows OS to reclaim GPU/RAM memory cleanly before starting next heavy ML stage
        if idx < len(STAGES):
            time.sleep(3)

    total_elapsed = round(time.time() - overall_start, 2)
    summary = {
        "completed_at": datetime.now().isoformat(timespec="seconds"),
        "total_duration_seconds": total_elapsed,
        "status": "SUCCESS",
        "stages": stage_results,
    }
    summary_path = OUTPUT_DIR / "pipeline_run_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 78)
    print(f"ALL 4 PIPELINE STAGES COMPLETED SUCCESSFULLY in {total_elapsed:.1f}s!")
    print(f"Summary written to: {summary_path}")
    print("=" * 78)


if __name__ == "__main__":
    main()

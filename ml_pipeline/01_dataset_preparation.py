#!/usr/bin/env python3
"""
Week 1 Deliverable: Product Dataset Preparation, Preprocessing & Baseline EDA
=============================================================================
Loads a real multi-category e-commerce studio catalog dataset from Hugging Face
(`benitomartin/fashion-product-images-small-384x512`), validates and normalizes
images into aspect-ratio-preserving 512x512 RGB studio format, performs a
stratified Train/Val/Test split, exports manifest & statistics, and generates
representative EDA visualizations.
"""

import json
import os
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from datasets import load_dataset
from PIL import Image, ImageOps
from sklearn.model_selection import train_test_split

# Configuration
DATASET_ID = "benitomartin/fashion-product-images-small-384x512"
TARGET_CATEGORIES = [
    "Shirts",
    "Casual Shoes",
    "Watches",
    "Backpacks",
    "Sunglasses",
    "Handbags",
]
IMAGES_PER_CATEGORY = 40  # 6 x 40 = 240 curated high-res studio product images
TARGET_SIZE = 512
RANDOM_SEED = 42

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "prepared"
OUTPUT_DIR = BASE_DIR / "outputs"
FIGURES_DIR = OUTPUT_DIR / "figures"

for d in [DATA_DIR, OUTPUT_DIR, FIGURES_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def sanitize_category(name: str) -> str:
    return name.lower().replace(" ", "_")


def pad_to_square_rgb(img: Image.Image, target_size: int = 512) -> Image.Image:
    """Convert to RGB and pad to square with white studio canvas preserving aspect ratio."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    max_side = max(w, h)
    # Use edge pixel median or white studio background for padding
    border_pixels = np.concatenate([
        np.array(rgb)[0, :, :],
        np.array(rgb)[-1, :, :],
        np.array(rgb)[:, 0, :],
        np.array(rgb)[:, -1, :],
    ], axis=0)
    bg_color = tuple(int(v) for v in np.median(border_pixels, axis=0))
    canvas = Image.new("RGB", (max_side, max_side), bg_color)
    offset = ((max_side - w) // 2, (max_side - h) // 2)
    canvas.paste(rgb, offset)
    return canvas.resize((target_size, target_size), Image.Resampling.LANCZOS)


def is_valid_studio_image(img: Image.Image) -> tuple[bool, str]:
    """Basic data hygiene: reject corrupted, grayscale-only, or tiny images."""
    if img is None:
        return False, "none_image"
    w, h = img.size
    if w < 100 or h < 100:
        return False, "too_small"
    arr = np.array(img.convert("RGB"))
    if arr.ndim != 3 or arr.shape[2] != 3:
        return False, "invalid_channels"
    if float(arr.std()) < 5.0:
        return False, "blank_image"
    return True, "ok"


def main():
    print("=" * 68)
    print("CatalogAugment AI — Week 1: Dataset Preparation & Baseline EDA")
    print("=" * 68)
    print(f"Streaming dataset: {DATASET_ID}")
    print(f"Target categories ({len(TARGET_CATEGORIES)}): {TARGET_CATEGORIES}")
    print(f"Target count: {IMAGES_PER_CATEGORY} images/category = {len(TARGET_CATEGORIES) * IMAGES_PER_CATEGORY} total")

    ds = load_dataset(DATASET_ID, split="train", streaming=True)

    collected = {cat: [] for cat in TARGET_CATEGORIES}
    rejected_reasons = Counter()
    scanned = 0

    for row in ds:
        scanned += 1
        cat = row.get("articleType")
        if cat not in collected:
            continue
        if len(collected[cat]) >= IMAGES_PER_CATEGORY:
            if all(len(v) >= IMAGES_PER_CATEGORY for v in collected.values()):
                break
            continue

        img = row.get("image")
        ok, reason = is_valid_studio_image(img)
        if not ok:
            rejected_reasons[reason] += 1
            continue

        raw_w, raw_h = img.size
        raw_mode = img.mode
        processed = pad_to_square_rgb(img, TARGET_SIZE)
        arr = np.array(processed, dtype=np.float32) / 255.0

        collected[cat].append({
            "product_id": str(row.get("id", f"{sanitize_category(cat)}_{len(collected[cat])}")),
            "category": cat,
            "category_slug": sanitize_category(cat),
            "master_category": str(row.get("masterCategory", "")),
            "sub_category": str(row.get("subCategory", "")),
            "base_colour": str(row.get("baseColour", "")),
            "gender": str(row.get("gender", "")),
            "product_name": str(row.get("productDisplayName", "")),
            "raw_width": raw_w,
            "raw_height": raw_h,
            "raw_aspect_ratio": round(raw_w / max(raw_h, 1), 3),
            "raw_mode": raw_mode,
            "norm_width": TARGET_SIZE,
            "norm_height": TARGET_SIZE,
            "mean_brightness": round(float(arr.mean()), 4),
            "contrast_std": round(float(arr.std()), 4),
            "pil_image": processed,
        })

        if scanned % 1000 == 0:
            counts = {k: len(v) for k, v in collected.items()}
            print(f"  Scanned {scanned:,} rows -> collected: {counts}")

        if all(len(v) >= IMAGES_PER_CATEGORY for v in collected.values()):
            break

    all_records = []
    for cat in TARGET_CATEGORIES:
        all_records.extend(collected[cat])

    print(f"\nCollected {len(all_records)} clean studio images after scanning {scanned:,} rows.")
    if rejected_reasons:
        print(f"Rejected during hygiene checks: {dict(rejected_reasons)}")

    # Stratified Train / Val / Test split (70% / 15% / 15%)
    indices = np.arange(len(all_records))
    labels = [r["category"] for r in all_records]

    train_idx, temp_idx = train_test_split(
        indices, test_size=0.30, stratify=labels, random_state=RANDOM_SEED
    )
    temp_labels = [labels[i] for i in temp_idx]
    val_idx, test_idx = train_test_split(
        temp_idx, test_size=0.50, stratify=temp_labels, random_state=RANDOM_SEED
    )

    split_map = {}
    for i in train_idx:
        split_map[i] = "train"
    for i in val_idx:
        split_map[i] = "val"
    for i in test_idx:
        split_map[i] = "test"

    # Save normalized images & build manifest
    manifest_rows = []
    for idx, rec in enumerate(all_records):
        split = split_map[idx]
        cat_slug = rec["category_slug"]
        out_dir = DATA_DIR / split / cat_slug
        out_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{cat_slug}_{rec['product_id']}.png"
        out_path = out_dir / filename
        rec["pil_image"].save(out_path, format="PNG")

        row_clean = {k: v for k, v in rec.items() if k != "pil_image"}
        row_clean["split"] = split
        row_clean["relative_path"] = str(out_path.relative_to(BASE_DIR)).replace("\\", "/")
        manifest_rows.append(row_clean)

    df = pd.DataFrame(manifest_rows)
    manifest_path = OUTPUT_DIR / "week1_dataset_manifest.csv"
    df.to_csv(manifest_path, index=False)
    print(f"Saved manifest: {manifest_path}")

    # Compute summary statistics
    split_counts = df.groupby(["category", "split"]).size().unstack(fill_value=0)
    stats = {
        "source_dataset": DATASET_ID,
        "total_images": int(len(df)),
        "num_categories": int(df["category"].nunique()),
        "categories": TARGET_CATEGORIES,
        "normalized_resolution": f"{TARGET_SIZE}x{TARGET_SIZE}",
        "color_space": "RGB",
        "splits": {
            "train": int((df["split"] == "train").sum()),
            "val": int((df["split"] == "val").sum()),
            "test": int((df["split"] == "test").sum()),
        },
        "per_category_splits": split_counts.to_dict(orient="index"),
        "raw_resolution_summary": {
            "width_min": int(df["raw_width"].min()),
            "width_max": int(df["raw_width"].max()),
            "width_median": float(df["raw_width"].median()),
            "height_min": int(df["raw_height"].min()),
            "height_max": int(df["raw_height"].max()),
            "height_median": float(df["raw_height"].median()),
            "aspect_ratio_mean": round(float(df["raw_aspect_ratio"].mean()), 3),
        },
        "photometric_summary": {
            "mean_brightness": round(float(df["mean_brightness"].mean()), 4),
            "std_brightness": round(float(df["mean_brightness"].std()), 4),
            "mean_contrast": round(float(df["contrast_std"].mean()), 4),
        },
        "rejected_during_hygiene": dict(rejected_reasons),
        "random_seed": RANDOM_SEED,
    }

    stats_path = OUTPUT_DIR / "week1_dataset_stats.json"
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print(f"Saved dataset statistics: {stats_path}")

    # ------------------------------------------------------------------
    # Visualization 1: Stratified Class Distribution (Train / Val / Test)
    # ------------------------------------------------------------------
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "ggplot")
    fig, ax = plt.subplots(figsize=(9, 4.8), dpi=160)
    cats = TARGET_CATEGORIES
    x = np.arange(len(cats))
    train_vals = [split_counts.loc[c, "train"] for c in cats]
    val_vals = [split_counts.loc[c, "val"] for c in cats]
    test_vals = [split_counts.loc[c, "test"] for c in cats]

    ax.bar(x, train_vals, label="Train (70%)", color="#2563eb")
    ax.bar(x, val_vals, bottom=train_vals, label="Val (15%)", color="#10b981")
    ax.bar(x, test_vals, bottom=np.array(train_vals) + np.array(val_vals), label="Test (15%)", color="#f59e0b")

    for i in range(len(cats)):
        total = train_vals[i] + val_vals[i] + test_vals[i]
        ax.text(i, total + 0.8, f"{total}", ha="center", va="bottom", fontweight="bold", fontsize=10)

    ax.set_xticks(x)
    ax.set_xticklabels(cats, fontsize=10)
    ax.set_ylabel("Number of Product Images", fontsize=11)
    ax.set_title("Week 1 EDA: Stratified Product Dataset Split by Category (N = 240)", fontsize=12, fontweight="bold")
    ax.set_ylim(0, IMAGES_PER_CATEGORY + 8)
    ax.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week1_class_distribution.png")
    plt.close(fig)

    # ------------------------------------------------------------------
    # Visualization 2: Photometric Brightness & Contrast Distributions
    # ------------------------------------------------------------------
    fig, axes = plt.subplots(1, 2, figsize=(10.5, 4.2), dpi=160)
    axes[0].hist(df["mean_brightness"], bins=18, color="#3b82f6", edgecolor="white", alpha=0.9)
    axes[0].axvline(df["mean_brightness"].mean(), color="#ef4444", linestyle="--", linewidth=1.8,
                    label=f"Mean = {df['mean_brightness'].mean():.2f}")
    axes[0].set_title("Studio Catalog Mean Brightness Distribution", fontweight="bold")
    axes[0].set_xlabel("Normalized Mean Pixel Intensity [0–1]")
    axes[0].set_ylabel("Count")
    axes[0].legend()

    axes[1].hist(df["contrast_std"], bins=18, color="#8b5cf6", edgecolor="white", alpha=0.9)
    axes[1].axvline(df["contrast_std"].mean(), color="#ef4444", linestyle="--", linewidth=1.8,
                    label=f"Mean = {df['contrast_std'].mean():.2f}")
    axes[1].set_title("Studio Catalog Contrast (Pixel StdDev)", fontweight="bold")
    axes[1].set_xlabel("Normalized StdDev [0–1]")
    axes[1].set_ylabel("Count")
    axes[1].legend()

    fig.suptitle("Week 1 Photometric Audit: High-Key White Studio Dominance", fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week1_eda_stats.png", bbox_inches="tight")
    plt.close(fig)

    # ------------------------------------------------------------------
    # Visualization 3: Representative Product Sample Grid (6 categories x 5 samples)
    # ------------------------------------------------------------------
    fig, axes = plt.subplots(len(TARGET_CATEGORIES), 5, figsize=(11, 13), dpi=150)
    for row_i, cat in enumerate(TARGET_CATEGORIES):
        cat_rows = df[df["category"] == cat].head(5).reset_index(drop=True)
        for col_i in range(5):
            ax = axes[row_i, col_i]
            img_path = BASE_DIR / cat_rows.loc[col_i, "relative_path"]
            ax.imshow(Image.open(img_path))
            ax.set_xticks([])
            ax.set_yticks([])
            for spine in ax.spines.values():
                spine.set_edgecolor("#e5e7eb")
            if col_i == 0:
                ax.set_ylabel(cat, fontsize=11, fontweight="bold", rotation=0, labelpad=52, va="center")
    fig.suptitle("Week 1 Representative Clean Studio Catalog Samples (6 Categories)", fontsize=14, fontweight="bold", y=0.995)
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week1_sample_grid.png", bbox_inches="tight")
    plt.close(fig)

    print("\nWeek 1 Dataset Preparation & EDA Complete!")
    print(f"Figures saved in: {FIGURES_DIR}")


if __name__ == "__main__":
    main()

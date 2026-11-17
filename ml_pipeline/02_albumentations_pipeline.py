#!/usr/bin/env python3
"""
Week 2 Deliverable: Conventional Product Image Augmentation Pipeline (Albumentations)
=====================================================================================
Implements a domain-calibrated Albumentations pipeline simulating realistic
customer-submitted photo variations:
  1. Spatial & Geometric (orientation, scale, perspective)
  2. Lighting & Color Cast (brightness/contrast, shadows, mild color temp shifts)
  3. Camera & Compression Quality (motion/defocus blur, ISO/Gaussian noise, JPEG)
  4. Partial Occlusion (CoarseDropout simulating hands/tags/clutter)

Also implements an intentionally over-aggressive ("unrealistic") pipeline for
quality auditing (Objective 5: identifying realistic vs. unrealistic transforms).
"""

import json
import random
from pathlib import Path

import albumentations as A
import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
FIGURES_DIR = OUTPUT_DIR / "figures"
CONV_OUT_DIR = BASE_DIR / "data" / "augmented_conventional"
MANIFEST_IN = OUTPUT_DIR / "week1_dataset_manifest.csv"

VARIANTS_PER_TRAIN_IMAGE = 3  # 168 train images x 3 = 504 conventional augmented images
RANDOM_SEED = 42


def build_realistic_pipeline(image_size: int = 512) -> A.Compose:
    """
    Domain-calibrated Albumentations pipeline for retail product photography.
    Preserves product identity (true color, silhouette, key features) while
    introducing realistic customer camera & environmental variations.
    """
    return A.Compose(
        [
            # 1. Orientation, Viewpoint & Scale
            A.HorizontalFlip(p=0.5),
            A.Affine(
                scale=(0.82, 1.12),
                translate_percent=(-0.06, 0.06),
                rotate=(-18, 18),
                shear=(-8, 8),
                border_mode=cv2.BORDER_REPLICATE,
                p=0.80,
            ),
            A.Perspective(
                scale=(0.03, 0.08),
                keep_size=True,
                border_mode=cv2.BORDER_REPLICATE,
                p=0.55,
            ),
            A.RandomResizedCrop(
                size=(image_size, image_size),
                scale=(0.78, 1.0),
                ratio=(0.88, 1.12),
                p=0.50,
            ),
            # 2. Lighting & Exposure Variations (tiny hue bound protects product color!)
            A.RandomBrightnessContrast(
                brightness_limit=(-0.28, 0.25),
                contrast_limit=(-0.22, 0.25),
                p=0.80,
            ),
            A.ColorJitter(
                brightness=(0.85, 1.15),
                contrast=(0.85, 1.15),
                saturation=(0.78, 1.22),
                hue=(-0.03, 0.03),
                p=0.60,
            ),
            A.RandomGamma(gamma_limit=(72, 132), p=0.50),
            A.RandomToneCurve(scale=0.18, p=0.45),
            # 3. Smartphone Optical Quality & Compression Artifacts
            A.OneOf(
                [
                    A.MotionBlur(blur_limit=(3, 7), p=1.0),
                    A.GaussianBlur(blur_limit=(3, 5), p=1.0),
                    A.Defocus(radius=(1, 3), alias_blur=(0.1, 0.3), p=1.0),
                ],
                p=0.45,
            ),
            A.OneOf(
                [
                    A.GaussNoise(std_range=(0.02, 0.07), p=1.0),
                    A.ISONoise(color_shift=(0.01, 0.04), intensity=(0.1, 0.35), p=1.0),
                ],
                p=0.45,
            ),
            A.ImageCompression(quality_range=(40, 85), p=0.50),
            # 4. Mild Real-World Occlusion (fingers, price tags, clutter)
            A.CoarseDropout(
                num_holes_range=(1, 2),
                hole_height_range=(20, 52),
                hole_width_range=(20, 52),
                fill=128,
                p=0.30,
            ),
        ]
    )


def build_unrealistic_pipeline(image_size: int = 512) -> A.Compose:
    """
    Intentionally misconfigured / destructive augmentation pipeline used to
    demonstrate failure modes that harm visual-search model identity learning:
      - Extreme hue shift alters true product color (e.g. navy -> neon green)
      - Severe 150-deg rotation flips upright products upside down
      - Heavy blur & aggressive 25% crop destroy recognizable brand/silhouette cues
    """
    return A.Compose(
        [
            A.Rotate(limit=(110, 180), border_mode=cv2.BORDER_CONSTANT, fill=0, p=1.0),
            A.ColorJitter(brightness=0.5, contrast=0.5, saturation=0.7, hue=0.42, p=1.0),
            A.GaussianBlur(blur_limit=(17, 23), p=1.0),
            A.RandomResizedCrop(size=(image_size, image_size), scale=(0.22, 0.38), ratio=(0.5, 1.8), p=1.0),
            A.CoarseDropout(
                num_holes_range=(4, 6),
                hole_height_range=(70, 120),
                hole_width_range=(70, 120),
                fill=0,
                p=1.0,
            ),
        ]
    )


TRANSFORMATION_DOCUMENTATION = [
    {
        "group": "Orientation & Scale",
        "transforms": "HorizontalFlip (p=0.5), Affine (rotate ±18°, scale 0.82–1.12, shear ±8°), Perspective (0.03–0.08), RandomResizedCrop (0.78–1.0)",
        "rationale": "Simulates casual handheld smartphone framing, slight camera tilt, and distance variation without inverting upright products.",
        "unrealistic_pitfall": "Rotate ±180° or crop <40% destroys upright orientation cues and chops off key product geometry.",
    },
    {
        "group": "Lighting & Color",
        "transforms": "RandomBrightnessContrast (±25%), ColorJitter (hue ±0.03), RandomGamma (72–132), RandomToneCurve (0.18)",
        "rationale": "Models dim indoor rooms, warm tungsten vs. daylight shifts, and cast shadows while strictly bounding hue to protect true SKU color.",
        "unrealistic_pitfall": "Large hue shifts (±0.4) turn a red handbag blue, creating contradictory visual-search labels.",
    },
    {
        "group": "Image Quality",
        "transforms": "MotionBlur / GaussianBlur / Defocus (k=3–7), GaussNoise / ISONoise, ImageCompression (JPEG quality 40–85)",
        "rationale": "Replicates real customer uploads taken with shaky hands, low-light phone ISO grain, and social-media/WhatsApp JPEG recompression.",
        "unrealistic_pitfall": "Heavy Gaussian blur (k>=17) erases fabric texture, dials, zippers, and logos.",
    },
    {
        "group": "Occlusion",
        "transforms": "CoarseDropout (1–2 small patches, 20–52 px, p=0.30)",
        "rationale": "Encourages the vision model to rely on global product structure even when hands, tags, or foreground objects partially occlude the item.",
        "unrealistic_pitfall": "Large black cutouts (>30% area) hide entire small products like watches or sunglasses.",
    },
]


def main():
    print("=" * 72)
    print("CatalogAugment AI — Week 2: Albumentations Conventional Pipeline")
    print("=" * 72)

    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    df = pd.read_csv(MANIFEST_IN)
    train_df = df[df["split"] == "train"].reset_index(drop=True)
    print(f"Loaded Week 1 manifest: {len(df)} total images ({len(train_df)} train split images).")

    realistic_pipe = build_realistic_pipeline(512)
    unrealistic_pipe = build_unrealistic_pipeline(512)

    # Save serialized Albumentations configuration + engineering rationale
    config_payload = {
        "albumentations_version": A.__version__,
        "variants_per_train_image": VARIANTS_PER_TRAIN_IMAGE,
        "random_seed": RANDOM_SEED,
        "rationale": TRANSFORMATION_DOCUMENTATION,
        "realistic_pipeline_dict": A.to_dict(realistic_pipe),
        "unrealistic_pipeline_dict": A.to_dict(unrealistic_pipe),
    }
    config_path = OUTPUT_DIR / "week2_albumentations_config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_payload, f, indent=2)
    print(f"Saved Albumentations config: {config_path}")

    # Generate conventional augmented dataset for TRAIN split only (strictly preventing test leakage!)
    aug_rows = []
    for idx, row in train_df.iterrows():
        src_path = BASE_DIR / row["relative_path"]
        img_rgb = np.array(Image.open(src_path).convert("RGB"))
        cat_slug = row["category_slug"]
        out_dir = CONV_OUT_DIR / cat_slug
        out_dir.mkdir(parents=True, exist_ok=True)

        for v in range(1, VARIANTS_PER_TRAIN_IMAGE + 1):
            # Deterministic per-variant seed for reproducibility
            seed = RANDOM_SEED * 1000 + idx * 10 + v
            random.seed(seed)
            np.random.seed(seed)

            aug_img = realistic_pipe(image=img_rgb)["image"]
            out_name = f"{cat_slug}_{row['product_id']}_alb_v{v}.png"
            out_path = out_dir / out_name
            Image.fromarray(aug_img).save(out_path, format="PNG")

            aug_rows.append({
                "product_id": row["product_id"],
                "category": row["category"],
                "category_slug": cat_slug,
                "source_path": row["relative_path"],
                "relative_path": str(out_path.relative_to(BASE_DIR)).replace("\\", "/"),
                "augmentation_type": "conventional_albumentations",
                "variant_index": v,
                "seed": seed,
            })

    aug_df = pd.DataFrame(aug_rows)
    aug_manifest_path = OUTPUT_DIR / "week2_albumentations_manifest.csv"
    aug_df.to_csv(aug_manifest_path, index=False)
    print(f"Generated {len(aug_df)} Albumentations training images -> {CONV_OUT_DIR}")
    print(f"Saved manifest: {aug_manifest_path}")

    # ------------------------------------------------------------------
    # Visualization 1: Original vs. 4 Realistic Albumentations Variants
    # ------------------------------------------------------------------
    categories = sorted(train_df["category"].unique())
    fig, axes = plt.subplots(len(categories), 5, figsize=(12, 13.5), dpi=150)
    col_titles = ["Original Studio", "Albumentations #1", "Albumentations #2", "Albumentations #3", "Albumentations #4"]

    for r_idx, cat in enumerate(categories):
        sample_row = train_df[train_df["category"] == cat].iloc[0]
        orig = np.array(Image.open(BASE_DIR / sample_row["relative_path"]).convert("RGB"))

        for c_idx in range(5):
            ax = axes[r_idx, c_idx]
            if c_idx == 0:
                ax.imshow(orig)
            else:
                random.seed(900 + r_idx * 17 + c_idx)
                np.random.seed(900 + r_idx * 17 + c_idx)
                ax.imshow(realistic_pipe(image=orig)["image"])
            ax.set_xticks([])
            ax.set_yticks([])
            if r_idx == 0:
                ax.set_title(col_titles[c_idx], fontsize=10.5, fontweight="bold")
            if c_idx == 0:
                ax.set_ylabel(cat, fontsize=10.5, fontweight="bold", rotation=0, labelpad=52, va="center")

    fig.suptitle(
        "Week 2: Albumentations Conventional Augmentation — Realistic Customer-Condition Variations",
        fontsize=13,
        fontweight="bold",
        y=0.995,
    )
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week2_albumentations_comparison.png", bbox_inches="tight")
    plt.close(fig)

    # ------------------------------------------------------------------
    # Visualization 2: Realistic vs. Unrealistic Quality Audit
    # ------------------------------------------------------------------
    fig, axes = plt.subplots(4, 4, figsize=(10.5, 10.5), dpi=150)
    audit_titles = [
        "Original Studio",
        "Realistic (Identity Safe)",
        "Realistic (Lighting/Angle)",
        "UNREALISTIC (Rejected)",
    ]
    sample_cats = categories[:4]
    for r_idx, cat in enumerate(sample_cats):
        sample_row = train_df[train_df["category"] == cat].iloc[1]
        orig = np.array(Image.open(BASE_DIR / sample_row["relative_path"]).convert("RGB"))

        random.seed(501 + r_idx)
        np.random.seed(501 + r_idx)
        real_1 = realistic_pipe(image=orig)["image"]

        random.seed(601 + r_idx)
        np.random.seed(601 + r_idx)
        real_2 = realistic_pipe(image=orig)["image"]

        random.seed(701 + r_idx)
        np.random.seed(701 + r_idx)
        unreal = unrealistic_pipe(image=orig)["image"]

        imgs = [orig, real_1, real_2, unreal]
        border_colors = ["#9ca3af", "#16a34a", "#16a34a", "#dc2626"]
        for c_idx, im in enumerate(imgs):
            ax = axes[r_idx, c_idx]
            ax.imshow(im)
            ax.set_xticks([])
            ax.set_yticks([])
            for spine in ax.spines.values():
                spine.set_edgecolor(border_colors[c_idx])
                spine.set_linewidth(2.5 if c_idx > 0 else 1.0)
            if r_idx == 0:
                ax.set_title(audit_titles[c_idx], fontsize=10.5, fontweight="bold",
                             color="#dc2626" if c_idx == 3 else "#111827")
            if c_idx == 0:
                ax.set_ylabel(cat, fontsize=10.5, fontweight="bold", rotation=0, labelpad=52, va="center")

    fig.suptitle(
        "Week 2 Quality Audit: Realistic (Green) vs. Destructive Unrealistic Transforms (Red)",
        fontsize=12.5,
        fontweight="bold",
        y=0.995,
    )
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week2_realistic_vs_unrealistic.png", bbox_inches="tight")
    plt.close(fig)

    print("Week 2 Albumentations Pipeline & Visual Audits Complete!")


if __name__ == "__main__":
    main()

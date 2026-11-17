#!/usr/bin/env python3
"""
Backend Bridge: Albumentations Conventional Product Image Augmentation
Called by server/services/evaluation/conventionalAugmenter.ts
"""

import argparse
import random
import albumentations as A
import cv2
import numpy as np
from PIL import Image


def build_pipeline(height: int, width: int, mode: str = "realistic") -> A.Compose:
    if mode == "stress_query":
        # Independent customer-photo stress degradation for leak-free evaluation queries
        return A.Compose([
            A.Affine(scale=(0.80, 1.05), rotate=(-22, 22), shear=(-10, 10), border_mode=cv2.BORDER_REPLICATE, p=0.9),
            A.RandomBrightnessContrast(brightness_limit=(-0.32, 0.25), contrast_limit=(-0.25, 0.25), p=0.9),
            A.OneOf([A.MotionBlur(blur_limit=(3, 7), p=1.0), A.GaussianBlur(blur_limit=(3, 5), p=1.0)], p=0.7),
            A.GaussNoise(std_range=(0.02, 0.07), p=0.7),
            A.ImageCompression(quality_range=(35, 65), p=0.8),
        ])

    return A.Compose([
        A.HorizontalFlip(p=0.5),
        A.Affine(scale=(0.82, 1.12), translate_percent=(-0.06, 0.06), rotate=(-18, 18), shear=(-8, 8),
                 border_mode=cv2.BORDER_REPLICATE, p=0.8),
        A.Perspective(scale=(0.03, 0.08), keep_size=True, border_mode=cv2.BORDER_REPLICATE, p=0.55),
        A.RandomBrightnessContrast(brightness_limit=(-0.28, 0.25), contrast_limit=(-0.22, 0.25), p=0.8),
        A.ColorJitter(brightness=(0.85, 1.15), contrast=(0.85, 1.15), saturation=(0.78, 1.22), hue=(-0.03, 0.03), p=0.6),
        A.RandomGamma(gamma_limit=(72, 132), p=0.5),
        A.OneOf([A.MotionBlur(blur_limit=(3, 7), p=1.0), A.GaussianBlur(blur_limit=(3, 5), p=1.0)], p=0.45),
        A.OneOf([A.GaussNoise(std_range=(0.02, 0.07), p=1.0), A.ISONoise(intensity=(0.1, 0.35), p=1.0)], p=0.45),
        A.ImageCompression(quality_range=(40, 85), p=0.5),
    ])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--mode", choices=["realistic", "stress_query"], default="realistic")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    img = np.array(Image.open(args.input).convert("RGB"))
    h, w = img.shape[:2]
    pipe = build_pipeline(h, w, mode=args.mode)
    out = pipe(image=img)["image"]
    Image.fromarray(out).save(args.output, format="PNG")


if __name__ == "__main__":
    main()

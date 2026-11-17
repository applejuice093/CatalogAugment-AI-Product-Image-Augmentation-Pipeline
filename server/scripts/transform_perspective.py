#!/usr/bin/env python3
"""
Precision 3D Perspective & Homography Transformation Script.
Transforms product images and masks according to real-world camera angles and viewpoints
to enhance visual-search and recommendation model robustness against customer-submitted photos.
"""

import sys
import os
import json
import argparse
import cv2
import numpy as np
from PIL import Image

ANGLE_PRESETS = {
    "THREE_QUARTER_YAW": {
        "yaw": 24.0,
        "pitch": 0.0,
        "roll": -3.0,
        "scale": 0.86,
        "dx": 0.0,
        "dy": 0.0,
        "description": "3/4 isometric perspective view with horizontal yaw rotation and depth foreshortening",
        "default_situation_prompt": "three-quarter perspective angle view of dark navy button-down shirt hanging outdoors, weathered urban brick and exposed concrete architecture, sharp natural afternoon sunlight, realistic cast shadows, high-end streetwear lifestyle catalog, 8k professional photography",
    },
    "FLAT_LAY_TOPDOWN": {
        "yaw": 0.0,
        "pitch": -36.0,
        "roll": 0.0,
        "scale": 0.82,
        "dx": 0.0,
        "dy": 25.0,
        "description": "Top-down overhead flat-lay perspective looking downward at tabletop arrangement",
        "default_situation_prompt": "overhead flat-lay tabletop photography of navy blue button-down shirt laid out flat on a rustic dark oak wood table, styled with leather journal, vintage glasses, warm morning window illumination, professional e-commerce product staging, 8k",
    },
    "LOW_ANGLE_HERO": {
        "yaw": 0.0,
        "pitch": 22.0,
        "roll": 2.0,
        "scale": 0.86,
        "dx": 0.0,
        "dy": -20.0,
        "description": "Low-angle heroic upward perspective looking up at hanging garment",
        "default_situation_prompt": "low angle heroic perspective looking upward at dark navy button-down shirt on display, luxury minimalist fashion boutique interior, brushed concrete floor, directional ceiling spotlighting, architectural lighting design, high-end editorial lookbook, 8k",
    },
    "CASUAL_HANDHELD_TILT": {
        "yaw": -14.0,
        "pitch": 8.0,
        "roll": 11.0,
        "scale": 0.85,
        "dx": 0.0,
        "dy": 0.0,
        "description": "Authentic customer smartphone photo with handheld tilt, roll, and natural room perspective",
        "default_situation_prompt": "realistic casual smartphone photograph of navy shirt hanging in a modern bright bedroom wardrobe, natural morning sunlight streaming from window, warm wood closet shelves, authentic customer submitted photo aesthetic, sharp focus, clean interior",
    },
    "FRONTAL_STUDIO": {
        "yaw": 0.0,
        "pitch": 0.0,
        "roll": 0.0,
        "scale": 0.90,
        "dx": 0.0,
        "dy": 0.0,
        "description": "Clean frontal studio perspective normal to camera plane",
        "default_situation_prompt": "clean minimal studio pedestal, white concrete table, soft commercial shadows, high key studio lighting, professional product photography",
    }
}

def get_homography_matrix(width, height, yaw=0.0, pitch=0.0, roll=0.0, f_scale=1.5, scale=0.88, dx=0.0, dy=0.0):
    rad_yaw = np.radians(yaw)
    rad_pitch = np.radians(pitch)
    rad_roll = np.radians(roll)

    f = max(width, height) * f_scale
    cx, cy = width / 2.0, height / 2.0

    K = np.array([
        [f, 0, cx],
        [0, f, cy],
        [0, 0, 1]
    ], dtype=np.float64)

    Rx = np.array([
        [1, 0, 0],
        [0, np.cos(rad_pitch), -np.sin(rad_pitch)],
        [0, np.sin(rad_pitch),  np.cos(rad_pitch)]
    ], dtype=np.float64)

    Ry = np.array([
        [np.cos(rad_yaw), 0, np.sin(rad_yaw)],
        [0, 1, 0],
        [-np.sin(rad_yaw), 0, np.cos(rad_yaw)]
    ], dtype=np.float64)

    Rz = np.array([
        [np.cos(rad_roll), -np.sin(rad_roll), 0],
        [np.sin(rad_roll),  np.cos(rad_roll), 0],
        [0, 0, 1]
    ], dtype=np.float64)

    R = Rz @ Ry @ Rx
    d = f / scale
    T = np.array([[dx], [dy], [d]], dtype=np.float64)

    H_3d = np.column_stack((R[:, 0], R[:, 1], T / d))
    H = K @ H_3d @ np.array([
        [1.0 / f, 0, -cx / f],
        [0, 1.0 / f, -cy / f],
        [0, 0, 1.0]
    ])
    H = H / H[2, 2]
    return H

def transform(image_path, mask_path, preset_name, output_dir, prefix="transformed", custom_params=None):
    params = ANGLE_PRESETS.get(preset_name, ANGLE_PRESETS["FRONTAL_STUDIO"]).copy()
    if custom_params:
        params.update(custom_params)

    # Load image & mask
    img_pil = Image.open(image_path).convert("RGBA")
    w, h = img_pil.size

    mask_pil = Image.open(mask_path).convert("L")
    if mask_pil.size != (w, h):
        mask_pil = mask_pil.resize((w, h), Image.Resampling.BILINEAR)

    img_np = np.array(img_pil)
    mask_np = np.array(mask_pil)

    # If image doesn't have transparency, mask it
    alpha = mask_np.copy()
    cutout_np = np.dstack((img_np[:, :, :3], alpha))

    # Compute Homography
    H = get_homography_matrix(
        w, h,
        yaw=params["yaw"],
        pitch=params["pitch"],
        roll=params["roll"],
        scale=params["scale"],
        dx=params["dx"],
        dy=params["dy"]
    )

    # Warp cutout with Lanczos4
    warped_cutout = cv2.warpPerspective(
        cutout_np, H, (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0)
    )

    # Warp mask with Lanczos4
    warped_mask = cv2.warpPerspective(
        mask_np, H, (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0
    )

    # Clean mask thresholding
    _, warped_mask_thresh = cv2.threshold(warped_mask, 15, 255, cv2.THRESH_BINARY)
    # Smooth edges slightly to avoid aliased jagged boundaries
    warped_mask_clean = cv2.GaussianBlur(warped_mask_thresh, (3, 3), 0)

    # Create composite RGB on neutral grey background for inpainting model
    warped_rgb = warped_cutout[:, :, :3].copy()
    cutout_alpha = warped_cutout[:, :, 3] / 255.0
    for c in range(3):
        warped_rgb[:, :, c] = (warped_rgb[:, :, c] * cutout_alpha + 128 * (1.0 - cutout_alpha)).astype(np.uint8)

    # Ensure output dir
    os.makedirs(output_dir, exist_ok=True)
    out_cutout = os.path.join(output_dir, f"{prefix}_cutout.png")
    out_mask = os.path.join(output_dir, f"{prefix}_mask.png")
    out_rgb = os.path.join(output_dir, f"{prefix}_rgb.png")

    Image.fromarray(warped_cutout).save(out_cutout)
    Image.fromarray(warped_mask_clean).save(out_mask)
    Image.fromarray(warped_rgb).save(out_rgb)

    # Compute bounding box
    y_idxs, x_idxs = np.where(warped_mask_clean > 128)
    bbox = {
        "x_min": int(x_idxs.min()) if len(x_idxs) > 0 else 0,
        "x_max": int(x_idxs.max()) if len(x_idxs) > 0 else w,
        "y_min": int(y_idxs.min()) if len(y_idxs) > 0 else 0,
        "y_max": int(y_idxs.max()) if len(y_idxs) > 0 else h,
    }

    result = {
        "preset": preset_name,
        "description": params.get("description", ""),
        "suggested_prompt": params.get("default_situation_prompt", ""),
        "parameters": {
            "yaw": params["yaw"],
            "pitch": params["pitch"],
            "roll": params["roll"],
            "scale": params["scale"],
            "dx": params["dx"],
            "dy": params["dy"]
        },
        "bbox": bbox,
        "paths": {
            "cutout": out_cutout,
            "mask": out_mask,
            "rgb": out_rgb
        }
    }
    return result

def main():
    parser = argparse.ArgumentParser(description="3D Perspective & Angle Transformation for CatalogAugment")
    parser.add_argument("--image", required=True, help="Path to input product image")
    parser.add_argument("--mask", required=True, help="Path to segmentation mask")
    parser.add_argument("--preset", default="THREE_QUARTER_YAW", choices=list(ANGLE_PRESETS.keys()), help="Angle preset name")
    parser.add_argument("--output_dir", default="data/showcase/angles", help="Output directory")
    parser.add_argument("--prefix", default="angle_transform", help="Output file prefix")
    parser.add_argument("--json", action="store_true", help="Output JSON result to stdout")

    args = parser.parse_args()
    res = transform(args.image, args.mask, args.preset, args.output_dir, args.prefix)
    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print(f"Transformed successfully: {res['preset']} -> {res['paths']['rgb']}")

if __name__ == "__main__":
    main()

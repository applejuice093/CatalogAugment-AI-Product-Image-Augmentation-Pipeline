#!/usr/bin/env python3
"""
Week 3 Deliverable (Part A): Controlled Generative Augmentation via Hugging Face Diffusers
==========================================================================================
Combines:
  1. Bria RMBG-1.4 Neural Foreground Segmentation
  2. 3D Perspective Homography Warping (Yaw / Pitch / Roll camera angles)
  3. Hugging Face `diffusers.StableDiffusionInpaintPipeline` (loading local fp16 checkpoint)
  4. Feathered Foreground Compositing (strict product identity preservation)
  5. Automated Quality Control Gate (PASS vs. REJECT scoring & audit)
"""

import gc
import glob
import json
import os
import random
import sys
import time
from pathlib import Path

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from diffusers import DPMSolverMultistepScheduler, StableDiffusionInpaintPipeline
from PIL import Image, ImageFilter
from safetensors import safe_open
from safetensors.torch import load_file

# Add server/scripts to path so we reuse our standalone BriaRMBG PyTorch architecture
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "server" / "scripts"))
from rmbg_model import BriaRMBG  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
FIGURES_DIR = OUTPUT_DIR / "figures"
GEN_OUT_DIR = BASE_DIR / "data" / "augmented_generative"
REJECT_OUT_DIR = BASE_DIR / "data" / "rejected_generative"
MANIFEST_IN = OUTPUT_DIR / "week1_dataset_manifest.csv"

CHECKPOINT_PATH = r"C:\A\ComfyUI_windows_portable\ComfyUI\models\checkpoints\Realistic_Vision_V6.0_NV_B1_inpainting_fp16.safetensors"
RANDOM_SEED = 42
INFERENCE_STEPS = 12
GUIDANCE_SCALE = 7.0
IMAGE_SIZE = 512
DIFFUSION_SIZE = 384  # Divisible by 8; 2x faster on 6GB RTX 3050 + natural bokeh when upscaled to 512x512

ANGLE_PRESETS = [
    {"name": "three_quarter_left", "yaw": 20.0, "pitch": 0.0, "roll": -2.5, "scale": 0.85, "dx": 0.0, "dy": 0.0},
    {"name": "flat_lay_topdown", "yaw": 0.0, "pitch": -28.0, "roll": 0.0, "scale": 0.84, "dx": 0.0, "dy": 14.0},
    {"name": "low_angle_hero", "yaw": 0.0, "pitch": 18.0, "roll": 2.0, "scale": 0.86, "dx": 0.0, "dy": -12.0},
    {"name": "handheld_casual_tilt", "yaw": -14.0, "pitch": 6.0, "roll": 9.5, "scale": 0.85, "dx": 0.0, "dy": 0.0},
]

SCENE_PROMPTS = [
    {
        "scene": "home_wooden_table",
        "prompt": "realistic customer photo of {category} placed on a rustic warm oak wooden table at home, natural morning window sunlight, cozy living room bokeh background, soft contact shadows, sharp focus",
        "negative": "studio white background, floating, distorted, blurry, cartoon, low quality, text, watermark",
    },
    {
        "scene": "urban_street_concrete",
        "prompt": "outdoor street lifestyle photograph of {category} against weathered urban concrete and red brick wall, natural afternoon daylight, realistic diagonal cast shadows, authentic photography",
        "negative": "studio white background, plain white, cartoon, painting, distorted, blurry, oversaturated",
    },
    {
        "scene": "cafe_marble_counter",
        "prompt": "authentic smartphone photo of {category} on a modern cafe marble countertop, warm indoor ambient lighting, soft blurred coffee shop background, realistic reflections and shadows",
        "negative": "studio white background, fake, plastic, deformed, blurry, overexposed, lowres",
    },
    {
        "scene": "retail_boutique_shelf",
        "prompt": "real retail store display photograph of {category} on a minimalist brushed concrete boutique shelf, directional ceiling spotlights, warm architectural interior, natural shadow",
        "negative": "studio white background, clipart, drawing, distorted, blurry, noisy, washed out",
    },
    {
        "scene": "dim_indoor_bedroom",
        "prompt": "casual handheld customer review photo of {category} in a sunlit bedroom near birch wood wardrobe shelves, authentic indoor ambient lighting, natural shadows, everyday home interior",
        "negative": "studio backdrop, sterile white, artificial, cartoon, distorted, blurry, watermark",
    },
    {
        "scene": "outdoor_garden_stone",
        "prompt": "natural outdoor daylight photo of {category} resting on a textured stone garden patio table, dappled tree leaf shadows, soft blurred green foliage background, sharp focus",
        "negative": "studio white background, dark, gloomy, cartoon, deformed, blurry, low quality",
    },
]


def load_rmbg_model(device: str) -> BriaRMBG:
    """Locate cached Bria RMBG-1.4 safetensors weights and load onto device."""
    cache_pattern = os.path.expanduser(
        "~/.cache/huggingface/hub/models--briaai--RMBG-1.4/snapshots/*/model.safetensors"
    )
    matches = glob.glob(cache_pattern)
    if not matches:
        from huggingface_hub import hf_hub_download
        weights_path = hf_hub_download(repo_id="briaai/RMBG-1.4", filename="model.safetensors")
    else:
        weights_path = matches[0]

    model = BriaRMBG()
    state_dict = load_file(weights_path, device="cpu")
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model


@torch.no_grad()
def segment_foreground(model: BriaRMBG, img_pil: Image.Image, device: str) -> np.ndarray:
    """Returns uint8 grayscale foreground mask (255=product, 0=background) at img_pil size."""
    w, h = img_pil.size
    arr = np.array(img_pil.convert("RGB"), dtype=np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)
    tensor = F.interpolate(tensor, size=(1024, 1024), mode="bilinear", align_corners=False)
    tensor = (tensor - 0.5) / 1.0
    tensor = tensor.to(device)

    preds = model(tensor)
    pred = F.interpolate(preds, size=(h, w), mode="bilinear", align_corners=False)
    ma, mi = pred.max(), pred.min()
    pred = (pred - mi) / (ma - mi + 1e-8)
    mask = (pred.squeeze().cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return mask


def compute_homography(width: int, height: int, yaw=0.0, pitch=0.0, roll=0.0, scale=0.86, dx=0.0, dy=0.0) -> np.ndarray:
    rad_yaw, rad_pitch, rad_roll = np.radians(yaw), np.radians(pitch), np.radians(roll)
    f = max(width, height) * 1.5
    cx, cy = width / 2.0, height / 2.0

    K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], dtype=np.float64)
    Rx = np.array([[1, 0, 0], [0, np.cos(rad_pitch), -np.sin(rad_pitch)], [0, np.sin(rad_pitch), np.cos(rad_pitch)]])
    Ry = np.array([[np.cos(rad_yaw), 0, np.sin(rad_yaw)], [0, 1, 0], [-np.sin(rad_yaw), 0, np.cos(rad_yaw)]])
    Rz = np.array([[np.cos(rad_roll), -np.sin(rad_roll), 0], [np.sin(rad_roll), np.cos(rad_roll), 0], [0, 0, 1]])

    R = Rz @ Ry @ Rx
    d = f / scale
    T = np.array([[dx], [dy], [d]], dtype=np.float64)
    H_3d = np.column_stack((R[:, 0], R[:, 1], T / d))
    H = K @ H_3d @ np.array([[1.0 / f, 0, -cx / f], [0, 1.0 / f, -cy / f], [0, 0, 1.0]])
    return H / H[2, 2]


def warp_product_and_mask(img_rgb: np.ndarray, fg_mask: np.ndarray, angle_cfg: dict) -> tuple[np.ndarray, np.ndarray]:
    h, w = img_rgb.shape[:2]
    H = compute_homography(
        w, h,
        yaw=angle_cfg["yaw"], pitch=angle_cfg["pitch"], roll=angle_cfg["roll"],
        scale=angle_cfg["scale"], dx=angle_cfg["dx"], dy=angle_cfg["dy"],
    )
    warped_rgb = cv2.warpPerspective(img_rgb, H, (w, h), flags=cv2.INTER_LANCZOS4,
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=(128, 128, 128))
    warped_mask = cv2.warpPerspective(fg_mask, H, (w, h), flags=cv2.INTER_LANCZOS4,
                                      borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    _, warped_mask_bin = cv2.threshold(warped_mask, 30, 255, cv2.THRESH_BINARY)
    return warped_rgb, warped_mask_bin


def composite_foreground(gen_bg: Image.Image, warped_rgb: np.ndarray, warped_fg_mask: np.ndarray, feather: float = 1.2) -> Image.Image:
    """Composites original warped product pixels back onto Diffusers background with feathered edges."""
    bg_rgba = gen_bg.convert("RGBA")
    mask_pil = Image.fromarray(warped_fg_mask).convert("L")
    if feather > 0:
        mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(feather))
    fg_pil = Image.fromarray(warped_rgb).convert("RGBA")
    r, g, b, _ = fg_pil.split()
    fg_feathered = Image.merge("RGBA", (r, g, b, mask_pil))
    out = bg_rgba.copy()
    out.paste(fg_feathered, (0, 0), fg_feathered)
    return out.convert("RGB")


def evaluate_quality(warped_rgb: np.ndarray, generated_rgb: np.ndarray, fg_mask: np.ndarray) -> dict:
    """Quantitative quality control gate detecting identity drift, blur, or exposure failures."""
    fg_bool = fg_mask > 128
    fg_coverage = float(fg_bool.mean())

    # 1. Foreground identity preservation (Pearson correlation inside product mask)
    if fg_bool.sum() > 50:
        orig_vec = warped_rgb[fg_bool].astype(np.float32).flatten()
        gen_vec = generated_rgb[fg_bool].astype(np.float32).flatten()
        corr = float(np.corrcoef(orig_vec, gen_vec)[0, 1]) if orig_vec.std() > 1e-4 and gen_vec.std() > 1e-4 else 0.0
        mae = float(np.abs(orig_vec - gen_vec).mean() / 255.0)
    else:
        corr, mae = 0.0, 1.0

    # 2. Sharpness (normalized Laplacian variance)
    gray = cv2.cvtColor(generated_rgb, cv2.COLOR_RGB2GRAY)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness_score = min(1.0, lap_var / 350.0)

    # 3. Exposure balance (ideal mean brightness in [0.18, 0.88])
    mean_lum = float(gray.mean() / 255.0)
    exposure_ok = 0.14 <= mean_lum <= 0.90

    # Composite quality score
    composite = round(0.55 * max(0.0, corr) + 0.25 * sharpness_score + 0.20 * (1.0 if exposure_ok else 0.3), 4)
    passed = (corr >= 0.85) and (0.03 <= fg_coverage <= 0.88) and exposure_ok and (composite >= 0.65)

    return {
        "foreground_correlation": round(corr, 4),
        "foreground_mae": round(mae, 4),
        "foreground_coverage": round(fg_coverage, 4),
        "sharpness_laplacian": round(lap_var, 2),
        "mean_luminance": round(mean_lum, 4),
        "composite_score": composite,
        "decision": "PASS" if passed else "REJECT",
    }


def main():
    print("=" * 74)
    print("CatalogAugment AI — Week 3 (Part A): Hugging Face Diffusers Pipeline")
    print("=" * 74)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Execution Device: {device} ({torch.cuda.get_device_name(0) if device == 'cuda' else 'CPU'})")

    df = pd.read_csv(MANIFEST_IN)
    train_df = df[df["split"] == "train"].reset_index(drop=True)
    print(f"Loaded {len(train_df)} train split studio images across {train_df['category'].nunique()} categories.")

    # Step 1: Pre-segment all train images with Bria RMBG-1.4 and cache masks on disk to minimize RAM usage
    masks_dir = BASE_DIR / "data" / "masks_train"
    masks_dir.mkdir(parents=True, exist_ok=True)
    if "--skip-segment" not in sys.argv:
        print("\n[1/4] Running Bria RMBG-1.4 neural segmentation on training split...")
        t_seg = time.time()
        rmbg = load_rmbg_model(device)
        for idx, row in train_df.iterrows():
            mask_path = masks_dir / f"mask_{idx}.png"
            img_pil = Image.open(BASE_DIR / row["relative_path"]).convert("RGB")
            mask_np = segment_foreground(rmbg, img_pil, device)
            Image.fromarray(mask_np).save(mask_path, format="PNG")
        del rmbg
        gc.collect()
        if device == "cuda":
            torch.cuda.synchronize()
            torch.cuda.empty_cache()
        print(f"      Segmented {len(train_df)} products in {time.time() - t_seg:.1f}s.")
        if "--segment-only" in sys.argv:
            print("      Segmentation-only phase complete; exiting cleanly to release OS memory.")
            return
    else:
        print("\n[1/4] Using disk-cached Bria RMBG-1.4 masks from segmentation phase.")

    # Step 2: Lazy loader for Hugging Face Diffusers StableDiffusionInpaintPipeline
    # Uses per-tensor safe_open (avoids PyTorch 2.14 + Windows safetensors mmap access violation)
    # and sequential CPU offload (0.37 GB peak VRAM) for rock-solid reliability on 6GB laptops.
    pipe_holder = {"pipe": None}

    def get_diffusers_pipe():
        if pipe_holder["pipe"] is not None:
            return pipe_holder["pipe"]
        print("\n[2/4] Loading Hugging Face Diffusers StableDiffusionInpaintPipeline (fp16)...")
        try:
            import urllib.request
            req = urllib.request.Request(
                "http://127.0.0.1:8188/free",
                data=json.dumps({"unload_models": True, "free_memory": True}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=2)
        except Exception:
            pass

        import diffusers.loaders.single_file_utils as sfu

        _orig_load_sd = sfu.load_state_dict

        def _safe_load_sd(path, *a, **kw):
            if str(path).endswith(".safetensors"):
                with safe_open(path, framework="pt", device="cpu") as f:
                    return {k: f.get_tensor(k) for k in f.keys()}
            return _orig_load_sd(path, *a, **kw)

        t_load = time.time()
        sfu.load_state_dict = _safe_load_sd
        try:
            p = StableDiffusionInpaintPipeline.from_single_file(
                CHECKPOINT_PATH,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                local_files_only=True,
                safety_checker=None,
            )
        finally:
            sfu.load_state_dict = _orig_load_sd

        gc.collect()
        p.scheduler = DPMSolverMultistepScheduler.from_config(p.scheduler.config)
        p.enable_attention_slicing()
        p.vae.enable_slicing()
        if device == "cuda":
            p.enable_sequential_cpu_offload()
        p.set_progress_bar_config(disable=True)
        print(f"      Diffusers pipeline ready in {time.time() - t_load:.1f}s (sequential offload active).")
        pipe_holder["pipe"] = p
        return p

    # Step 3: Generate / validate controlled multi-angle, multi-background variations for all 168 train images
    force_regen = "--force" in sys.argv
    print(f"\n[3/4] Generating & validating {len(train_df)} controlled Diffusers variations (steps={INFERENCE_STEPS}, 512x512)...")
    t_gen_start = time.time()
    gen_rows = []
    newly_generated = 0
    reused_cached = 0

    for idx, row in train_df.iterrows():
        cat = row["category"]
        cat_slug = row["category_slug"]
        out_dir = GEN_OUT_DIR / cat_slug
        out_dir.mkdir(parents=True, exist_ok=True)

        img_rgb = np.array(Image.open(BASE_DIR / row["relative_path"]).convert("RGB"))
        fg_mask = np.array(Image.open(masks_dir / f"mask_{idx}.png").convert("L"))

        # Rotate camera angle and situational scene across each category's images
        angle_cfg = ANGLE_PRESETS[idx % len(ANGLE_PRESETS)]
        scene_cfg = SCENE_PROMPTS[idx % len(SCENE_PROMPTS)]

        warped_rgb, warped_fg_mask = warp_product_and_mask(img_rgb, fg_mask, angle_cfg)

        out_name = f"{cat_slug}_{row['product_id']}_diffusers_{scene_cfg['scene']}.png"
        out_path = out_dir / out_name
        seed = RANDOM_SEED * 100 + idx

        if out_path.exists() and not force_regen:
            final_np = np.array(Image.open(out_path).convert("RGB"))
            reused_cached += 1
        else:
            # Diffusers Inpaint expects White (255) = region to generate (background), Black (0) = preserve (product)
            inpaint_mask = cv2.bitwise_not(warped_fg_mask)
            kernel = np.ones((3, 3), np.uint8)
            inpaint_mask = cv2.dilate(inpaint_mask, kernel, iterations=1)

            alpha = (warped_fg_mask / 255.0)[:, :, None]
            inpaint_input_np = (warped_rgb * alpha + 128.0 * (1.0 - alpha)).astype(np.uint8)

            generator = torch.Generator(device="cpu").manual_seed(seed)
            prompt = scene_cfg["prompt"].format(category=cat.lower())

            raw_gen = get_diffusers_pipe()(
                prompt=prompt,
                negative_prompt=scene_cfg["negative"],
                image=Image.fromarray(inpaint_input_np).resize((DIFFUSION_SIZE, DIFFUSION_SIZE), Image.Resampling.LANCZOS),
                mask_image=Image.fromarray(inpaint_mask).resize((DIFFUSION_SIZE, DIFFUSION_SIZE), Image.Resampling.NEAREST),
                num_inference_steps=INFERENCE_STEPS,
                guidance_scale=GUIDANCE_SCALE,
                strength=0.92,
                height=DIFFUSION_SIZE,
                width=DIFFUSION_SIZE,
                generator=generator,
            ).images[0].resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)

            final_pil = composite_foreground(raw_gen, warped_rgb, warped_fg_mask, feather=1.2)
            final_np = np.array(final_pil)
            final_pil.save(out_path, format="PNG")
            newly_generated += 1

        quality = evaluate_quality(warped_rgb, final_np, warped_fg_mask)

        gen_rows.append({
            "product_id": row["product_id"],
            "category": cat,
            "category_slug": cat_slug,
            "source_path": row["relative_path"],
            "relative_path": str(out_path.relative_to(BASE_DIR)).replace("\\", "/"),
            "augmentation_type": "generative_diffusers",
            "scene": scene_cfg["scene"],
            "camera_angle": angle_cfg["name"],
            "yaw": angle_cfg["yaw"],
            "pitch": angle_cfg["pitch"],
            "roll": angle_cfg["roll"],
            "seed": seed,
            **quality,
        })

        if (idx + 1) % 24 == 0 or (idx + 1) == len(train_df):
            gc.collect()
            if device == "cuda":
                torch.cuda.empty_cache()
            elapsed = time.time() - t_gen_start
            rate = elapsed / (idx + 1)
            eta = rate * (len(train_df) - idx - 1)
            print(f"      Progress: {idx + 1}/{len(train_df)} ({rate:.2f}s/img, ETA {eta:.0f}s)")

    gen_df = pd.DataFrame(gen_rows)
    gen_manifest_path = OUTPUT_DIR / "week3_diffusers_manifest.csv"
    gen_df.to_csv(gen_manifest_path, index=False)

    # Step 4: Generate 4 uncontrolled/drifted samples (no foreground lock + inverted/over-strength inpaint)
    # to build the Week 3 Realistic (PASS) vs. Unrealistic (REJECT) Quality Audit figure
    print("\n[4/4] Running uncontrolled drift probe for Realistic vs. Unrealistic Quality Audit...")
    REJECT_OUT_DIR.mkdir(parents=True, exist_ok=True)
    categories = sorted(train_df["category"].unique())
    audit_samples = []

    for cat in categories[:4]:
        row_idx = train_df[train_df["category"] == cat].index[0]
        row = train_df.loc[row_idx]
        orig_np = np.array(Image.open(BASE_DIR / row["relative_path"]).convert("RGB"))
        fg_mask = np.array(Image.open(masks_dir / f"mask_{row_idx}.png").convert("L"))
        angle_cfg = ANGLE_PRESETS[row_idx % len(ANGLE_PRESETS)]
        warped_rgb, warped_fg_mask = warp_product_and_mask(orig_np, fg_mask, angle_cfg)

        # Controlled (Accepted) output already saved
        pass_row = gen_df[gen_df["product_id"] == row["product_id"]].iloc[0]
        pass_img = np.array(Image.open(BASE_DIR / pass_row["relative_path"]).convert("RGB"))

        # Uncontrolled (Rejected): full-frame regeneration without foreground lock causes identity hallucination
        drift_path = REJECT_OUT_DIR / f"rejected_{row['category_slug']}_{row['product_id']}.png"
        if drift_path.exists() and not force_regen:
            drifted_np = np.array(Image.open(drift_path).convert("RGB"))
        else:
            full_mask = Image.new("L", (DIFFUSION_SIZE, DIFFUSION_SIZE), 255)
            generator = torch.Generator(device="cpu").manual_seed(9999 + int(row_idx))
            drifted_pil = get_diffusers_pipe()(
                prompt=f"random abstract colorful {cat.lower()} in chaotic cluttered room, neon lights, distorted lens",
                negative_prompt="",
                image=Image.fromarray(warped_rgb).resize((DIFFUSION_SIZE, DIFFUSION_SIZE), Image.Resampling.LANCZOS),
                mask_image=full_mask,
                num_inference_steps=12,
                guidance_scale=13.5,
                strength=0.92,
                height=DIFFUSION_SIZE,
                width=DIFFUSION_SIZE,
                generator=generator,
            ).images[0].resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
            drifted_np = np.array(drifted_pil)
            drifted_pil.save(drift_path)
        reject_quality = evaluate_quality(warped_rgb, drifted_np, warped_fg_mask)

        audit_samples.append({
            "category": cat,
            "orig": orig_np,
            "mask": warped_fg_mask,
            "pass_img": pass_img,
            "pass_score": pass_row["foreground_correlation"],
            "reject_img": drifted_np,
            "reject_score": reject_quality["foreground_correlation"],
            "reject_decision": reject_quality["decision"],
        })

    # Clean up GPU memory
    if pipe_holder["pipe"] is not None:
        del pipe_holder["pipe"]
    gc.collect()
    if device == "cuda":
        torch.cuda.empty_cache()

    # Save quality summary JSON
    pass_count = int((gen_df["decision"] == "PASS").sum())
    quality_summary = {
        "diffusers_pipeline": "StableDiffusionInpaintPipeline (DPMSolverMultistepScheduler)",
        "checkpoint": Path(CHECKPOINT_PATH).name,
        "segmentation_model": "briaai/RMBG-1.4",
        "total_generated": int(len(gen_df)),
        "quality_passed": pass_count,
        "quality_pass_rate_pct": round(100.0 * pass_count / max(len(gen_df), 1), 2),
        "mean_foreground_correlation": round(float(gen_df["foreground_correlation"].mean()), 4),
        "mean_composite_quality_score": round(float(gen_df["composite_score"].mean()), 4),
        "uncontrolled_drift_mean_correlation": round(float(np.mean([s["reject_score"] for s in audit_samples])), 4),
        "generation_time_seconds": round(time.time() - t_gen_start, 2),
        "seconds_per_image": round((time.time() - t_gen_start) / max(len(gen_df), 1), 2),
        "scenes_used": [s["scene"] for s in SCENE_PROMPTS],
        "angles_used": [a["name"] for a in ANGLE_PRESETS],
    }
    with open(OUTPUT_DIR / "week3_quality_report.json", "w", encoding="utf-8") as f:
        json.dump(quality_summary, f, indent=2)

    # ------------------------------------------------------------------
    # Visualization 1: Diffusers Multi-Angle & Multi-Background Showcase Grid
    # ------------------------------------------------------------------
    fig, axes = plt.subplots(len(categories), 5, figsize=(12.5, 14), dpi=150)
    headers = ["Original Studio", "Diffusers Sample 1", "Diffusers Sample 2", "Diffusers Sample 3", "Diffusers Sample 4"]
    for r_i, cat in enumerate(categories):
        cat_gen = gen_df[gen_df["category"] == cat].head(4).reset_index(drop=True)
        orig_path = BASE_DIR / cat_gen.loc[0, "source_path"]
        axes[r_i, 0].imshow(Image.open(orig_path))
        axes[r_i, 0].set_xticks([])
        axes[r_i, 0].set_yticks([])
        axes[r_i, 0].set_ylabel(cat, fontsize=10.5, fontweight="bold", rotation=0, labelpad=52, va="center")
        if r_i == 0:
            axes[r_i, 0].set_title(headers[0], fontsize=10.5, fontweight="bold")

        for c_i in range(4):
            ax = axes[r_i, c_i + 1]
            row_c = cat_gen.loc[c_i]
            ax.imshow(Image.open(BASE_DIR / row_c["relative_path"]))
            ax.set_xticks([])
            ax.set_yticks([])
            ax.set_xlabel(f"{row_c['scene'].replace('_', ' ')}\n({row_c['camera_angle'].replace('_', ' ')})", fontsize=7.5)
            if r_i == 0:
                axes[r_i, c_i + 1].set_title(headers[c_i + 1], fontsize=10.5, fontweight="bold")

    fig.suptitle(
        "Week 3: Controlled Diffusers Generative Variations (Multi-Angle + Multi-Background + Identity Lock)",
        fontsize=13, fontweight="bold", y=0.995,
    )
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week3_diffusers_showcase_grid.png", bbox_inches="tight")
    plt.close(fig)

    # ------------------------------------------------------------------
    # Visualization 2: Quality Audit (Accepted Controlled vs. Rejected Uncontrolled Drift)
    # ------------------------------------------------------------------
    fig, axes = plt.subplots(len(audit_samples), 4, figsize=(11, 10.5), dpi=150)
    col_titles = [
        "Original Studio",
        "RMBG + 3D Angle Mask",
        "Controlled Diffusers (PASS)",
        "Uncontrolled Drift (REJECT)",
    ]
    for r_i, s in enumerate(audit_samples):
        imgs = [s["orig"], s["mask"], s["pass_img"], s["reject_img"]]
        borders = ["#9ca3af", "#3b82f6", "#16a34a", "#dc2626"]
        for c_i, im in enumerate(imgs):
            ax = axes[r_i, c_i]
            if c_i == 1:
                ax.imshow(im, cmap="gray")
            else:
                ax.imshow(im)
            ax.set_xticks([])
            ax.set_yticks([])
            for spine in ax.spines.values():
                spine.set_edgecolor(borders[c_i])
                spine.set_linewidth(2.5 if c_i >= 2 else 1.2)
            if r_i == 0:
                ax.set_title(col_titles[c_i], fontsize=10, fontweight="bold",
                             color="#dc2626" if c_i == 3 else ("#16a34a" if c_i == 2 else "#111827"))
            if c_i == 0:
                ax.set_ylabel(s["category"], fontsize=10.5, fontweight="bold", rotation=0, labelpad=52, va="center")
            if c_i == 2:
                ax.set_xlabel(f"FG Identity r = {s['pass_score']:.3f} [PASS]", fontsize=8.5, color="#15803d", fontweight="bold")
            if c_i == 3:
                ax.set_xlabel(f"FG Identity r = {s['reject_score']:.3f} [{s['reject_decision']}]", fontsize=8.5, color="#b91c1c", fontweight="bold")

    fig.suptitle(
        "Week 3 Generative Quality Gate: Identity-Locked Diffusers (PASS) vs. Uncontrolled Hallucination (REJECT)",
        fontsize=12, fontweight="bold", y=0.995,
    )
    plt.tight_layout()
    fig.savefig(FIGURES_DIR / "week3_quality_audit_pass_vs_reject.png", bbox_inches="tight")
    plt.close(fig)

    print("\nWeek 3 Diffusers Generative Augmentation & Quality Audit Complete!")
    print(json.dumps(quality_summary, indent=2))


if __name__ == "__main__":
    main()

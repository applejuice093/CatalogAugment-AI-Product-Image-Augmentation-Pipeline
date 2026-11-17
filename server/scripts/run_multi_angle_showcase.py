#!/usr/bin/env python3
"""
Full Multi-Angle, Multi-Background, Multi-Situation Augmentation Runner
Generates diverse real-world perspectives and situational contexts for the product shirt:
1. 3/4 Isometric Perspective Angle (Urban Streetwear Brick & Steel)
2. Overhead Top-Down Flat-Lay Angle (Artisan Oak Tabletop with Lifestyle Items)
3. Low-Angle Heroic Upward Perspective (Minimalist Luxury Boutique Display)
4. Casual Handheld Smartphone Tilt (Sunlit Bedroom Wardrobe Closet)
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from PIL import Image, ImageFilter
import cv2
import numpy as np

COMFYUI_HOST = "http://127.0.0.1:8188"
INPUT_SHIRT = "data/showcase/shirt/01_original_shirt.png"
INPUT_MASK = "data/showcase/shirt/02_precision_mask.png"
OUTPUT_DIR = "data/showcase/shirt/angles"
ARTIFACT_DIR = "C:/Users/anike/.gemini/antigravity/brain/b9573d45-5fe4-4832-b471-a1e40bc07150/pipeline_showcase/shirt/angles"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

SCENARIOS = [
    {
        "id": "01_three_quarter_urban_streetwear",
        "title": "3/4 Isometric Perspective Angle (Urban Streetwear)",
        "angle_params": {"yaw": 24.0, "pitch": 0.0, "roll": -3.0, "scale": 0.86, "dx": 0.0, "dy": 0.0},
        "prompt": "three-quarter perspective angle view of dark navy button-down shirt hanging outdoors, weathered textured red brick and industrial steel architectural wall, sharp diagonal afternoon sunlight, realistic cast shadows on wall, high-end urban streetwear advertising catalog, 8k professional photography, hyperdetailed",
        "negative_prompt": "flat frontal, distorted, blurry, oversaturated, deformed garment, low resolution, plastic, cartoon",
        "denoise": 0.88,
        "cfg": 7.2,
        "steps": 25,
        "seed": 40101,
    },
    {
        "id": "02_flatlay_rustic_oak_tabletop",
        "title": "Top-Down Flat-Lay Angle (Artisan Oak Tabletop)",
        "angle_params": {"yaw": 0.0, "pitch": -36.0, "roll": 0.0, "scale": 0.82, "dx": 0.0, "dy": 25.0},
        "prompt": "top-down overhead flat-lay photography of navy blue button-down shirt neatly arranged on rustic dark oak wood tabletop, styled with vintage glasses, leather journal, brass watch, warm diffused morning window lighting, lifestyle editorial magazine photography, 8k crisp focus",
        "negative_prompt": "vertical hanging, wall, blurry, noisy, low quality, warped furniture, fake, oversaturated",
        "denoise": 0.88,
        "cfg": 7.0,
        "steps": 25,
        "seed": 40202,
    },
    {
        "id": "03_low_angle_luxury_boutique",
        "title": "Low-Angle Heroic Perspective (Flagship Boutique)",
        "angle_params": {"yaw": 0.0, "pitch": 22.0, "roll": 2.0, "scale": 0.86, "dx": 0.0, "dy": -20.0},
        "prompt": "low-angle dramatic perspective looking up at dark navy button-down shirt displayed in luxury minimalist clothing showroom, brushed microcement wall, subtle floor reflection, warm directional ceiling spotlights, architectural shadows, editorial lookbook aesthetic, 8k commercial photography",
        "negative_prompt": "table, downward view, cluttered, cartoon, blurry, pixelated, washed out, low contrast",
        "denoise": 0.88,
        "cfg": 7.5,
        "steps": 25,
        "seed": 40303,
    },
    {
        "id": "04_handheld_bedroom_wardrobe",
        "title": "Handheld Smartphone Angle (Sunlit Bedroom Closet)",
        "angle_params": {"yaw": -14.0, "pitch": 8.0, "roll": 11.0, "scale": 0.85, "dx": 0.0, "dy": 0.0},
        "prompt": "realistic handheld customer smartphone photograph of dark navy shirt hanging in modern sunlit bedroom wardrobe closet, natural morning sunlight through sheer curtains, clean birch wood shelves, authentic customer review photo aesthetic, high detail, sharp focus",
        "negative_prompt": "studio pedestal, commercial studio, plastic, distorted, oversaturated, blurry, dark",
        "denoise": 0.86,
        "cfg": 7.0,
        "steps": 25,
        "seed": 40404,
    }
]

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

def warp_asset(image_path, mask_path, params):
    img_pil = Image.open(image_path).convert("RGBA")
    w, h = img_pil.size
    mask_pil = Image.open(mask_path).convert("L")
    if mask_pil.size != (w, h):
        mask_pil = mask_pil.resize((w, h), Image.Resampling.BILINEAR)

    img_np = np.array(img_pil)
    mask_np = np.array(mask_pil)

    cutout_np = np.dstack((img_np[:, :, :3], mask_np))

    H = get_homography_matrix(
        w, h,
        yaw=params["yaw"],
        pitch=params["pitch"],
        roll=params["roll"],
        scale=params["scale"],
        dx=params["dx"],
        dy=params["dy"]
    )

    warped_cutout = cv2.warpPerspective(
        cutout_np, H, (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0)
    )

    warped_mask = cv2.warpPerspective(
        mask_np, H, (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0
    )

    _, warped_mask_thresh = cv2.threshold(warped_mask, 15, 255, cv2.THRESH_BINARY)
    warped_mask_clean = cv2.GaussianBlur(warped_mask_thresh, (3, 3), 0)

    # Inpaint input RGB: blend onto subtle neutral tone
    warped_rgb = warped_cutout[:, :, :3].copy()
    alpha = warped_cutout[:, :, 3] / 255.0
    for c in range(3):
        warped_rgb[:, :, c] = (warped_rgb[:, :, c] * alpha + 128 * (1.0 - alpha)).astype(np.uint8)

    return warped_cutout, warped_mask_clean, warped_rgb

def upload_to_comfy(img_bytes, filename):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    data = []
    data.append(f"--{boundary}".encode())
    data.append(f'Content-Disposition: form-data; name="image"; filename="{filename}"'.encode())
    data.append(b"Content-Type: image/png")
    data.append(b"")
    data.append(img_bytes)
    data.append(f"--{boundary}--".encode())
    data.append(b"")

    body = b"\r\n".join(data)
    req = urllib.request.Request(
        f"{COMFYUI_HOST}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def queue_prompt(prompt_graph):
    req_body = json.dumps({"prompt": prompt_graph}).encode()
    req = urllib.request.Request(
        f"{COMFYUI_HOST}/prompt",
        data=req_body,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get_history(prompt_id):
    req = urllib.request.Request(f"{COMFYUI_HOST}/history/{prompt_id}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def download_image(filename, subfolder="", folder_type="output"):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": folder_type})
    with urllib.request.urlopen(f"{COMFYUI_HOST}/view?{params}") as resp:
        return resp.read()

def composite_foreground(generated_bg_bytes, warped_cutout_np, warped_mask_np, feather_radius=1.5):
    # Load background
    bg_img = Image.open(io.BytesIO(generated_bg_bytes) if isinstance(generated_bg_bytes, bytes) else generated_bg_bytes).convert("RGBA")
    w, h = bg_img.size

    # Prepare feathered alpha mask
    mask_pil = Image.fromarray(warped_mask_np).convert("L")
    if feather_radius > 0:
        mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(feather_radius))

    # Cutout
    cutout_pil = Image.fromarray(warped_cutout_np)
    # Replace cutout alpha with feathered mask
    r, g, b, _ = cutout_pil.split()
    cutout_feathered = Image.merge("RGBA", (r, g, b, mask_pil))

    # Composite
    final_img = bg_img.copy()
    final_img.paste(cutout_feathered, (0, 0), cutout_feathered)
    return final_img

import io

def run():
    print(f"============================================================")
    print(f"CatalogAugment: Multi-Angle, Background & Situation Pipeline")
    print(f"============================================================")

    results = []

    for idx, scenario in enumerate(SCENARIOS, 1):
        s_id = scenario["id"]
        title = scenario["title"]
        params = scenario["angle_params"]
        print(f"\n[{idx}/4] Processing: {title}")
        print(f"      Yaw: {params['yaw']}°, Pitch: {params['pitch']}°, Roll: {params['roll']}°, Scale: {params['scale']}")

        # 1. Perspective Transformation
        warped_cutout, warped_mask, warped_rgb = warp_asset(INPUT_SHIRT, INPUT_MASK, params)

        # Save perspective intermediate
        cutout_path = os.path.join(OUTPUT_DIR, f"{s_id}_cutout.png")
        mask_path = os.path.join(OUTPUT_DIR, f"{s_id}_mask.png")
        rgb_path = os.path.join(OUTPUT_DIR, f"{s_id}_rgb.png")
        Image.fromarray(warped_cutout).save(cutout_path)
        Image.fromarray(warped_mask).save(mask_path)
        Image.fromarray(warped_rgb).save(rgb_path)

        # Encode to bytes for upload
        rgb_bytes_io = io.BytesIO()
        Image.fromarray(warped_rgb).save(rgb_bytes_io, format="PNG")
        rgb_bytes = rgb_bytes_io.getvalue()

        mask_bytes_io = io.BytesIO()
        Image.fromarray(warped_mask).save(mask_bytes_io, format="PNG")
        mask_bytes = mask_bytes_io.getvalue()

        # 2. Upload to ComfyUI
        ts = int(time.time() * 1000)
        comfy_input = f"shirt_angle_{s_id}_{ts}.png"
        comfy_mask = f"mask_angle_{s_id}_{ts}.png"
        upload_to_comfy(rgb_bytes, comfy_input)
        upload_to_comfy(mask_bytes, comfy_mask)

        # 3. Build Prompt Graph for Inpainting
        prompt_graph = {
            "1": {
                "inputs": {"ckpt_name": "Realistic_Vision_V6.0_NV_B1_inpainting_fp16.safetensors"},
                "class_type": "CheckpointLoaderSimple",
                "_meta": {"title": "Load Checkpoint"}
            },
            "2": {
                "inputs": {"image": comfy_input, "upload": "image"},
                "class_type": "LoadImage",
                "_meta": {"title": "Load Warped Product"}
            },
            "3": {
                "inputs": {"image": comfy_mask, "channel": "red", "upload": "image"},
                "class_type": "LoadImageMask",
                "_meta": {"title": "Load Warped Mask"}
            },
            "4": {
                "inputs": {"mask": ["3", 0]},
                "class_type": "InvertMask",
                "_meta": {"title": "Invert Mask (Background Area)"}
            },
            "5": {
                "inputs": {"text": scenario["prompt"], "clip": ["1", 1]},
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Positive Prompt"}
            },
            "6": {
                "inputs": {"text": scenario["negative_prompt"], "clip": ["1", 1]},
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Negative Prompt"}
            },
            "7": {
                "inputs": {"pixels": ["2", 0], "vae": ["1", 2], "mask": ["4", 0], "grow_mask_by": 6},
                "class_type": "VAEEncodeForInpaint",
                "_meta": {"title": "Encode For Inpaint"}
            },
            "8": {
                "inputs": {
                    "seed": scenario["seed"],
                    "steps": scenario["steps"],
                    "cfg": scenario["cfg"],
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": scenario["denoise"],
                    "model": ["1", 0],
                    "positive": ["5", 0],
                    "negative": ["6", 0],
                    "latent_image": ["7", 0]
                },
                "class_type": "KSampler",
                "_meta": {"title": "KSampler"}
            },
            "9": {
                "inputs": {"samples": ["8", 0], "vae": ["1", 2]},
                "class_type": "VAEDecode",
                "_meta": {"title": "VAE Decode"}
            },
            "10": {
                "inputs": {"filename_prefix": f"CatalogAugment_Angle_{s_id}", "images": ["9", 0]},
                "class_type": "SaveImage",
                "_meta": {"title": "Save Output"}
            }
        }

        # 4. Queue and wait
        t0 = time.time()
        q_res = queue_prompt(prompt_graph)
        p_id = q_res["prompt_id"]
        print(f"      Queued prompt {p_id}, generating background & perspective shadows...")

        # Poll history
        completed = False
        out_filename = None
        for _ in range(60):
            time.sleep(1.0)
            hist = get_history(p_id)
            if p_id in hist:
                status = hist[p_id].get("status", {})
                if status.get("completed", False):
                    outputs = hist[p_id].get("outputs", {})
                    if "10" in outputs and "images" in outputs["10"]:
                        out_filename = outputs["10"]["images"][0]["filename"]
                        completed = True
                        break

        if not completed or not out_filename:
            print(f"      [ERROR] Generation timed out or failed for {s_id}")
            continue

        gen_time = time.time() - t0
        print(f"      Generated background in {gen_time:.2f}s: {out_filename}")

        # 5. Download and Composite
        raw_bg_bytes = download_image(out_filename)
        final_img = composite_foreground(raw_bg_bytes, warped_cutout, warped_mask, feather_radius=1.5)

        # 6. Save final artifacts
        final_filename = f"final_{s_id}.png"
        raw_filename = f"raw_{s_id}.png"

        local_final_path = os.path.join(OUTPUT_DIR, final_filename)
        local_raw_path = os.path.join(OUTPUT_DIR, raw_filename)
        artifact_final_path = os.path.join(ARTIFACT_DIR, final_filename)
        artifact_raw_path = os.path.join(ARTIFACT_DIR, raw_filename)

        final_img.save(local_final_path)
        final_img.save(artifact_final_path)

        with open(local_raw_path, "wb") as f:
            f.write(raw_bg_bytes)
        with open(artifact_raw_path, "wb") as f:
            f.write(raw_bg_bytes)

        # Also copy warped inputs to artifact dir
        Image.fromarray(warped_cutout).save(os.path.join(ARTIFACT_DIR, f"{s_id}_cutout.png"))
        Image.fromarray(warped_mask).save(os.path.join(ARTIFACT_DIR, f"{s_id}_mask.png"))

        print(f"      [SUCCESS] Saved final composite: {local_final_path}")
        results.append({
            "scenario": scenario,
            "gen_time": round(gen_time, 2),
            "final_path": local_final_path,
            "artifact_path": artifact_final_path
        })

    print(f"\n============================================================")
    print(f"Multi-Angle Generation Finished: {len(results)}/4 variations completed successfully!")
    print(f"============================================================")

if __name__ == "__main__":
    run()

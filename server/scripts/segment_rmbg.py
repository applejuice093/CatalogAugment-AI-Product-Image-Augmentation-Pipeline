import argparse
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

import torch
import torchvision.transforms.functional as TF
import torch.nn.functional as F
from PIL import Image
import numpy as np
import safetensors.torch
from rmbg_model import BriaRMBG

def run_segmentation(input_path: str, mask_out_path: str, foreground_out_path: str | None = None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading RMBG-1.4 on {device}...")
    
    net = BriaRMBG()
    weights_path = os.path.expanduser("~/.cache/huggingface/hub/models--briaai--RMBG-1.4/snapshots/2ceba5a5efaec153162aedea169f76caf9b46cf8/model.safetensors")
    
    if not os.path.exists(weights_path):
        # Fallback to checking local model directory
        weights_path = os.path.abspath("server/models/rmbg-1.4/model.safetensors")

    state_dict = safetensors.torch.load_file(weights_path)
    net.load_state_dict(state_dict)
    net.to(device)
    net.eval()

    orig_image = Image.open(input_path).convert("RGB")
    w, h = orig_image.size

    # Preprocess (1024x1024 normalized)
    model_input_size = [1024, 1024]
    resized_im = orig_image.resize(model_input_size, Image.BILINEAR)
    im_np = np.array(resized_im, dtype=np.float32) / 255.0
    im_np = (im_np - 0.5) / 1.0  # normalize
    im_tensor = torch.tensor(im_np, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0).to(device)

    print("Running precision segmentation inference...")
    with torch.no_grad():
        pred = net(im_tensor)

    # Post-process back to original resolution
    # pred shape is [1, 1, 1024, 1024]
    pred_mask = F.interpolate(pred, size=(h, w), mode="bilinear").squeeze()
    ma = torch.max(pred_mask)
    mi = torch.min(pred_mask)
    pred_mask = (pred_mask - mi) / (ma - mi + 1e-8)
    
    mask_np = (pred_mask.cpu().numpy() * 255.0).astype(np.uint8)
    pil_mask = Image.fromarray(mask_np, mode="L")

    os.makedirs(os.path.dirname(os.path.abspath(mask_out_path)), exist_ok=True)
    pil_mask.save(mask_out_path)
    print(f"Saved mask to: {mask_out_path}")

    if foreground_out_path:
        os.makedirs(os.path.dirname(os.path.abspath(foreground_out_path)), exist_ok=True)
        cutout = orig_image.copy().convert("RGBA")
        cutout.putalpha(pil_mask)
        cutout.save(foreground_out_path)
        print(f"Saved foreground cutout to: {foreground_out_path}")

    # Stats
    white_px = np.sum(mask_np >= 128)
    total_px = mask_np.size
    pct = (white_px * 100.0 / total_px)
    print(f"Segmentation stats: Foreground covers {pct:.1f}% of image")
    print("SUCCESS")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RMBG-1.4 Precision Product Segmentation")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--mask-out", required=True, help="Output mask PNG file path")
    parser.add_argument("--foreground-out", default=None, help="Output cutout PNG file path")
    args = parser.parse_args()

    run_segmentation(args.input, args.mask_out, args.foreground_out)

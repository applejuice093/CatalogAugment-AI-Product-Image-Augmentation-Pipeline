#!/usr/bin/env python3
"""
Backend Bridge: PyTorch ResNet-18 Visual-Search Embedding Extractor
Returns a 512-dim (or fine-tuned 256-dim) L2-normalized embedding vector as JSON.
"""

import argparse
import json
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms


class FineTunedEmbedder(nn.Module):
    def __init__(self, num_classes: int = 6, embedding_dim: int = 256):
        super().__init__()
        backbone = models.resnet18(weights=None)
        in_features = backbone.fc.in_features
        backbone.fc = nn.Identity()
        self.backbone = backbone
        self.embed_head = nn.Sequential(
            nn.Linear(in_features, embedding_dim),
            nn.BatchNorm1d(embedding_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(0.25),
        )
        self.classifier = nn.Linear(embedding_dim, num_classes)

    def forward(self, x):
        emb = self.embed_head(self.backbone(x))
        return F.normalize(emb, p=2, dim=1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to image file")
    parser.add_argument(
        "--checkpoint",
        default=str(Path(__file__).resolve().parent.parent.parent / "ml_pipeline" / "outputs" / "models" / "resnet18_exp_d_combined.pt"),
        help="Optional fine-tuned CatalogAugment PyTorch checkpoint",
    )
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    img = Image.open(args.input).convert("RGB")
    tensor = tf(img).unsqueeze(0).to(device)

    ckpt_path = Path(args.checkpoint)
    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
        num_classes = len(ckpt.get("class_to_idx", {})) or 6
        model = FineTunedEmbedder(num_classes=num_classes, embedding_dim=256).to(device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        with torch.no_grad():
            vec = model(tensor).squeeze(0).cpu().tolist()
        model_name = "pytorch-resnet18-catalogaugment-256"
    else:
        backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        backbone.fc = nn.Identity()
        backbone = backbone.to(device).eval()
        with torch.no_grad():
            vec = F.normalize(backbone(tensor), p=2, dim=1).squeeze(0).cpu().tolist()
        model_name = "pytorch-resnet18-imagenet-512"

    print(json.dumps({
        "model": model_name,
        "dimension": len(vec),
        "embedding": [round(float(v), 6) for v in vec],
    }))


if __name__ == "__main__":
    main()

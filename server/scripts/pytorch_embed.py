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
    parser.add_argument("--input", help="Path to single image file")
    parser.add_argument("--inputs-json", help="Path to JSON file containing an array of image paths for batch embedding")
    parser.add_argument(
        "--checkpoint",
        default=str(Path(__file__).resolve().parent.parent.parent / "ml_pipeline" / "outputs" / "models" / "resnet18_exp_d_combined.pt"),
        help="Optional fine-tuned CatalogAugment PyTorch checkpoint",
    )
    args = parser.parse_args()

    if not args.input and not args.inputs_json:
        parser.error("Either --input or --inputs-json is required")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    ckpt_path = Path(args.checkpoint)
    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
        num_classes = len(ckpt.get("class_to_idx", {})) or 6
        model = FineTunedEmbedder(num_classes=num_classes, embedding_dim=256).to(device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()
        model_name = "pytorch-resnet18-catalogaugment-256"
        dim = 256

        def infer_batch(batch_tensor):
            with torch.no_grad():
                return model(batch_tensor).cpu().tolist()
    else:
        backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        backbone.fc = nn.Identity()
        backbone = backbone.to(device).eval()
        model_name = "pytorch-resnet18-imagenet-512"
        dim = 512

        def infer_batch(batch_tensor):
            with torch.no_grad():
                return F.normalize(backbone(batch_tensor), p=2, dim=1).cpu().tolist()

    if args.inputs_json:
        paths = json.loads(Path(args.inputs_json).read_text(encoding="utf-8"))
        embeddings = {}
        batch_tensors = []
        batch_paths = []
        batch_size = 32

        for p in paths:
            try:
                img = Image.open(p).convert("RGB")
                batch_tensors.append(tf(img))
                batch_paths.append(p)
            except Exception:
                continue

            if len(batch_tensors) >= batch_size:
                vecs = infer_batch(torch.stack(batch_tensors).to(device))
                for bp, v in zip(batch_paths, vecs):
                    embeddings[bp] = [round(float(x), 6) for x in v]
                batch_tensors.clear()
                batch_paths.clear()

        if batch_tensors:
            vecs = infer_batch(torch.stack(batch_tensors).to(device))
            for bp, v in zip(batch_paths, vecs):
                embeddings[bp] = [round(float(x), 6) for x in v]

        print(json.dumps({
            "model": model_name,
            "dimension": dim,
            "embeddings": embeddings,
        }))
        return

    img = Image.open(args.input).convert("RGB")
    tensor = tf(img).unsqueeze(0).to(device)
    vec = infer_batch(tensor)[0]

    print(json.dumps({
        "model": model_name,
        "dimension": len(vec),
        "embedding": [round(float(v), 6) for v in vec],
    }))


if __name__ == "__main__":
    main()

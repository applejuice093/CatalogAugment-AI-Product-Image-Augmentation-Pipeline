# CatalogAugment AI: Product Image Augmentation Pipeline

An end-to-end **Product Image Augmentation Pipeline** designed to make retail & e-commerce **visual-search and classification models robust to real customer-submitted photographs** (cluttered backgrounds, varied camera angles, uneven lighting, smartphone blur, noise, and compression).

The repository combines:
1. **Complete Python ML/DL Pipeline (`ml_pipeline/`)** implementing all 4 project milestones:
   * **Week 1:** Multi-category e-commerce dataset preparation, hygiene checks, normalization, stratified splitting, and EDA visualizations.
   * **Week 2:** Domain-calibrated conventional augmentation with **`Albumentations`** + Realistic vs. Unrealistic quality audit.
   * **Week 3:** Controlled generative augmentation with **Hugging Face `Diffusers`** + **`Bria RMBG-1.4`** segmentation + **3D perspective homography** + feathered foreground compositing + automated quality control gate.
   * **Week 4:** **`PyTorch`** (`ResNet-18` classifier + 256-D L2-normalized visual-search embedder) training & 5-condition real-world robustness evaluation.
2. **Full-Stack Web Platform (`src/` + `server/` + `prisma/`):** Interactive React + Express + PostgreSQL studio for uploading catalog products, generating multi-angle/multi-background variations via ComfyUI/Diffusers, inspecting quality scores, and exporting versioned datasets.

---

## Key Experimental Findings

Evaluated on an independent, zero-leakage held-out test split (6 retail categories, 36 unseen products × 5 stress conditions = 180 queries):

| Experiment | Train Size | Clean Studio Acc | Unseen Clutter Acc | **Customer Hard Acc** | **Avg Real-World Acc** | **Avg Real-World Recall@1** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline (Clean Studio Only)** | 168 | 97.2% | 83.3% | **38.9%** | 79.2% | 79.2% |
| **Conventional (`Albumentations`)** | 672 | 94.4% | 91.7% | **63.9%** (+25.0 pts) | 86.8% (+7.6 pts) | 84.7% (+5.5 pts) |
| **Generative (`Diffusers`)** | 336 | 94.4% | **100.0%** (+16.7 pts) | **83.3%** (+44.4 pts) | **93.8%** (+14.6 pts) | 93.0% (+13.8 pts) |
| **Combined (`CatalogAugment AI`)** | 840 | **97.2%** | 91.7% (+8.4 pts) | **80.6%** (+41.7 pts) | 93.1% (+13.9 pts) | **93.1%** (+13.9 pts) |

Full methodology, charts, confusion matrices, t-SNE plots, visual-search retrieval audits, limitations, and recommendations are documented in **[PROJECT_REPORT.md](./PROJECT_REPORT.md)**.

---

## Repository Structure

```text
CatalogAugment-AI-Product-Image-Augmentation-Pipeline/
├── PROJECT_REPORT.md                         # Complete final technical report (Weeks 1–4)
├── requirements.txt                          # Python ML/DL dependencies
├── ml_pipeline/                              # Reproducible Python ML & Evaluation Pipeline
│   ├── 01_dataset_preparation.py             # Week 1: Dataset download, normalization, splits & EDA
│   ├── 02_albumentations_pipeline.py         # Week 2: Albumentations pipeline & realistic/unrealistic audit
│   ├── 03_diffusers_generative.py            # Week 3: Diffusers + RMBG-1.4 + 3D Angles + Quality Gate
│   ├── 04_pytorch_train_and_evaluate.py      # Week 3–4: PyTorch ResNet-18 training & 5-condition benchmark
│   ├── CatalogAugment_Full_Pipeline.ipynb    # Interactive Jupyter Notebook covering all 4 milestones
│   ├── data/                                 # Prepared splits, Albumentations, Diffusers & Stress Test sets
│   └── outputs/                              # CSV/JSON manifests, evaluation tables, figures & .pt checkpoints
├── server/                                   # Express + TypeScript + Prisma Backend API
│   ├── scripts/                              # Python bridges (RMBG-1.4, 3D homography, Albumentations, PyTorch)
│   └── services/                             # Augmentation, Segmentation, Quality, Dataset & Evaluation services
├── src/                                      # React + Vite + Tailwind Interactive Studio Frontend
└── prisma/                                   # PostgreSQL schema & migrations
```

---

## Quick Start

### 1. Run the Python ML/DL Pipeline (Weeks 1–4)

```bash
# Install Python dependencies (PyTorch CUDA recommended)
pip install -r requirements.txt

# Week 1: Prepare & inspect multi-category product dataset (240 images, 6 categories)
python ml_pipeline/01_dataset_preparation.py

# Week 2: Generate 504 realistic Albumentations training samples + quality audit
python ml_pipeline/02_albumentations_pipeline.py

# Week 3: Generate 168 identity-locked Diffusers multi-angle/multi-background samples
python ml_pipeline/03_diffusers_generative.py

# Week 4: Train 4 PyTorch ResNet-18 models & run 5-condition robustness evaluation
python ml_pipeline/04_pytorch_train_and_evaluate.py
```

Or open **`ml_pipeline/CatalogAugment_Full_Pipeline.ipynb`** in Jupyter to review all outputs, tables, and charts interactively.

### 2. Run the Full-Stack Web Application

```bash
# Install Node dependencies & push Prisma schema to PostgreSQL
npm install
npx prisma db push

# Start backend API + React frontend
npm run dev
```

---

## Rubric Coverage Checklist

- [x] **Dataset Preparation & Preprocessing (15%):** `ml_pipeline/01_dataset_preparation.py`, manifests, EDA stats & figures.
- [x] **Albumentations Pipeline (20%):** `ml_pipeline/02_albumentations_pipeline.py` + backend bridge `server/scripts/albumentations_augment.py`.
- [x] **Generative Augmentation — Diffusers (20%):** `ml_pipeline/03_diffusers_generative.py` (`StableDiffusionInpaintPipeline` + RMBG-1.4 + 3D homography + quality gate).
- [x] **PyTorch Integration (15%):** `ml_pipeline/04_pytorch_train_and_evaluate.py` (`Dataset`, `DataLoader`, `ResNet-18` classifier/embedder) + backend bridge `server/scripts/pytorch_embed.py`.
- [x] **Robustness Evaluation & Analysis (20%):** 4 models × 5 independent stress conditions, Accuracy/Macro-F1/Recall@K/mAP/MRR, confusion matrices, t-SNE, retrieval audits.
- [x] **Documentation & Presentation (10%):** `README.md`, `PROJECT_REPORT.md`, `requirements.txt`, and `CatalogAugment_Full_Pipeline.ipynb`.

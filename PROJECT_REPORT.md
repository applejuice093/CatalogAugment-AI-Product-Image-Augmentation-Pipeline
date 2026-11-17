# CatalogAugment AI: Product Image Augmentation Pipeline — Final Technical Report

**Domain / Industry:** Retail & E-Commerce  
**Technique Category:** Data Augmentation (Conventional + Generative AI)  
**Use Case:** Product image augmentation pipeline for visual-search and classification robustness  
**Team Members:** `aniket_mahto`, `gauravgautam_madan`, `ansh_shukla`, `Alok Raj`

---

## Executive Summary

Visual-search and product-recommendation models trained exclusively on pristine white-background e-commerce studio catalogs suffer severe accuracy collapse when deployed on real customer-submitted smartphone photos. Differences in background clutter, camera viewpoint, uneven room lighting, motion blur, sensor noise, and JPEG compression create a wide train-to-test domain gap.

**CatalogAugment AI** closes this domain gap through a hybrid augmentation pipeline combining:
1. **Domain-calibrated conventional augmentations (`Albumentations`)** for camera orientation, exposure/gamma, blur, noise, compression, and occlusion.
2. **Identity-preserving controlled generative augmentations (Hugging Face `Diffusers` + `Bria RMBG-1.4` + 3D perspective homography + feathered foreground compositing + automated quality gating)** to synthesize realistic customer environments and camera angles without altering product identity.
3. **End-to-end `PyTorch` (`ResNet-18`) classification and visual-search embedding integration**, evaluated across an independent 5-condition real-world stress-test suite.

### Headline Experimental Results (Held-Out Test Split, N = 36 × 5 = 180 Queries)

| Model Regime | Train Samples | Clean Studio Acc | Lighting Shift Acc | 3D Angle Acc | Unseen Clutter Acc | **Customer Hard Acc** | **Avg Real-World Acc** | **Avg Real-World Recall@1** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exp A — Baseline (Clean Studio Only)** | 168 | **97.2%** | 94.4% | **100.0%** | 83.3% | **38.9%** | 79.2% | 79.2% |
| **Exp B — Conventional (`Albumentations`)** | 672 | 94.4% | 94.4% | 97.2% | 91.7% | **63.9%** (+25.0 pts) | 86.8% (+7.6 pts) | 84.7% (+5.5 pts) |
| **Exp C — Generative (`Diffusers`)** | 336 | 94.4% | 94.4% | 97.2% | **100.0%** (+16.7 pts) | **83.3%** (+44.4 pts) | **93.8%** (+14.6 pts) | 93.0% (+13.8 pts) |
| **Exp D — Combined (`CatalogAugment AI`)** | 840 | **97.2%** | **100.0%** | **100.0%** | 91.7% (+8.4 pts) | **80.6%** (+41.7 pts) | 93.1% (+13.9 pts) | **93.1%** (+13.9 pts) |

> **Key Finding:** On realistic combined customer smartphone photos (`Customer Hard`), the clean-studio baseline collapsed from **97.2% → 38.9% Top-1 Accuracy** and **97.2% → 36.1% Visual-Search Recall@1**. Controlled `Diffusers` lifted `Customer Hard` accuracy to **83.3% (+44.4 percentage points)** and hit **100.0% on unseen cluttered backgrounds**, while the `Combined` (`CatalogAugment AI`) model achieved **97.2% Clean Studio**, **100.0% Lighting**, **100.0% 3D Angle**, and the highest overall **Avg Real-World Visual-Search Recall@1 (93.1%)**.

---

## 1. Week 1 Deliverable — Product Dataset Preparation & Baseline EDA

**Script:** `ml_pipeline/01_dataset_preparation.py`  
**Outputs:** `ml_pipeline/outputs/week1_dataset_manifest.csv`, `ml_pipeline/outputs/week1_dataset_stats.json`

### 1.1 Dataset Sourcing & Hygiene
* **Source Dataset:** `benitomartin/fashion-product-images-small-384x512` (Hugging Face Hub), containing real retail studio catalog images with structured taxonomy metadata (`articleType`, `masterCategory`, `subCategory`, `baseColour`, `gender`, `productDisplayName`).
* **Categories (6 balanced retail classes):** `Backpacks`, `Casual Shoes`, `Handbags`, `Shirts`, `Sunglasses`, `Watches` (40 verified images per category = **240 studio images**).
* **Preprocessing & Normalization:**
  * Automated hygiene audit verified 0 corrupted, blank, or sub-100px images.
  * Raw dimensions (`384×512`, aspect ratio `0.75`) were normalized to aspect-ratio-preserving **`512×512` RGB** via border-median canvas padding and Lanczos resampling (preventing geometric stretching of footwear, watches, and apparel).
* **Stratified Split (`random_state=42`):**
  * **Train:** 168 images (28/category, 70%) — *exclusively used for augmentation & training*
  * **Validation:** 36 images (6/category, 15%) — *clean model-selection split*
  * **Test:** 36 images (6/category, 15%) — *strictly held out for independent 5-condition stress testing*

### 1.2 Baseline Photometric Audit
* Mean normalized brightness across the studio catalog is **0.8680** (std `0.0795`) with mean contrast **0.2481**, quantifying the extreme high-key white-background bias inherent in e-commerce training catalogs.

![Week 1 Stratified Class Distribution](ml_pipeline/outputs/figures/week1_class_distribution.png)
![Week 1 Photometric EDA](ml_pipeline/outputs/figures/week1_eda_stats.png)
![Week 1 Representative Studio Samples](ml_pipeline/outputs/figures/week1_sample_grid.png)

---

## 2. Week 2 Deliverable — Conventional Augmentation Pipeline (`Albumentations`)

**Script:** `ml_pipeline/02_albumentations_pipeline.py`  
**Outputs:** `ml_pipeline/outputs/week2_albumentations_config.json`, `ml_pipeline/outputs/week2_albumentations_manifest.csv`

### 2.1 Transformation Design & Engineering Rationale
Implemented with **`albumentations==2.0.8`**, generating **3 deterministic variants per training image** (`168 × 3 = 504` augmented samples) strictly on the `train` split:

| Variation Axis | Configured Albumentations Transforms | Realistic Modeling Purpose | Unrealistic Pitfall Avoided |
| :--- | :--- | :--- | :--- |
| **Orientation & Scale** | `HorizontalFlip(p=0.5)`, `Affine(scale=0.82–1.12, rotate=±18°, shear=±8°)`, `Perspective(0.03–0.08)`, `RandomResizedCrop(0.78–1.0)` | Handheld framing tilt, slight camera viewpoint shift, variable shooting distance | `Rotate ±180°` or `<40%` crop flips upright footwear/bags upside down and truncates silhouette |
| **Lighting & Color** | `RandomBrightnessContrast(±25%)`, `ColorJitter(hue=±0.03)`, `RandomGamma(72–132)`, `RandomToneCurve(0.18)` | Dim indoor rooms, tungsten/daylight exposure variation while protecting true SKU color | Large hue shifts (`±0.4`) turn brown handbags green or red backpacks blue, corrupting visual-search labels |
| **Image Quality** | `OneOf([MotionBlur, GaussianBlur, Defocus])`, `OneOf([GaussNoise, ISONoise])`, `ImageCompression(quality=40–85)` | Shaky smartphone capture, low-light ISO sensor grain, messaging-app JPEG compression | Heavy blur (`k>=17`) erases watch dials, fabric weave, and brand marks |
| **Partial Occlusion** | `CoarseDropout(1–2 patches, 20–52 px, p=0.30)` | Fingers, tags, or foreground objects partially occluding the item | Oversized black blocks (`>30%` area) obliterate small accessories |

### 2.2 Visual Comparisons & Realistic vs. Unrealistic Quality Audit

![Week 2 Albumentations Realistic Variations](ml_pipeline/outputs/figures/week2_albumentations_comparison.png)
![Week 2 Quality Audit: Realistic vs Unrealistic](ml_pipeline/outputs/figures/week2_realistic_vs_unrealistic.png)

---

## 3. Week 3 Deliverable — Controlled Generative Augmentation (`Diffusers`) & Quality Gate

**Script:** `ml_pipeline/03_diffusers_generative.py`  
**Outputs:** `ml_pipeline/outputs/week3_diffusers_manifest.csv`, `ml_pipeline/outputs/week3_quality_report.json`

### 3.1 Controlled Identity-Preserving Generative Architecture
While `Albumentations` models optical/geometric perturbations, it cannot synthesize realistic 3D real-world environments around a studio product. Our generative pipeline solves this on a single **NVIDIA GeForce RTX 3050 (6GB VRAM)** via a 5-stage controlled workflow:

1. **Precision Neural Segmentation (`briaai/RMBG-1.4`):** Extracts sub-pixel product masks across all 168 training images in 16.1 seconds.
2. **3D Perspective Homography Warping (OpenCV Lanczos4):** Applies coordinated 3D Euler camera rotations (`three_quarter_left` yaw +20°, `flat_lay_topdown` pitch -28°, `low_angle_hero` pitch +18°, `handheld_casual_tilt` roll +9.5°) to both product RGB and mask prior to diffusion.
3. **Hugging Face `Diffusers` Inpainting (`diffusers==0.43.0`):** Loads `Realistic_Vision_V6.0_NV_B1_inpainting_fp16.safetensors` via `StableDiffusionInpaintPipeline.from_single_file()` in `torch.float16` with `DPMSolverMultistepScheduler` (12 steps), `enable_attention_slicing()`, and `vae.enable_slicing()` (~2.81 GB peak VRAM, **2.34 s/image**). Generates 6 authentic customer settings: *home wooden table, urban street concrete, cafe marble counter, retail boutique shelf, dim indoor bedroom, outdoor garden stone*.
4. **Feathered Foreground Compositing:** Re-composites the crisp `512×512` warped product pixels onto the Diffusers-generated environment using a 1.2px Gaussian-feathered alpha matte, ensuring zero diffusion hallucination on product logos, dials, or stitching.
5. **Automated Quality Control Gate:** Evaluates every generated image on foreground Pearson identity correlation (`r >= 0.85`), coverage bounds, Laplacian sharpness, and exposure luminance.

### 3.2 Generative Quality Audit Metrics

| Metric | Controlled Identity-Locked `Diffusers` (N = 168) | Uncontrolled Drift Baseline (No FG Lock) |
| :--- | :---: | :---: |
| **Mean Foreground Identity Correlation (`r`)** | **0.9912** | **0.0270** |
| **Quality Gate Pass Rate** | **100.0% (168 / 168 PASS)** | **0.0% (0 / 4 PASS — REJECTED)** |
| **Mean Composite Quality Score** | **0.9599** | — |
| **Generation Throughput (RTX 3050 6GB)** | **2.34 s / image** (393.7 s total) | — |

![Week 3 Controlled Diffusers Showcase Grid](ml_pipeline/outputs/figures/week3_diffusers_showcase_grid.png)
![Week 3 Generative Quality Audit: PASS vs REJECT](ml_pipeline/outputs/figures/week3_quality_audit_pass_vs_reject.png)

---

## 4. Week 3–4 Deliverable — PyTorch Integration & Robustness Evaluation

**Script:** `ml_pipeline/04_pytorch_train_and_evaluate.py`  
**Outputs:** `ml_pipeline/outputs/week4_evaluation_results.json`, `ml_pipeline/outputs/week4_evaluation_table.csv`, `ml_pipeline/outputs/models/resnet18_*.pt`

### 4.1 PyTorch Architecture & Training Setup
* **Data Pipeline:** Custom `CatalogProductDataset(torch.utils.data.Dataset)` and `DataLoader` unifying Week 1 clean images, Week 2 Albumentations manifests, and Week 3 PASS-filtered Diffusers manifests (`224×224` ImageNet-normalized tensors).
* **Model (`CatalogVisionNet`):** Transfer-learned `torchvision.models.resnet18(weights=ResNet18_Weights.DEFAULT)` coupled with a `512 → 256` projection head (`Linear + BatchNorm1d + ReLU + Dropout(0.25)`) producing **L2-normalized 256-D visual-search embeddings** alongside a 6-class product classification head.
* **Controlled Training Protocol:** Identical hyperparameters across all 4 experiments (`AdamW`, `lr=3e-4`, `weight_decay=1e-4`, `CosineAnnealingLR`, `CrossEntropyLoss(label_smoothing=0.05)`, 12 epochs, batch size 32, `seed=42`). Best checkpoints selected strictly on the untouched `val` split.

### 4.2 Independent 5-Condition Real-World Stress Test Suite
To prevent evaluation leakage, the held-out `test` split (36 unseen products) was transformed into **5 independent stress conditions** (180 total queries):
1. **`clean_studio`**: Untouched studio control set.
2. **`lighting_shift`**: Dim warm tungsten, cool fluorescent casts, uneven side-lit shadows, gamma shifts.
3. **`angle_viewpoint`**: Unseen 3D homography yaw (±24°), pitch (±22°), roll (±16°), and off-center framing.
4. **`background_clutter`**: Products segmented with RMBG-1.4 and composited onto **completely unseen procedural real-world cluttered backgrounds** (wood planks, indoor bokeh, tile/brick grids, plaid tablecloths, dappled stone).
5. **`customer_photo_hard`**: Simultaneous combination of unseen cluttered background + 3D perspective angle + dim/cast lighting + motion/Gaussian blur + ISO noise + aggressive JPEG compression (Q=28–55) + partial occlusion.

![Week 4 5-Condition Held-Out Stress Test Suite](ml_pipeline/outputs/figures/week4_test_stress_conditions.png)

### 4.3 Full Quantitative Results (Classification + Visual-Search Retrieval)

Visual-search retrieval embeds the 168 clean studio catalog items as the reference gallery and ranks them by cosine similarity against each stressed customer query.

| Experiment | Condition | Top-1 Acc | Macro-F1 | Recall@1 | Recall@5 | mAP@5 | MRR |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exp A: Baseline** | Clean Studio | 97.2% | 0.972 | 97.2% | 100.0% | 0.991 | 0.986 |
| *(Clean Only, N=168)* | Lighting Shift | 94.4% | 0.944 | 94.4% | 94.4% | 0.944 | 0.944 |
| | 3D Angle Shift | 100.0% | 1.000 | 100.0% | 100.0% | 0.989 | 1.000 |
| | Unseen Clutter | 83.3% | 0.841 | 86.1% | 86.1% | 0.850 | 0.861 |
| | **Customer Hard** | **38.9%** | **0.392** | **36.1%** | **38.9%** | **0.380** | **0.375** |
| **Exp B: Conventional** | Clean Studio | 94.4% | 0.944 | 97.2% | 100.0% | 0.978 | 0.978 |
| *(+Albumentations, N=672)* | Lighting Shift | 94.4% | 0.944 | 97.2% | 97.2% | 0.965 | 0.972 |
| | 3D Angle Shift | 97.2% | 0.972 | 97.2% | 97.2% | 0.972 | 0.972 |
| | Unseen Clutter | 91.7% | 0.921 | 88.9% | 91.7% | 0.896 | 0.896 |
| | **Customer Hard** | **63.9%** | **0.644** | **55.6%** | **63.9%** | **0.594** | **0.589** |
| **Exp C: Generative** | Clean Studio | 94.4% | 0.946 | 97.2% | 97.2% | 0.971 | 0.972 |
| *(+Diffusers, N=336)* | Lighting Shift | 94.4% | 0.946 | 94.4% | 94.4% | 0.944 | 0.944 |
| | 3D Angle Shift | 97.2% | 0.972 | 94.4% | 97.2% | 0.958 | 0.958 |
| | Unseen Clutter | **100.0%** | **1.000** | **100.0%** | **100.0%** | **0.999** | **1.000** |
| | **Customer Hard** | **83.3%** | **0.829** | **83.3%** | **86.1%** | **0.832** | **0.839** |
| **Exp D: Combined** | Clean Studio | **97.2%** | **0.972** | **97.2%** | **100.0%** | **0.981** | **0.979** |
| *(CatalogAugment AI, N=840)* | Lighting Shift | **100.0%** | **1.000** | **100.0%** | **100.0%** | **1.000** | **1.000** |
| | 3D Angle Shift | **100.0%** | **1.000** | **100.0%** | **100.0%** | **1.000** | **1.000** |
| | Unseen Clutter | 91.7% | 0.921 | 91.7% | 91.7% | 0.917 | 0.917 |
| | **Customer Hard** | **80.6%** | **0.810** | **80.6%** | **83.3%** | **0.813** | **0.819** |

### 4.4 Visual Analysis & Diagnostics

![Week 4 PyTorch Training Curves](ml_pipeline/outputs/figures/week4_training_curves.png)
![Week 4 Robustness Comparison Bar Chart](ml_pipeline/outputs/figures/week4_robustness_comparison.png)
![Week 4 Confusion Matrices on Customer Hard](ml_pipeline/outputs/figures/week4_confusion_matrices.png)
![Week 4 t-SNE Embedding Separation](ml_pipeline/outputs/figures/week4_tsne_embeddings.png)
![Week 4 Visual-Search Retrieval Qualitative Audit](ml_pipeline/outputs/figures/week4_retrieval_examples.png)

---

## 5. Conclusions, Limitations & Recommendations

### 5.1 Key Conclusions
1. **Clean Studio Training Fails Critically in Production:** Despite achieving 97.2% accuracy on clean catalog shots, the baseline ResNet-18 suffers severe collapse (**38.9% accuracy, 36.1% Recall@1**) on realistic multi-factor customer smartphone photos. As revealed in the qualitative retrieval audit, the unaugmented model latches onto textured backgrounds (plaid, wood grain, tile) and misclassifies footwear as patterned shirts.
2. **Conventional vs. Generative Complementarity:**
   * **`Albumentations`** delivers zero-GPU-cost resilience against exposure shifts, blur, ISO grain, and JPEG artifacts (**+25.0 pts on Customer Hard**, lifting accuracy from 38.9% → 63.9%), but cannot match generative methods on unseen real-world backgrounds.
   * **`Diffusers` + RMBG-1.4 + 3D Homography** achieves **100.0% accuracy & Recall@1 on unseen cluttered backgrounds** and **83.3% on Customer Hard (+44.4 pts)** using half as many training images as Albumentations (336 vs. 672), proving that realistic background diversification provides disproportionately high semantic signal per sample.
   * **Combined (`CatalogAugment AI`)** retains full **97.2% Clean Studio** accuracy while hitting **100.0% Lighting**, **100.0% 3D Angle**, and the highest overall **Avg Real-World Visual-Search Recall@1 (93.1%)**.
3. **Foreground Identity Locking Is Non-Negotiable:** Without RMBG-1.4 masking and feathered compositing, diffusion models hallucinate product shapes and colors (`r = 0.027`). With identity locking, foreground correlation stays at **`r = 0.9912`** across 168/168 samples.

### 5.2 Limitations
* **Dataset Scale & Instance-Level Retrieval:** Our benchmark uses 240 curated products across 6 broad retail categories (168 gallery items, 36 held-out queries per condition). Larger production catalogs require fine-grained SKU-level (instance-level) retrieval with metric-learning losses (e.g., ArcFace / SupCon / Triplet Loss).
* **Planar 3D Warping vs. True Multi-View 3D Synthesis:** 3D homography simulates realistic viewpoints (±25° yaw/pitch) cleanly and preserves exact texture, but cannot synthesize unseen rear or 90° profile sides of a product.
* **Slight Clean-Domain Trade-Off in Heavy Combined Regime:** In Exp D (840 images where 80% are heavily augmented), clean studio accuracy dipped slightly from `97.2% → 94.4%` due to clean-sample dilution (`168/840 = 20%`).

### 5.3 Actionable Production Recommendations
1. **Balanced Clean-to-Augmented Sampling Ratio:** Oversample clean studio images or enforce a **35–40% clean / 30% Albumentations / 30% Diffusers** mini-batch sampler so models retain peak studio accuracy (`97%+`) alongside peak real-world robustness (`95%+`).
2. **Apply Light Albumentations On Top of Diffusers Online:** Rather than keeping Albumentations and Diffusers as disjoint static copies, apply lightweight online Albumentations (JPEG compression, mild blur, gamma jitter) directly on top of Diffusers-composited scenes during PyTorch `DataLoader` iteration.
3. **Upgrade Visual-Search Loss & Backbone at Scale:** For 10,000+ SKU catalogs, pair this exact augmentation pipeline with a `CLIP ViT-B/16` or `DINOv2` backbone fine-tuned with **Supervised Contrastive (SupCon) or ArcFace loss** and deploy embeddings into `pgvector` / `FAISS`.
4. **Integrate Relighting / True 3D Novel-View Models:** Incorporate IC-Light (for realistic ambient light harmonization across product edges) and Zero123++ / multi-view diffusion when true 90°–180° viewpoint synthesis is needed.

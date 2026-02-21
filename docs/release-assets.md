# Publishing ONNX model assets for v1-models

> **Rule:** Do not upload LFS pointer files to Releases; always upload real binaries.
> A 29-byte file in a GitHub Release is an LFS pointer, not a real model.
> Docker builds and the download script both enforce a ≥ 5 MB size guard and will fail on a pointer.

---

## Why this matters

`scripts/download-models.js` (and the Dockerfile) download `embedder.onnx` and `yolov10.onnx`
from the `v1-models` GitHub Release.  If those assets are LFS pointer files the Docker build will
fail immediately.  This guide explains three ways to attach the real binaries.

---

## Path A – Upload local files you already have

Use this if you already have both `.onnx` files on your machine.

```bash
# Install the GitHub CLI if needed: https://cli.github.com/
gh auth login

# Upload / overwrite both assets on the existing release
gh release upload v1-models \
  /path/to/embedder.onnx \
  /path/to/yolov10.onnx \
  --repo DonSquires/orc-ai-inference-service \
  --clobber
```

---

## Path B – Download from Hugging Face, then upload

Use this when the files are not on your machine but are available on Hugging Face.

```bash
# 1. Download the embedder (ResNet-50 ONNX from the official ONNX model zoo)
curl -L "https://huggingface.co/onnx/resnet50/resolve/main/resnet50.onnx?download=1" \
     -o embedder.onnx

# 2. Download your fine-tuned YOLOv10 weights
#    Replace <HF_REPO> and <PATH> with the actual Hugging Face repo and file path.
curl -L "https://huggingface.co/<HF_REPO>/resolve/main/<PATH>/yolov10.onnx?download=1" \
     -o yolov10.onnx

# 3. Upload both to the release
gh release upload v1-models embedder.onnx yolov10.onnx \
  --repo DonSquires/orc-ai-inference-service \
  --clobber
```

---

## Path C – Export with Optimum, then upload

Use this when you need to convert a PyTorch checkpoint to ONNX first.

```bash
pip install optimum[exporters] transformers

# Export the embedder
optimum-cli export onnx \
  --model microsoft/resnet-50 \
  --task image-classification \
  embedder_onnx/

cp embedder_onnx/model.onnx embedder.onnx

# Export YOLOv10 (example using ultralytics)
# pip install ultralytics
python - <<'EOF'
from ultralytics import YOLO
model = YOLO("path/to/yolov10.pt")
model.export(format="onnx")
EOF

mv path/to/yolov10.onnx yolov10.onnx

# Upload both
gh release upload v1-models embedder.onnx yolov10.onnx \
  --repo DonSquires/orc-ai-inference-service \
  --clobber
```

---

## Sanity checks after uploading

### Inspect sizes with curl + jq (no auth required for public repos)

```bash
curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/DonSquires/orc-ai-inference-service/releases/tags/v1-models \
| jq '.assets[] | {name, size}'
```

Expected output (both sizes should be well above 5 MB):

```json
{ "name": "embedder.onnx", "size": 102400000 }
{ "name": "yolov10.onnx",  "size": 52000000 }
```

### Minimum size guard

The CI workflow `.github/workflows/verify-release-assets.yml` enforces a **5 242 880-byte (5 MiB)**
minimum for each asset and will fail any PR that would rely on assets below that threshold.
If you need to raise or lower the guard, edit the `5242880` literal in that workflow file.

---

## Using the Actions workflow to publish (CI-assisted, Path B)

The workflow `.github/workflows/fetch-embedder.yml` can download the ResNet-50 embedder and upload
it to the release entirely on a GitHub-hosted runner (avoiding corporate firewall issues):

1. Go to **Actions → Build models release (yolo + embedder)**.
2. Click **Run workflow**, set `tag_name` to `v1-models`, and set `add_yolo` to `true` if
   `yolov10.onnx` is already committed in the repository.
3. After the run completes, re-run the sanity check above to confirm sizes.

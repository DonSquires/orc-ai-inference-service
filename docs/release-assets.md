# Publishing ONNX Release Assets (v1-models)

This repo's Docker build and runtime **depend** on two ONNX files hosted in the **GitHub Release** `v1-models`:

- `embedder.onnx`  — image embedding model (FP32, CPU‑portable)
- `yolov10.onnx`   — detector model

> **Do NOT** upload Git LFS pointers (29 bytes). The release must contain the **real binaries**.

---

## 0) Verify what's currently on the release

```bash
TAG=v1-models
curl -s "https://api.github.com/repos/DonSquires/orc-ai-inference-service/releases/tags/$TAG" \
  | jq '.assets[] | {name, size, browser_download_url}'
```

Expect **sizes in the tens of MB**, not tiny numbers.

---

## Path A — You already have the ONNX files locally

```bash
# Confirm real files
ls -lh embedder.onnx yolov10.onnx
shasum -a 256 embedder.onnx yolov10.onnx

# Upload to release (requires gh CLI; run `gh auth login` once)
TAG=v1-models
gh release upload "$TAG" embedder.onnx yolov10.onnx --clobber
```

Add the **SHA‑256** values to the release notes.

---

## Path B — Download from Hugging Face (real binaries)

```bash
pip install -U "huggingface_hub[cli]"

# Download ResNet-50 ONNX (used as the image-embedding model) into ./models
# This is the same model the fetch-embedder workflow downloads from
# https://huggingface.co/onnx/resnet50
huggingface-cli download \
  onnx/resnet50 resnet50.onnx \
  --local-dir ./models

# Rename to match the expected asset name
mv ./models/resnet50.onnx ./models/embedder.onnx

# Then upload to release
TAG=v1-models
gh release upload "$TAG" ./models/embedder.onnx --clobber
```

Obtain `yolov10.onnx` from your training pipeline or a trusted model hub, then upload similarly.

---

## Path C — Use the CI workflow (recommended)

Trigger the **Build models release** workflow from the Actions tab:

1. Go to **Actions → Build models release → Run workflow**
2. Set `tag_name` to `v1-models`
3. Set `add_yolo` to `true` if `yolov10.onnx` is present in the repo

The workflow downloads the embedder directly from Hugging Face on the CI runner and uploads real binaries to the release.

---

## Verifying after upload

The **Verify release assets** workflow runs automatically on pull requests that touch workflows, `Dockerfile`, or `*.onnx` files. It fetches the release via the GitHub API and fails if either asset is missing or smaller than **5 MiB**.

To run the check manually:

```bash
TAG=v1-models
MIN_SIZE=5242880
rel=$(curl -s "https://api.github.com/repos/DonSquires/orc-ai-inference-service/releases/tags/$TAG")

for name in embedder.onnx yolov10.onnx; do
  size=$(echo "$rel" | jq -r --arg n "$name" '.assets[] | select(.name==$n) | .size // empty')
  echo "$name: ${size:-MISSING} bytes"
  if [ -z "$size" ] || [ "$size" -lt "$MIN_SIZE" ]; then
    echo "  ❌ Too small or missing!"
  else
    echo "  ✅ OK"
  fi
done
```

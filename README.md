# orc-ai-inference-service

Railway-deployed ONNX inference service (YOLOv10 + embedding model).

## Release assets required

Before the Docker image can be built, the `v1-models` GitHub Release must contain **real** ONNX files:

| Asset | Expected size | Notes |
|---|---|---|
| `yolov10.onnx` | ~28 MB | YOLOv10 detection model |
| `embedder.onnx` | ~94 MB | ResNet-50 embedding model |

> ⚠️ The current `embedder.onnx` in the `v1-models` release is a 29-byte placeholder.
> Re-run the **"Build models release"** workflow (`.github/workflows/fetch-embedder.yml`)
> to upload a real ResNet-50 ONNX file, then rebuild the Docker image.

## Railway setup

> **Railway Root Directory must be set to `inference-service/`**

In the Railway dashboard → Service Settings → Source → Root Directory: `inference-service`

The `inference-service/railway.json` configures the build and healthcheck automatically.

## Local development

### Build the Docker image

```bash
docker build \
  --build-arg MODEL_TAG=v1-models \
  -t orc-inference:local \
  inference-service/
```

Build logs will include `ls -lh` output for each model file and a size guard (fails if either model is < 5 MB).

### Run the container

```bash
docker run --rm -p 3000:3000 orc-inference:local
```

### Verify health endpoints

```bash
# Always returns 200 once process is up
curl -i http://localhost:3000/health

# Returns 200 when both models are loaded; 503 otherwise
curl -i http://localhost:3000/ready
```

Expected `/ready` response when models are loaded:

```json
{
  "status": "ready",
  "models": { "yolo": "loaded", "embedding": "loaded" },
  "errors": { "yolo": null, "embedding": null }
}
```

### Run inference

```bash
# Encode a test image as base64
IMAGE_B64=$(base64 -w0 /path/to/test.jpg)

curl -s -X POST http://localhost:3000/infer \
  -H 'Content-Type: application/json' \
  -d "{\"image\":\"$IMAGE_B64\"}" | jq .
```

Expected `/infer` response:

```json
{
  "ok": true,
  "inference": {
    "detections": [
      {
        "bbox": [0.12, 0.34, 0.56, 0.78],
        "confidence": 0.92,
        "classId": 2,
        "embedding": [0.041, -0.12, ...]
      }
    ]
  },
  "meta": {
    "model": "yolov10+embedder",
    "processingMs": 145,
    "detectionsCount": 1
  }
}
```

`bbox` values are normalised to `[0, 1]` relative to the original image dimensions (`[x1, y1, x2, y2]`).

## Production verification (Railway)

After Railway redeploys, run:

```bash
# Swap in your Railway domain
curl -i https://<your-railway-domain>/ready
```

`/ready` must return HTTP 200 for the service to be considered healthy.

Railway's healthcheck is configured to poll `/ready` with a 300-second timeout.
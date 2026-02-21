# orc-ai-inference-service

A minimal ONNX-model inference HTTP service, deployed on [Railway](https://railway.app).

## Requirements

- Docker
- Node.js ≥ 18 (local development only)

## Local development

```bash
npm install
MODEL_DIR=./models npm start
```

> For local development without the real ONNX models, the `/health` endpoint
> will report `"missing"` for each model, which is expected.

## Docker build

The Dockerfile downloads both ONNX models from the [`v1-models` GitHub Release](https://github.com/DonSquires/orc-ai-inference-service/releases/tag/v1-models)
during the image build step. Build logs will include `ls -lh /app/models/*.onnx`
so you can verify that files have non-trivial sizes.

```bash
# Build (MODEL_TAG defaults to v1-models)
docker build -t orc-inference .

# Override the release tag if needed
docker build --build-arg MODEL_TAG=v1-models -t orc-inference .

# Run
docker run --rm -p 8080:8080 orc-inference

# Check health
curl http://localhost:8080/health
```

Expected `/health` response:

```json
{
  "status": "ok",
  "models": {
    "yolo": "loaded",
    "embedding": "loaded"
  },
  "errors": {
    "yolo": null,
    "embedding": null
  }
}
```

## Railway deployment

1. Connect this repository to a Railway project.
2. Railway will detect `railway.json` and build from the `Dockerfile`.
3. Set the healthcheck path to `/health` with a timeout of at least 300 s
   (already configured in `railway.json`) to allow time for model downloads
   during the build step.

## API

| Method | Path     | Description                              |
|--------|----------|------------------------------------------|
| GET    | /health  | Returns model load status (HTTP 200)     |
| POST   | /infer   | Inference placeholder (HTTP 501)         |
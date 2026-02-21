# orc-ai-inference-service

AI inference service for vehicle detection (YOLOv10) and embedding (ResNet50).

## Deployable app

All deploy artifacts live in [`inference-service/`](./inference-service/).

| File | Purpose |
|---|---|
| `inference-service/server.js` | Express server – `/health` (always 200) and `/infer` endpoints |
| `inference-service/package.json` | Node dependencies and `start` script |
| `inference-service/Dockerfile` | Docker image definition (downloads ONNX models at build time) |
| `railway.json` | Railway configuration – Dockerfile builder, `/health` check, 300 s timeout |

## Railway deployment

1. Create a new Railway service pointing at this repository.
2. Railway will automatically detect the root-level `railway.json` and build using `inference-service/Dockerfile`.
3. No manual Root Directory configuration is needed.

## ONNX models

Models are downloaded from the [`v1-models` release](https://github.com/DonSquires/orc-ai-inference-service/releases/tag/v1-models)
during the Docker build step. Use the [fetch-embedder workflow](./.github/workflows/fetch-embedder.yml)
to upload new model assets to that release.

## Local development

```sh
cd inference-service
npm install
npm start
```
# orc-ai-inference-service

AI inference service for vehicle detection (YOLOv10) and embedding (ResNet50).

## Deployable app

All deploy artifacts live in [`inference-service/`](./inference-service/).

| File | Purpose |
|---|---|
| `inference-service/server.js` | Express server – `/health` and `/infer` endpoints |
| `inference-service/package.json` | Node dependencies and `start` script |
| `inference-service/Dockerfile` | Docker image definition (downloads ONNX models at build time) |
| `inference-service/railway.json` | Railway configuration (Dockerfile builder, `/health` check) |

## Railway deployment

1. Create a new Railway service pointing at this repository.
2. Set **Root Directory** to `inference-service`.
3. Railway will use the `Dockerfile` and `railway.json` inside that directory.

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
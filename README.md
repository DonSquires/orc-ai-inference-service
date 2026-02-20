# orc-ai-inference-service

An ONNX-based vehicle inference service built with Node.js and Express.

## Deployment

Railpack and Railway build from the **repository root**. The root `Dockerfile` is the deploy entrypoint — it copies the application from `inference-service/` and downloads ONNX model assets from GitHub Releases during the image build.

## Local Docker build

```bash
# Build the image from repo root
docker build -t orc-inference .

# Run the container (service listens on port 3000)
docker run --rm -p 3000:3000 orc-inference
```

The `/health` endpoint will confirm the service is running:
```bash
curl http://localhost:3000/health
```

## Project structure

| Path | Description |
|------|-------------|
| `Dockerfile` | Root-level deploy entrypoint (used by Railpack / Railway) |
| `inference-service/` | Application source: `server.js`, `package.json`, `Dockerfile` |

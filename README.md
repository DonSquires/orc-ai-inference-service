# orc-ai-inference-service

An ONNX-based vehicle inference service built with Node.js and Express.

## Deployment

### Railpack / Railway

Railpack detects this as a **Node.js** app via the root `package.json` and runs `npm start` (`node server.js`). No extra configuration is required — Railpack will install dependencies and start the server automatically.

ONNX models are downloaded from this repository's GitHub Releases (`v1-models`) at container build time (Docker) or can be placed in a `models/` directory at the repo root. If models are absent, the service starts normally and the `/health` endpoint reports their status.

### Docker

The root `Dockerfile` is the deploy entrypoint for Docker-based builds (e.g. when building locally or via a Docker-aware CI):

```bash
# Build from repo root
docker build -t orc-inference .

# Run (service listens on port 3000)
docker run --rm -p 3000:3000 orc-inference
```

Verify the service is running:

```bash
curl http://localhost:3000/health
```

## Project structure

| Path | Description |
|------|-------------|
| `package.json` | Root-level Node manifest — used by Railpack for detection and `npm install` |
| `server.js` | Application entry point — `npm start` runs this |
| `Dockerfile` | Docker build entrypoint (downloads ONNX models from GitHub Releases) |
| `inference-service/` | Standalone copy of the app for subdirectory-based builds |


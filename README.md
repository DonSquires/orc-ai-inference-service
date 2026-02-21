# orc-ai-inference-service

Railway-deployed ONNX inference service (YOLOv10 + embedding model).

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

## Production verification (Railway)

After Railway redeploys, run:

```bash
# Swap in your Railway domain
curl -i https://<your-railway-domain>/ready
```

`/ready` must return HTTP 200 for the service to be considered healthy.

Railway's healthcheck is configured to poll `/ready` with a 300-second timeout.
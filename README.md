# orc-ai-inference-service

A Node.js inference service that runs YOLO object detection + vehicle embedding
models via [ONNX Runtime](https://onnxruntime.ai/), deployable on
[Railway](https://railway.app).

## Repository layout

```
orc-ai-inference-service/
├── inference-service/
│   ├── server.js       ← Express + ONNX server (ESM)
│   ├── package.json
│   ├── Dockerfile
│   ├── railway.json    ← Railway build/deploy config (Dockerfile builder, /health check)
│   └── models/
│       ├── yolo.onnx       ← add your YOLO model here (git-ignored)
│       └── embedder.onnx   ← add your embedding model here (git-ignored)
└── README.md
```

> **Note:** `*.onnx` files are excluded from version control.  
> Add them to `inference-service/models/` before building.

## Local development

```bash
cd inference-service
npm install
npm start          # start server (node server.js)
```

The server listens on `PORT` (default `3000`):

```bash
curl http://localhost:3000/health
# {"status":"healthy","models":{"yolo":"loaded","embedding":"loaded"}}
```

## Environment variables

| Variable          | Default | Description                                                                                           |
|-------------------|---------|-------------------------------------------------------------------------------------------------------|
| `PORT`            | `3000`  | Port the HTTP server listens on.                                                                      |
| `NODE_ENV`        | –       | Set to `production` for Railway deployments.                                                          |
| `ALLOWED_ORIGINS` | –       | Comma-separated list of allowed CORS origins, e.g. `https://xbfnlzmpumthnjmtqufp.supabase.co,https://preview-react-*.onspace.build`. |

## Railway deployment

### First-time deploy

1. Push / merge this branch to `main`.
2. In the [Railway dashboard](https://railway.app/dashboard) → **New Project → Deploy from GitHub Repo** → select `DonSquires/orc-ai-inference-service`.
3. When Railway asks **"Select a folder"**, choose **`inference-service`**.  
   Railway will use `railway.json` to build with the Dockerfile and apply the health-check/restart policy automatically.
4. Open **Settings → Networking → Generate Domain** to get your `.up.railway.app` URL.
5. Set the following environment variables under **Variables**:

   | Key               | Value                                                                                                 |
   |-------------------|-------------------------------------------------------------------------------------------------------|
   | `PORT`            | `3000`                                                                                                |
   | `NODE_ENV`        | `production`                                                                                          |
   | `ALLOWED_ORIGINS` | `https://xbfnlzmpumthnjmtqufp.supabase.co,https://preview-react-*.onspace.build`                     |

   > The health-check path (`/health`), timeout (30 s), and restart policy are already configured in `railway.json` — no manual dashboard setup needed.

### Add ONNX models before deploying

Place your model files in `inference-service/models/` before building the Docker
image, or mount them at runtime:

```bash
cp /path/to/yolo.onnx      inference-service/models/
cp /path/to/embedder.onnx  inference-service/models/
```

> The files are git-ignored so they won't be committed to the repository.
> They must be present inside the Docker build context when `docker build` runs.

### Redeploy after changes

Push a new commit to the connected branch — Railway auto-deploys — or open the
Railway dashboard, select the service, and click **Redeploy**.

### Verify the live endpoint

```bash
curl https://<your-service>.up.railway.app/health
# {"status":"healthy","models":{"yolo":"loaded","embedding":"loaded"}}
```

## Connect to Supabase

```bash
supabase secrets set INFERENCE_SERVICE_URL="https://<your-service>.up.railway.app"
```

Your Supabase Edge Function can then call:

```typescript
const result = await fetch(`${INFERENCE_SERVICE_URL}/infer`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: base64DataUrl }),
});
```

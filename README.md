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
├── supabase/
│   └── functions/
│       └── vehicle-ingest/
│           └── index.ts    ← Deno edge function (OPTIONS preflight, POST → /infer)
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
2. Go to [railway.app/dashboard](https://railway.app/dashboard) → click **New Project** → **Deploy from GitHub Repo** → select `DonSquires/orc-ai-inference-service`.
3. When Railway asks **"Select a folder"**, choose **`inference-service`**.  
   Railway will use `railway.json` to build with the Dockerfile and apply the health-check/restart policy automatically.  
   > ⚠️ If you skip this step, Railway scans the repo root and Railpack fails with "could not determine how to build the app." See [Troubleshooting](#troubleshooting) below to fix it after the fact.
4. Once the project is created you will land on the project canvas. **Click the service card** (the box labelled `orc-ai-inference-service` or `inference-service`) to open the service detail panel.
5. **Add environment variables** — this is where to update `PORT`, `NODE_ENV`, and `ALLOWED_ORIGINS`:
   1. In the service detail panel, click the **Variables** tab (top of the panel, between *Deployments* and *Settings*).
   2. Click **New Variable** (or the **+ Add** button).
   3. Add each row below, then click **Add** / **Save** after each one:

      | Name              | Value                                                                              |
      |-------------------|------------------------------------------------------------------------------------|
      | `PORT`            | `3000`                                                                             |
      | `NODE_ENV`        | `production`                                                                       |
      | `ALLOWED_ORIGINS` | `https://xbfnlzmpumthnjmtqufp.supabase.co`                                        |

   4. Railway will automatically trigger a redeploy once variables are saved.

   > **Tip:** you can also paste all three at once using the **Raw Editor** button — enter one `KEY=VALUE` pair per line.

   > The health-check path (`/health`), timeout (30 s), and restart policy are already configured in `railway.json` — no manual Settings changes needed.

6. Open **Settings → Networking → Generate Domain** to get your `.up.railway.app` URL.

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

## Troubleshooting

### `✖ Railpack could not determine how to build the app`

**Cause:** Railway is scanning the repository root (`/`) which contains only `README.md` and `.gitignore`. Railpack finds no recognisable project files there and fails.

**Fix — set the root directory to `inference-service/`:**

1. Open the Railway dashboard → select your project → click the service card.
2. Go to **Settings → Source → Root Directory**.
3. Set it to **`inference-service`** (no leading slash).
4. Click **Save** and then **Redeploy**.

Railway will now build from `inference-service/`, find the `Dockerfile` and `railway.json`, and use the Dockerfile builder instead of Railpack.

> **Why this works:** `inference-service/railway.json` sets `"builder": "DOCKERFILE"`, which tells Railway to use the `Dockerfile` directly and skip Railpack entirely. This only takes effect when Railway's root directory is pointed at `inference-service/`.

## Connect to Supabase

Set the Railway URL as a Supabase secret so the edge function can reach the inference service:

```bash
supabase secrets set INFERENCE_SERVICE_URL="https://<your-service>.up.railway.app"
supabase secrets set ALLOWED_ORIGINS="https://xbfnlzmpumthnjmtqufp.supabase.co,https://preview-react-*.onspace.build"
```

### `vehicle-ingest` edge function

Located at `supabase/functions/vehicle-ingest/index.ts`.

**Request (POST):**

```json
{
  "image": "data:image/jpeg;base64,<base64>",
  "gpsLatitude": 37.7749,
  "gpsLongitude": -122.4194,
  "recordedAt": "2026-02-20T08:00:00Z",
  "officerId": "officer-uuid",
  "idempotencyKey": "unique-key"
}
```

**Response (`200 OK`):**

```json
{
  "ok": true,
  "inference": { "embedding": [...], "quality": null, "model_version": "v1.0.0" },
  "meta": { "gpsLatitude": 37.7749, "gpsLongitude": -122.4194, "recordedAt": "...", "officerId": "...", "idempotencyKey": "..." }
}
```

**Deploy the function:**

```bash
supabase functions deploy vehicle-ingest
```

**Test locally:**

```bash
supabase functions serve vehicle-ingest --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/vehicle-ingest \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,/9j/..."}'
```

# orc-ai-inference-service

A lightweight Node.js inference service with a `/health` endpoint, deployable on [Railway](https://railway.app).

## Local development

```bash
npm install
npm start          # production
npm run dev        # development (auto-restart)
npm test           # run tests
```

The server listens on `PORT` (default `3000`):

```bash
curl http://localhost:3000/health
# {"status":"healthy","models":[]}
```

## Environment variables

| Variable          | Default | Description                                         |
|-------------------|---------|-----------------------------------------------------|
| `PORT`            | `3000`  | Port the HTTP server listens on.                    |
| `ALLOWED_ORIGINS` | –       | Comma-separated list of allowed CORS origins, e.g. `https://myapp.up.railway.app,https://example.com`. Leave unset to disable CORS. |
| `NODE_ENV`        | –       | Set to `production` for Railway deployments.        |

## Railway deployment

### First-time deploy

1. Push / merge this branch to `main`.
2. In the [Railway dashboard](https://railway.app/dashboard) create a **New Project → Deploy from GitHub repo** and select `DonSquires/orc-ai-inference-service`.
3. Railway will detect `package.json` automatically (Railpack / Node builder) and run `npm start`.
4. Open **Settings → Networking → Generate Domain** to get your `.up.railway.app` URL.
5. Optionally set environment variables under **Variables**:
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://<your-domain>.up.railway.app`

### Redeploy after changes

Either push a new commit to the connected branch (Railway auto-deploys), or open the Railway dashboard, select the service, and click **Redeploy**.

### Verify the deployment

```bash
curl https://<your-service>.up.railway.app/health
# {"status":"healthy","models":[]}
```
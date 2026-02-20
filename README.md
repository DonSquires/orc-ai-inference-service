# orc-ai-inference-service

Railway-ready Node.js AI inference service built with Express.

---

## Table of contents

- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Health check](#health-check)
- [Deploy to Railway](#deploy-to-railway)
- [Adding models](#adding-models)
- [Running tests](#running-tests)

---

## Local development

```bash
# Install dependencies
npm install

# Start with auto-reload (requires Node >=18)
npm run dev

# Or start normally
npm start
```

The server defaults to `PORT=3000`. Open <http://localhost:3000/health> to verify it is running.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | TCP port the HTTP server binds to. Railway injects this automatically. |
| `NODE_ENV` | No | `development` | Set to `production` on Railway for optimised behaviour. |
| `ALLOWED_ORIGINS` | No | *(all)* | Comma-separated list of browser origins that CORS allows, e.g. `https://app.example.com,https://staging.example.com`. When absent every origin is permitted (safe for server-to-server calls). |

---

## Health check

```
GET /health
```

Returns HTTP **200** immediately, even while models are still loading:

```json
{
  "status": "warming_up",
  "models": {
    "my-model": { "status": "loading" }
  }
}
```

Once every registered model has finished loading the response becomes:

```json
{
  "status": "healthy",
  "models": {
    "my-model": { "status": "ready" }
  }
}
```

The endpoint is unauthenticated and is safe to use as a Railway health-check path.

### Quick curl test

```bash
curl http://localhost:3000/health
```

---

## Deploy to Railway

Railway uses **Nixpacks** to build and start the service automatically – no additional config files are required.

1. Push this repository to GitHub.
2. Create a new Railway project and select **Deploy from GitHub repo**.
3. Railway detects `package.json` and will run `npm start` automatically.
4. Set the following environment variables in the Railway dashboard (**Variables** tab):

   | Variable | Example value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ALLOWED_ORIGINS` | `https://your-frontend.up.railway.app` |

   > `PORT` is injected by Railway automatically – do **not** set it manually.

5. (Optional) Set the health-check path to `/health` in the Railway service settings under **Settings → Health Check Path**.

---

## Adding models

Edit `src/server.js` and call `registerModel` with a name and an async loader function:

```js
const { registerModel } = require('./models');

registerModel('my-model', async () => {
  // download weights, initialise runtime, etc.
  await loadMyModel();
});
```

The service will start accepting requests immediately while the model loads in the background. The `/health` endpoint reflects the current load state of every registered model.

---

## Running tests

```bash
npm test
```

Tests use [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest). The test suite covers:

- HTTP 200 response from `/health`
- Correct JSON shape (`status`, `models` fields)
- Response time under 500 ms
- CORS behaviour for listed/unlisted origins and server-to-server calls
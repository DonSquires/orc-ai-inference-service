# ONNX Models

Place your model files in this folder before Railway builds the Docker image.
You have two options — pick one and follow the steps below.

---

## Option A — Commit models to the repo (simplest)

Best for getting started quickly. The `.onnx` files are packaged directly
inside the Docker container.

**Steps:**

1. Remove the `*.onnx` line from the root `.gitignore`.
2. Copy your model files here:
   ```
   inference-service/models/yolo.onnx
   inference-service/models/embedder.onnx
   ```
3. Commit and push. Railway will include them in the next build automatically.

**Pros:** no extra setup, loads instantly in the container.  
**Cons:** repo size grows; models become version-controlled.

---

## Option B — Download models during Docker build (recommended for large models)

The repo stays clean. The `Dockerfile` downloads the models from external
storage at build time. See the commented-out `RUN curl` lines in
`inference-service/Dockerfile` for the template.

**Supported storage locations:**

| Option               | Notes                                    |
|----------------------|------------------------------------------|
| GitHub Releases      | Free, common for open weights            |
| Supabase Storage     | Public bucket or signed URL              |
| Cloudflare R2        | Low-cost S3-compatible                   |
| AWS S3               | Standard object storage                  |

**Steps:**

1. Upload `yolo.onnx` and `embedder.onnx` to your chosen storage.
2. Copy the public (or pre-signed) URLs.
3. Uncomment and fill in the `RUN curl` lines in `inference-service/Dockerfile`:
   ```dockerfile
   RUN curl -fsSL "https://your-bucket/models/yolo.onnx" -o ./models/yolo.onnx
   RUN curl -fsSL "https://your-bucket/models/embedder.onnx" -o ./models/embedder.onnx
   ```
4. Commit and push. Railway will download the models during the next build.

**Pros:** repo stays small; easy to update models independently.  
**Cons:** build time increases; URLs must remain accessible during builds.

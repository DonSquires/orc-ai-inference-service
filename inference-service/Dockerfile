FROM node:18-slim
RUN apt-get update && apt-get install -y ca-certificates curl python3 make g++ libc6-dev libvips-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

# ── ONNX model loading ──────────────────────────────────────────────────────
#
# Option A (simplest): commit .onnx files to the repo.
#   Remove *.onnx from the root .gitignore, copy the files to
#   inference-service/models/, and push.  Railway will package them here.
#
# Option B (recommended for large models): download during build.
#   Upload your models to external storage and uncomment + fill in the lines
#   below with the public (or pre-signed) URLs.
#
# RUN curl -fsSL "https://your-bucket/models/yolo.onnx"      -o ./models/yolo.onnx
# RUN curl -fsSL "https://your-bucket/models/embedder.onnx"  -o ./models/embedder.onnx
#
# See inference-service/models/README.md for full instructions.
# ───────────────────────────────────────────────────────────────────────────

EXPOSE 3000
CMD ["npm", "start"]

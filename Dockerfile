# syntax=docker/dockerfile:1
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim

ARG MODEL_TAG=v1-models
ENV MODEL_DIR=/app/models

WORKDIR /app

# Install curl for model downloads
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# Download ONNX models from the GitHub release (fails fast on 404 / auth errors)
RUN mkdir -p /app/models \
 && curl -fSL \
      "https://github.com/DonSquires/orc-ai-inference-service/releases/download/${MODEL_TAG}/yolov10.onnx" \
      -o /app/models/yolov10.onnx \
 && curl -fSL \
      "https://github.com/DonSquires/orc-ai-inference-service/releases/download/${MODEL_TAG}/embedder.onnx" \
      -o /app/models/embedder.onnx \
 && ls -lh /app/models/*.onnx

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/

EXPOSE 8080
ENV PORT=8080

CMD ["node", "src/server.js"]

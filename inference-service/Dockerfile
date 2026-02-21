# syntax=docker/dockerfile:1
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim

ARG MODEL_TAG=v1-models

WORKDIR /app

# Install curl for model downloads
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# Download ONNX models from GitHub release — fails fast on 404 / auth errors
RUN mkdir -p /app/models \
 && curl -fSL \
      "https://github.com/DonSquires/orc-ai-inference-service/releases/download/${MODEL_TAG}/yolov10.onnx" \
      -o /app/models/yolo.onnx \
 && ls -lh /app/models/yolo.onnx \
 && curl -fSL \
      "https://github.com/DonSquires/orc-ai-inference-service/releases/download/${MODEL_TAG}/embedder.onnx" \
      -o /app/models/embedder.onnx \
 && ls -lh /app/models/embedder.onnx \
 && node -e " \
      const fs=require('fs'); \
      const minBytes=5*1024*1024; /* 5 MB — reject placeholder/truncated files */ \
      ['yolo.onnx','embedder.onnx'].forEach(f=>{ \
        const sz=fs.statSync('/app/models/'+f).size; \
        if(sz<minBytes){process.stderr.write('FATAL: '+f+' is only '+sz+' bytes (<5 MB)\n');process.exit(1);} \
        process.stdout.write(f+': '+sz+' bytes OK\n'); \
      }); \
    "

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY server.js ./

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]

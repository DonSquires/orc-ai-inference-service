FROM node:18-slim

# Install native dependencies required for ONNX runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download ONNX model assets from GitHub Releases
# https://github.com/DonSquires/orc-ai-inference-service/releases/tag/v1-models
RUN mkdir -p /app/models
RUN curl -fsSL "https://github.com/DonSquires/orc-ai-inference-service/releases/download/v1-models/yolov10.onnx" -o /app/models/yolo.onnx
RUN curl -fsSL "https://github.com/DonSquires/orc-ai-inference-service/releases/download/v1-models/embedder.onnx" -o /app/models/embedder.onnx

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

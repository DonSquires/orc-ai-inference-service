FROM node:18-slim

# Install native dependencies required by onnxruntime-node
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies first (layer cache friendly)
COPY package.json ./
RUN npm install --omit=dev

# Download ONNX models from the v1-models release
# embedder.onnx is required; yolov10.onnx is optional (build continues if absent)
RUN mkdir -p models \
  && curl -fSL "https://github.com/DonSquires/orc-ai-inference-service/releases/download/v1-models/embedder.onnx" \
       -o models/embedder.onnx \
  && (curl -fSL "https://github.com/DonSquires/orc-ai-inference-service/releases/download/v1-models/yolov10.onnx" \
       -o models/yolov10.onnx \
       || echo "INFO: yolov10.onnx not found in release – service will start in degraded mode") \
  && ls -lh models/

COPY server.js ./

EXPOSE 3000

CMD ["npm", "start"]

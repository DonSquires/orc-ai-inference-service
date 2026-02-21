# syntax=docker/dockerfile:1
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim

ARG MODEL_TAG=v1-models
ENV MODEL_DIR=/app/models
ENV MODEL_TAG=${MODEL_TAG}

WORKDIR /app

# Install Node dependencies first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the download script and source
COPY scripts/ ./scripts/
COPY src/ ./src/

# Download ONNX models using the Node script (fails fast on error/size mismatch)
RUN npm run download-models

EXPOSE 8080
ENV PORT=8080

CMD ["node", "src/server.js"]
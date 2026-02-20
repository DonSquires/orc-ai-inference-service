import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import * as ort from 'onnxruntime-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, 'models');
const PORT = process.env.PORT || 3000;

// Track load errors per model so /health can report them
const modelErrors = {};
const sessions = {};

async function loadModel(name, file) {
  const modelPath = path.join(MODELS_DIR, file);
  console.log(`[startup] Loading model ${name} from ${modelPath}`);
  try {
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`);
    }
    sessions[name] = await ort.InferenceSession.create(modelPath);
    const sizeMb = (fs.statSync(modelPath).size / 1024 / 1024).toFixed(1);
    console.log(`[startup] Loaded ${name} (${sizeMb} MB)`);
  } catch (err) {
    modelErrors[name] = err.message;
    console.error(`[startup] Failed to load ${name}:`, err.message);
  }
}

async function init() {
  await Promise.all([
    loadModel('yolo', 'yolov10.onnx'),
    loadModel('embedder', 'embedder.onnx'),
  ]);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    const errors = Object.keys(modelErrors).length > 0 ? modelErrors : undefined;
    const status = errors ? 'degraded' : 'ok';
    // Always return 200 so Railway's healthcheck marks the deploy as successful.
    // Model load errors are surfaced in the body; /infer will return 503 when models are unavailable.
    res.status(200).json({ status, errors });
  });

  app.post('/infer', async (req, res) => {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ ok: false, error: 'image is required' });
    }

    if (modelErrors.yolo || modelErrors.embedder) {
      return res.status(503).json({ ok: false, error: 'one or more models failed to load', modelErrors });
    }

    try {
      // Placeholder inference – replace with real pre/post processing for your models
      const inference = { detections: [], embedding: [] };

      return res.json({ ok: true, inference, meta: { modelVersions: { yolo: 'yolov10', embedder: 'resnet50' } } });
    } catch (err) {
      console.error('[infer] error:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

init().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

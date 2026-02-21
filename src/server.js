import express from 'express';
import * as ort from 'onnxruntime-node';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = process.env.MODEL_DIR || join(__dirname, '..', 'models');

const modelState = {
  yolo:      { status: 'missing', error: null, session: null },
  embedding: { status: 'missing', error: null, session: null },
};

async function loadModel(name, filename) {
  const modelPath = join(MODEL_DIR, filename);
  if (!existsSync(modelPath)) {
    console.log(`[startup] ${name}: file not found at ${modelPath}`);
    return;
  }
  try {
    modelState[name].session = await ort.InferenceSession.create(modelPath);
    modelState[name].status = 'loaded';
    console.log(`[startup] ${name}: loaded OK`);
  } catch (err) {
    modelState[name].status = 'error';
    modelState[name].error = err.message;
    console.error(`[startup] ${name}: load error — ${err.message}`);
  }
}

async function initModels() {
  console.log(`[startup] Loading models from ${MODEL_DIR}`);
  await Promise.all([
    loadModel('yolo',      'yolov10.onnx'),
    loadModel('embedding', 'embedder.onnx'),
  ]);
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    models: {
      yolo:      modelState.yolo.status,
      embedding: modelState.embedding.status,
    },
    errors: {
      yolo:      modelState.yolo.error,
      embedding: modelState.embedding.error,
    },
  });
});

app.post('/infer', (_req, res) => {
  res.status(501).json({ error: 'Inference not implemented yet.' });
});

const PORT = parseInt(process.env.PORT || '8080', 10);

initModels().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
});

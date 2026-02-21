import express from 'express';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = process.env.MODEL_DIR || join(__dirname, 'models');

// Confidence threshold for YOLO detections
const YOLO_CONF_THRESHOLD = parseFloat(process.env.YOLO_CONF_THRESHOLD || '0.25');

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
    loadModel('yolo',      'yolo.onnx'),
    loadModel('embedding', 'embedder.onnx'),
  ]);
}

function areBothModelsLoaded() {
  return (
    modelState.yolo.status === 'loaded' &&
    modelState.embedding.status === 'loaded'
  );
}

function buildModelStateBody(status) {
  return {
    status,
    models: {
      yolo:      modelState.yolo.status,
      embedding: modelState.embedding.status,
    },
    errors: {
      yolo:      modelState.yolo.error,
      embedding: modelState.embedding.error,
    },
  };
}

// Pre-process image buffer for YOLOv10: resize 640×640, RGB float32 [0,1], NCHW layout.
// Note: 'fill' stretches the image to exactly 640×640 (no padding). This matches the
// typical YOLOv10 preprocessing used during training and is consistent across all
// aspect ratios. Bounding box coordinates in the output are relative to the 640×640 space.
async function preprocessForYolo(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(640, 640, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const float32 = new Float32Array(3 * 640 * 640);
  for (let i = 0; i < 640 * 640; i++) {
    float32[i]               = data[i * 3]     / 255.0; // R
    float32[640 * 640 + i]   = data[i * 3 + 1] / 255.0; // G
    float32[2 * 640 * 640 + i] = data[i * 3 + 2] / 255.0; // B
  }
  return new ort.Tensor('float32', float32, [1, 3, 640, 640]);
}

// Pre-process image crop for embedder: resize 224×224, ImageNet-normalize, NCHW layout
async function preprocessForEmbedder(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(224, 224, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // ImageNet mean/std normalization
  const mean = [0.485, 0.456, 0.406];
  const std  = [0.229, 0.224, 0.225];
  const float32 = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++) {
    float32[i]               = (data[i * 3]     / 255.0 - mean[0]) / std[0];
    float32[224 * 224 + i]   = (data[i * 3 + 1] / 255.0 - mean[1]) / std[1];
    float32[2 * 224 * 224 + i] = (data[i * 3 + 2] / 255.0 - mean[2]) / std[2];
  }
  return new ort.Tensor('float32', float32, [1, 3, 224, 224]);
}

// Parse YOLOv10 output tensor into detection objects.
// Expected shape: [1, N, 6] where each row is [x1, y1, x2, y2, score, classId],
// coordinates normalised to [0, 1] relative to the 640×640 input.
function parseYoloOutput(outputTensor, confThreshold) {
  const data = outputTensor.data;
  const numBoxes = outputTensor.dims[1];
  const detections = [];
  for (let i = 0; i < numBoxes; i++) {
    const offset = i * 6;
    const score = data[offset + 4];
    if (score < confThreshold) continue;
    detections.push({
      bbox:      [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]],
      confidence: score,
      classId:    Math.round(data[offset + 5]),
    });
  }
  return detections;
}

// Clamp and convert a normalised bounding box to pixel coordinates
function clampBbox(bbox, origWidth, origHeight) {
  const [x1n, y1n, x2n, y2n] = bbox;
  const left   = Math.max(0, Math.round(x1n * origWidth));
  const top    = Math.max(0, Math.round(y1n * origHeight));
  const width  = Math.max(1, Math.min(origWidth  - left, Math.round((x2n - x1n) * origWidth)));
  const height = Math.max(1, Math.min(origHeight - top,  Math.round((y2n - y1n) * origHeight)));
  return { left, top, width, height };
}

// Crop a normalised bounding box from the original image buffer
async function cropBbox(imageBuffer, bbox, origWidth, origHeight) {
  return sharp(imageBuffer).extract(clampBbox(bbox, origWidth, origHeight)).toBuffer();
}

const app = express();
// Increase limit to accept base64-encoded images (up to ~10 MB encoded)
app.use(express.json({ limit: '10mb' }));

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

app.get('/ready', (_req, res) => {
  const ready = areBothModelsLoaded();
  res.status(ready ? 200 : 503).json(buildModelStateBody(ready ? 'ready' : 'not_ready'));
});

app.post('/infer', async (req, res) => {
  if (!areBothModelsLoaded()) {
    return res.status(503).json(buildModelStateBody('not_ready'));
  }

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing or invalid "image" field (expected base64 string).' });
  }

  const startMs = Date.now();
  try {
    const imageBuffer = Buffer.from(image, 'base64');
    const { width: origW, height: origH } = await sharp(imageBuffer).metadata();

    // 1. Run YOLOv10 detection
    const yoloTensor    = await preprocessForYolo(imageBuffer);
    const yoloInputName = modelState.yolo.session.inputNames[0];
    const yoloOutputs   = await modelState.yolo.session.run({ [yoloInputName]: yoloTensor });
    const yoloOut       = yoloOutputs[modelState.yolo.session.outputNames[0]];
    const rawDetections = parseYoloOutput(yoloOut, YOLO_CONF_THRESHOLD);

    // 2. For each detection, crop and embed
    const detections = await Promise.all(rawDetections.map(async (det) => {
      const crop          = await cropBbox(imageBuffer, det.bbox, origW, origH);
      const embedTensor   = await preprocessForEmbedder(crop);
      const embedInputName = modelState.embedding.session.inputNames[0];
      const embedOutputs  = await modelState.embedding.session.run({ [embedInputName]: embedTensor });
      const embedOut      = embedOutputs[modelState.embedding.session.outputNames[0]];
      const embedding     = Array.from(embedOut.data);
      return { bbox: det.bbox, confidence: det.confidence, classId: det.classId, embedding };
    }));

    res.status(200).json({
      ok: true,
      inference: { detections },
      meta: {
        model:            'yolov10+embedder',
        processingMs:     Date.now() - startMs,
        detectionsCount:  detections.length,
      },
    });
  } catch (err) {
    console.error('[infer] error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

initModels().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
});

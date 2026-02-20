import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";
import fs from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Log whether ONNX model files are present and their sizes on startup
function logFileStatus(p) {
  try {
    const s = fs.statSync(p);
    console.log(`ℹ️  File present: ${p}  (${s.size} bytes)`);
  } catch {
    console.warn(`⚠️  File missing: ${p}`);
  }
}
logFileStatus(join(__dirname, "models", "yolo.onnx"));
logFileStatus(join(__dirname, "models", "embedder.onnx"));

const PORT = process.env.PORT || 3000;
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.length === 0 || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

const app = express();
app.use(corsMiddleware);
app.use(bodyParser.json({ limit: "20mb" }));

// LOAD MODELS (YOLO + Embedding)
let yoloModel = null;
let embedModel = null;
const modelErrors = { yolo: null, embedding: null };

async function loadModels() {
  try {
    yoloModel = await InferenceSession.create(join(__dirname, "models", "yolo.onnx"));
    console.log("✅ YOLO model loaded");
  } catch (e) {
    modelErrors.yolo = String(e?.message || e);
    console.warn("⚠️  YOLO load error:", modelErrors.yolo);
  }
  try {
    embedModel = await InferenceSession.create(join(__dirname, "models", "embedder.onnx"));
    console.log("✅ Embedder model loaded");
  } catch (e) {
    modelErrors.embedding = String(e?.message || e);
    console.warn("⚠️  Embedder load error:", modelErrors.embedding);
  }
}

loadModels();

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    models: {
      yolo: yoloModel ? "loaded" : "not loaded",
      embedding: embedModel ? "loaded" : "not loaded",
    },
    errors: modelErrors,
  });
});

function toCHWFloat32(raw, width, height) {
  const chw = new Float32Array(3 * width * height);
  let rawIdx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = raw[rawIdx++], g = raw[rawIdx++], b = raw[rawIdx++];
      const idx = y * width + x;
      chw[idx] = r / 255;                       // R
      chw[width * height + idx] = g / 255;      // G
      chw[2 * width * height + idx] = b / 255;  // B
    }
  }
  return chw;
}

// MAIN INFERENCE ENDPOINT
app.post("/infer", async (req, res) => {
  try {
    const { image } = req.body;
    if (typeof image !== "string" || !image.includes(",")) {
      return res.status(400).json({ error: "Missing or invalid image (base64 dataURL expected)" });
    }
    const base64 = image.split(",")[1];
    const buf = Buffer.from(base64, "base64");
    const width = 640, height = 640;

    const raw = await sharp(buf)
      .resize(width, height, { fit: "cover" })
      .removeAlpha()
      .toColorspace("srgb")
      .raw()
      .toBuffer();

    const chw = toCHWFloat32(raw, width, height);
    const input = new Tensor("float32", chw, [1, 3, height, width]);

    if (!embedModel) return res.status(503).json({ error: "Embedding model not loaded" });

    const out = await embedModel.run({ input });
    const firstKey = Object.keys(out)[0];
    const outputTensor = out[firstKey];
    const embedding = Array.from(outputTensor.data);

    res.json({ embedding, quality: null, model_version: "v1.0.0" });
  } catch (err) {
    console.error("❌ /infer error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// START SERVER
app.listen(PORT, () => console.log(`🔥 ORC AI Service running on port ${PORT}`));

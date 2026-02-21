import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";

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

async function loadModels() {
  try {
    yoloModel = await InferenceSession.create("./models/yolo.onnx");
    embedModel = await InferenceSession.create("./models/embedder.onnx");
    console.log("✅ Models loaded");
  } catch (e) {
    console.warn("⚠️ Models not loaded yet (will report 'not loaded' in /health):", e.message);
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

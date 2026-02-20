import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";

const app = express();
app.use(bodyParser.json({ limit: "15mb" }));

// ALLOW SUPABASE + PREVIEW DOMAINS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// LOAD MODELS (YOLO + Embedding)
let yoloModel = null;
let embedModel = null;

async function loadModels() {
  yoloModel = await InferenceSession.create("./models/yolo.onnx");
  embedModel = await InferenceSession.create("./models/embedder.onnx");
  console.log("✅ Models loaded");
}

loadModels().catch((err) => {
  console.error("⚠️  Model loading failed:", err.message);
});

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

// MAIN INFERENCE ENDPOINT
app.post("/infer", async (req, res) => {
  try {
    const { image } = req.body; // base64 string
    const base64 = image.split(",")[1];
    const imgBuffer = Buffer.from(base64, "base64");

    // PREPROCESS IMAGE → 640x640
    const processed = await sharp(imgBuffer)
      .resize(640, 640)
      .toFormat("png")
      .raw()
      .toBuffer();

    const inputTensor = new Tensor("float32", new Float32Array(processed), [
      1, 3, 640, 640,
    ]);

    // YOLO DETECTION
    const det = await yoloModel.run({ images: inputTensor });

    // For now we assume vehicle is detected; use entire image
    const embed = await embedModel.run({ input: inputTensor });
    const embedding = Array.from(embed.output.data);

    res.json({
      embedding,
      quality: null, // placeholder — replace with computed value
      model_version: "v1.0",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// START SERVER
app.listen(process.env.PORT || 3000, () =>
  console.log("🔥 ORC AI Service running on port", process.env.PORT || 3000)
);

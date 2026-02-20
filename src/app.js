'use strict';

const express = require('express');
const cors = require('cors');
const { getModels, isReady } = require('./models');

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------

/**
 * Parse the ALLOWED_ORIGINS env var (comma-separated) into an array.
 * When the env var is absent the value is '*', which allows all origins –
 * safe for server-to-server calls and local dev.
 */
function buildCorsOptions() {
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw || raw === '*') {
    return { origin: '*' };
  }

  const allowed = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return {
    origin(origin, callback) {
      // Allow requests with no origin header (server-to-server, curl, etc.)
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// App factory (exported so tests can import without binding a port)
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();

  app.use(cors(buildCorsOptions()));
  app.use(express.json());

  // ------------------------------------------------------------------
  // Health check – must respond quickly, even while models are loading
  // ------------------------------------------------------------------
  app.get('/health', (_req, res) => {
    const models = getModels();
    const ready = isReady();
    res.status(200).json({
      status: ready ? 'healthy' : 'warming_up',
      models,
    });
  });

  return app;
}

module.exports = { createApp };

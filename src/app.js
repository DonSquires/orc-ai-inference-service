'use strict';

const express = require('express');
const cors = require('cors');
const { getModels } = require('./models');

function createApp() {
  const app = express();

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    })
  );

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const models = await getModels();
    res.json({ status: 'healthy', models });
  });

  return app;
}

module.exports = { createApp };

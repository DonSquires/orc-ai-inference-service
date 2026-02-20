'use strict';

const { createApp } = require('./app');
const { registerModel } = require('./models');

// ---------------------------------------------------------------------------
// Register models (add real loaders here)
// ---------------------------------------------------------------------------

// Example stub – replace with actual model initialisation:
// registerModel('my-model', async () => { await loadMyModel(); });

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const HOST = '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
});

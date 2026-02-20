'use strict';

const request = require('supertest');
const { createApp } = require('../app');

describe('GET /health', () => {
  let app;

  beforeEach(() => {
    // Re-require models so each test starts with a fresh registry
    jest.resetModules();
    const { createApp: freshCreateApp } = require('../app');
    app = freshCreateApp();
  });

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('returns JSON with status and models fields', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('models');
  });

  it('status is "healthy" or "warming_up"', async () => {
    const res = await request(app).get('/health');
    expect(['healthy', 'warming_up']).toContain(res.body.status);
  });

  it('responds quickly (under 500 ms)', async () => {
    const start = Date.now();
    await request(app).get('/health');
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe('CORS behaviour', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
  });

  it('allows all origins when ALLOWED_ORIGINS is not set', async () => {
    delete process.env.ALLOWED_ORIGINS;
    jest.resetModules();
    const { createApp: freshCreateApp } = require('../app');
    const app = freshCreateApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://example.com');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('allows a listed origin when ALLOWED_ORIGINS is set', async () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com,https://other.example.com';
    jest.resetModules();
    const { createApp: freshCreateApp } = require('../app');
    const app = freshCreateApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://allowed.example.com');

    expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example.com');
  });

  it('blocks an unlisted origin when ALLOWED_ORIGINS is set', async () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';
    jest.resetModules();
    const { createApp: freshCreateApp } = require('../app');
    const app = freshCreateApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(500); // Express default for CORS errors
  });

  it('allows server-to-server calls (no Origin header) even with ALLOWED_ORIGINS set', async () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';
    jest.resetModules();
    const { createApp: freshCreateApp } = require('../app');
    const app = freshCreateApp();

    const res = await request(app).get('/health'); // no Origin header
    expect(res.status).toBe(200);
  });
});

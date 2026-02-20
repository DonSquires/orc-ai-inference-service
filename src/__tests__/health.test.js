'use strict';

const request = require('supertest');
const { createApp } = require('../app');

describe('GET /health', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('returns models array', async () => {
    const res = await request(app).get('/health');
    expect(Array.isArray(res.body.models)).toBe(true);
  });
});

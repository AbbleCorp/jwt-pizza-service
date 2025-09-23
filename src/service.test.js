const request = require('supertest');
const app = require('./service');

test('GET / returns welcome message and version', async () => {
  const res = await request(app).get('/');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('message', 'welcome to JWT Pizza');
  expect(res.body).toHaveProperty('version');
});

test('GET /unknown returns 404', async () => {
  const res = await request(app).get('/unknown');
  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty('message', 'unknown endpoint');
});

test('GET /api/docs returns API docs', async () => {
  const res = await request(app).get('/api/docs');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('version');
  expect(res.body).toHaveProperty('endpoints');
  expect(Array.isArray(res.body.endpoints)).toBe(true);
  expect(res.body).toHaveProperty('config');
  expect(res.body.config).toHaveProperty('factory');
  expect(res.body.config).toHaveProperty('db');
});
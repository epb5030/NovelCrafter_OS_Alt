import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-template-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Sample Novel Template API (/api/projects/sample-template)', () => {
  it('should create a fully pre-populated sample novel project', async () => {
    const { app } = await import('../index');
    const res = await request(app).post('/api/projects/sample-template');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('The Cartographer of Eldoria');
    expect(res.body.genre).toBe('High Fantasy / Exploration');

    const projectId = res.body.id;

    // Verify Codex entries were populated
    const codexRes = await request(app).get(`/api/projects/${projectId}/codex`);
    expect(codexRes.status).toBe(200);
    expect(codexRes.body.length).toBeGreaterThanOrEqual(5);

    // Verify Outline (Acts & Scenes) were populated
    const outlineRes = await request(app).get(`/api/projects/${projectId}/outline`);
    expect(outlineRes.status).toBe(200);
    expect(outlineRes.body.length).toBeGreaterThanOrEqual(4);

    // Verify Map pins were populated
    const pinsRes = await request(app).get(`/api/projects/${projectId}/map/pins`);
    expect(pinsRes.status).toBe(200);
    expect(pinsRes.body.length).toBeGreaterThanOrEqual(2);

    // Verify Timeline events were populated
    const timelineRes = await request(app).get(`/api/projects/${projectId}/timeline`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.events.length).toBeGreaterThanOrEqual(2);
  });
});

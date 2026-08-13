import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;
let subplotId: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-subplots-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'Subplot & Plot Hole Test Project',
    summary: 'Testing story thread management and unresolved plot hole alerts',
    genre: 'Mystery'
  });
  projectId = projectRes.body.id;
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Subplot & Plot Hole Tracker API', () => {
  it('should create a new subplot thread', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .post(`/api/projects/${projectId}/subplots`)
      .send({
        title: 'The Stolen Family Heirloom',
        category: 'mystery',
        status: 'introduced',
        summary: 'A secret key hidden inside the clock tower',
        unresolvedHook: true
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('The Stolen Family Heirloom');
    expect(res.body.unresolved_hook).toBe(1);
    subplotId = res.body.id;
  });

  it('should fetch project subplots', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${projectId}/subplots`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].category).toBe('mystery');
  });

  it('should update subplot status to resolved', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .put(`/api/projects/${projectId}/subplots/${subplotId}`)
      .send({
        status: 'resolved',
        summary: 'Resolved in chapter 14 during the ball'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });

  it('should delete a subplot thread', async () => {
    const { app } = await import('../index');
    const res = await request(app).delete(`/api/projects/${projectId}/subplots/${subplotId}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');

    const checkRes = await request(app).get(`/api/projects/${projectId}/subplots`);
    expect(checkRes.body.length).toBe(0);
  });
});

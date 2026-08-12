import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;
let entry1Id: number;
let entry2Id: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-graph-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'Graph Visualizer Test Project',
    summary: 'Testing relationship graph filtering and coordinate persistence',
    genre: 'Fantasy'
  });
  projectId = projectRes.body.id;

  const entry1Res = await request(app).post(`/api/projects/${projectId}/codex`).send({
    name: 'Valerius',
    category: 'character',
    description: 'Protagonist cartographer'
  });
  entry1Id = entry1Res.body.id;

  const entry2Res = await request(app).post(`/api/projects/${projectId}/codex`).send({
    name: 'Highspire Citadel',
    category: 'location',
    description: 'Ancient fortress city'
  });
  entry2Id = entry2Res.body.id;

  await request(app).post(`/api/projects/${projectId}/codex-relationships`).send({
    source_id: entry1Id,
    target_id: entry2Id,
    relationship_type: 'located_in',
    description: 'Valerius resides in the citadel.'
  });
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Codex Relationship Graph & Position Persistence API', () => {
  it('should save and update 2D graph layout coordinates', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .put(`/api/projects/${projectId}/codex/graph-positions`)
      .send({
        positions: {
          [entry1Id]: { x: 150.5, y: 220.0 },
          [entry2Id]: { x: 400.0, y: 350.5 }
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify coordinates persisted in codex entries query
    const codexRes = await request(app).get(`/api/projects/${projectId}/codex`);
    expect(codexRes.status).toBe(200);
    const valerius = codexRes.body.find((e: any) => e.id === entry1Id);
    expect(valerius.pos_x).toBeCloseTo(150.5);
    expect(valerius.pos_y).toBeCloseTo(220.0);
  });

  it('should fetch project relationship links for network graph rendering', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${projectId}/codex-relationships`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].relationship_type).toBe('located_in');
  });
});

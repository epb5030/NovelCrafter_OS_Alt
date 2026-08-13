import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;
let actId: number;
let chapId: number;
let scene1Id: number;
let scene2Id: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-corkboard-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'Corkboard Studio Test Project',
    summary: 'Testing scene card reordering and metadata status updates',
    genre: 'Fantasy'
  });
  projectId = projectRes.body.id;

  const actRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    type: 'act',
    title: 'Act I',
    position: 1
  });
  actId = actRes.body.id;

  const chapRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: actId,
    type: 'chapter',
    title: 'Chapter 1',
    position: 1
  });
  chapId = chapRes.body.id;

  const s1Res = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: chapId,
    type: 'scene',
    title: 'Scene 1: The Gateway',
    position: 1,
    status: 'drafting'
  });
  scene1Id = s1Res.body.id;

  const s2Res = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: chapId,
    type: 'scene',
    title: 'Scene 2: Into the Shadows',
    position: 2,
    status: 'todo'
  });
  scene2Id = s2Res.body.id;
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Corkboard Studio & Outline Position Reordering API', () => {
  it('should batch update outline scene card positions', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .put(`/api/projects/${projectId}/outline/positions`)
      .send({
        positions: [
          { id: scene1Id, position: 2, parent_id: chapId },
          { id: scene2Id, position: 1, parent_id: chapId }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const outlineRes = await request(app).get(`/api/projects/${projectId}/outline`);
    expect(outlineRes.status).toBe(200);
    const scenes = outlineRes.body.filter((e: any) => e.type === 'scene');
    const s1 = scenes.find((s: any) => s.id === scene1Id);
    const s2 = scenes.find((s: any) => s.id === scene2Id);
    expect(s1.position).toBe(2);
    expect(s2.position).toBe(1);
  });

  it('should update scene card status and POV metadata', async () => {
    const { app } = await import('../index');
    const metadataStr = JSON.stringify({ pov: 'Valerius', targetWords: 2000 });
    const res = await request(app)
      .put(`/api/projects/${projectId}/outline/${scene1Id}`)
      .send({
        title: 'Scene 1: The Gateway (Updated)',
        summary: 'Valerius unlocks the star portal.',
        status: 'review',
        metadata: metadataStr
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('review');
    expect(res.body.summary).toContain('star portal');
  });
});

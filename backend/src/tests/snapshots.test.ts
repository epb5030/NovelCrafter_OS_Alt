import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;
let sceneId: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-snapshots-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'Version History Test Project',
    summary: 'Testing scene snapshot history and restoration',
    genre: 'Sci-Fi'
  });
  projectId = projectRes.body.id;

  const actRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    type: 'act',
    title: 'Act I',
    position: 1
  });

  const chapRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: actRes.body.id,
    type: 'chapter',
    title: 'Chapter 1',
    position: 1
  });

  const sceneRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: chapRes.body.id,
    type: 'scene',
    title: 'Scene 1',
    position: 1
  });
  sceneId = sceneRes.body.id;

  // Save initial prose content
  await request(app).put(`/api/scenes/${sceneId}/content`).send({
    content: 'The stars shone bright over the orbital station.'
  });
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Scene Version History & Snapshots API (/api/scenes/:sceneId/snapshots)', () => {
  let createdSnapshotId: number;

  it('should list empty snapshots initially', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/scenes/${sceneId}/snapshots`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('should create a manual snapshot', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/scenes/${sceneId}/snapshots`).send({
      content: 'Draft 1: The stars shone bright over the orbital station in deep cosmos.',
      label: 'Initial Draft Complete',
      source: 'manual'
    });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Initial Draft Complete');
    expect(res.body.word_count).toBe(13);
    createdSnapshotId = res.body.id;
  });

  it('should fetch snapshot details by ID', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/scenes/${sceneId}/snapshots/${createdSnapshotId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdSnapshotId);
    expect(res.body.content).toContain('deep cosmos');
  });

  it('should restore a snapshot and create a safety backup of current scene prose', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/scenes/${sceneId}/snapshots/${createdSnapshotId}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restoredContent).toContain('deep cosmos');

    // Verify snapshot history now contains the restored snapshot and the safety backup
    const listRes = await request(app).get(`/api/scenes/${sceneId}/snapshots`);
    expect(listRes.body.length).toBeGreaterThanOrEqual(2);
    expect(listRes.body.some((s: any) => s.source === 'safety_backup')).toBe(true);
  });

  it('should delete a snapshot', async () => {
    const { app } = await import('../index');
    const res = await request(app).delete(`/api/scenes/${sceneId}/snapshots/${createdSnapshotId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

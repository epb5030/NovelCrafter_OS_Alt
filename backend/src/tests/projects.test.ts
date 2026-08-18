import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-projects-'));
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

describe('Projects API (/api/projects)', () => {
  let createdProjectId: number;

  it('should return empty list initially or existing projects array', async () => {
    const { app } = await import('../index');
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 400 when creating a project without title', async () => {
    const { app } = await import('../index');
    const res = await request(app).post('/api/projects').send({ summary: 'No title provided' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should create a new project successfully', async () => {
    const { app } = await import('../index');
    const res = await request(app).post('/api/projects').send({
      title: 'The Cartographer of Eldoria',
      summary: 'A mapmaker discovers a hidden realm',
      genre: 'High Fantasy'
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('The Cartographer of Eldoria');
    expect(res.body.genre).toBe('High Fantasy');
    createdProjectId = res.body.id;
  });

  it('should fetch details of the created project', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${createdProjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdProjectId);
    expect(res.body.title).toBe('The Cartographer of Eldoria');
  });

  it('should return 404 for a non-existent project', async () => {
    const { app } = await import('../index');
    const res = await request(app).get('/api/projects/999999');
    expect(res.status).toBe(404);
  });

  it('should update project title and summary', async () => {
    const { app } = await import('../index');
    const res = await request(app).put(`/api/projects/${createdProjectId}`).send({
      title: 'The Cartographer of Eldoria: Revised Edition',
      summary: 'Updated epic fantasy summary',
      genre: 'Epic Fantasy'
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('The Cartographer of Eldoria: Revised Edition');
    expect(res.body.genre).toBe('Epic Fantasy');
  });

  it('should preserve parent_id and position when performing partial updates on outline elements', async () => {
    const { app } = await import('../index');
    
    // Create test project
    const projRes = await request(app).post('/api/projects').send({
      title: 'Partial Update Test Project',
      summary: 'Testing outline element partial update preservation'
    });
    const projId = projRes.body.id;

    // Create chapter
    const chapRes = await request(app).post(`/api/projects/${projId}/outline`).send({
      type: 'chapter',
      title: 'Chapter One',
      position: 1
    });
    const chapId = chapRes.body.id;

    // Create scene under chapter
    const sceneRes = await request(app).post(`/api/projects/${projId}/outline`).send({
      parent_id: chapId,
      type: 'scene',
      title: 'Initial Scene Title',
      position: 5,
      summary: 'Initial scene summary',
      status: 'drafting'
    });
    const sceneId = sceneRes.body.id;

    // Perform partial update with ONLY status change
    const updateRes = await request(app).put(`/api/projects/${projId}/outline/${sceneId}`).send({
      status: 'done'
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('done');
    expect(updateRes.body.parent_id).toBe(chapId);
    expect(updateRes.body.position).toBe(5);
    expect(updateRes.body.title).toBe('Initial Scene Title');
    expect(updateRes.body.summary).toBe('Initial scene summary');

    // Clean up
    await request(app).delete(`/api/projects/${projId}`);
  });

  it('should delete the created project', async () => {
    const { app } = await import('../index');
    const res = await request(app).delete(`/api/projects/${createdProjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/api/projects/${createdProjectId}`);
    expect(getRes.status).toBe(404);
  });
});

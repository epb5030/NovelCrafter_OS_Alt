import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;
let locationCodexId: number;
let characterCodexId: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-map-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'Cartography Test World',
    summary: 'World map and journey tracking',
    genre: 'Fantasy'
  });
  projectId = projectRes.body.id;

  const locRes = await request(app).post(`/api/projects/${projectId}/codex`).send({
    name: 'Dragon Pass Fortress',
    category: 'location',
    description: 'Guarded mountain pass.'
  });
  locationCodexId = locRes.body.id;

  const charRes = await request(app).post(`/api/projects/${projectId}/codex`).send({
    name: 'Sir Gareth',
    category: 'character',
    description: 'Knight of the Silver Order.'
  });
  characterCodexId = charRes.body.id;
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('World Cartography API (/api/projects/:id/map)', () => {
  let createdPinId: number;

  it('should return empty map pins list initially', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${projectId}/map/pins`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create a map pin manually', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/projects/${projectId}/map/pins`).send({
      title: 'Emerald Bay Capital',
      x: 35.5,
      y: 62.0,
      pin_type: 'city',
      notes: 'Harbor city with trade docks.'
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Emerald Bay Capital');
    expect(res.body.x).toBe(35.5);
    expect(res.body.pin_type).toBe('city');
    createdPinId = res.body.id;
  });

  it('should update pin position', async () => {
    const { app } = await import('../index');
    const res = await request(app).put(`/api/projects/${projectId}/map/pins/${createdPinId}`).send({
      title: 'Emerald Bay Capital City',
      x: 38.0,
      y: 65.0,
      pin_type: 'city',
      notes: 'Expanded trade hub.'
    });
    expect(res.status).toBe(200);
    expect(res.body.x).toBe(38.0);
    expect(res.body.y).toBe(65.0);
  });

  it('should auto-populate Codex locations into map pins', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/projects/${projectId}/map/auto-populate`);
    expect(res.status).toBe(200);
    expect(res.body.addedCount).toBeGreaterThanOrEqual(1);

    const pinsRes = await request(app).get(`/api/projects/${projectId}/map/pins`);
    expect(pinsRes.body.length).toBeGreaterThanOrEqual(2);
  });

  it('should create character journey path on the map', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/projects/${projectId}/map/journeys`).send({
      characterId: characterCodexId,
      pathWaypoints: [createdPinId],
      color: '#e74c3c',
      notes: 'Quest march to capital'
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.character_id).toBe(characterCodexId);
    expect(res.body.color).toBe('#e74c3c');
  });

  it('should fetch journeys for project', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${projectId}/map/journeys`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

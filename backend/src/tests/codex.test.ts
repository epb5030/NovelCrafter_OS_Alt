import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-codex-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const res = await request(app).post('/api/projects').send({
    title: 'Codex Test Realm',
    summary: 'Testing story codex and lore network',
    genre: 'Fantasy'
  });
  projectId = res.body.id;
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Codex API (/api/projects/:id/codex)', () => {
  let heroEntryId: number;
  let kingdomEntryId: number;

  it('should create a character codex entry and update voice traits', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/projects/${projectId}/codex`).send({
      name: 'Valerius the Cartographer',
      aliases: 'Val, The Pathfinder',
      category: 'character',
      description: 'Master explorer and cartographer of Eldoria.'
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Valerius the Cartographer');
    heroEntryId = res.body.id;

    // Set Character Voice Persona
    const voiceRes = await request(app).put(`/api/projects/${projectId}/codex/${heroEntryId}/voice`).send({
      voiceTraits: 'Measured, thoughtful, uses geographic metaphors',
      catchphrases: 'By the constellation of stars',
      formalityLevel: 4,
      paceCadence: 'eloquent'
    });
    expect(voiceRes.status).toBe(200);
    expect(voiceRes.body.formality_level).toBe(4);
    expect(voiceRes.body.pace_cadence).toBe('eloquent');
  });

  it('should create a location codex entry', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/projects/${projectId}/codex`).send({
      name: 'Highspire Fortress',
      category: 'location',
      description: 'Ancient stone citadel atop Mount Eldor.'
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Highspire Fortress');
    kingdomEntryId = res.body.id;
  });

  it('should list all codex entries for project', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${projectId}/codex`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('should create a relationship between codex entries', async () => {
    const { app } = await import('../index');
    const res = await request(app).post(`/api/projects/${projectId}/codex-relationships`).send({
      source_id: heroEntryId,
      target_id: kingdomEntryId,
      relationship_type: 'located_in',
      description: 'Valerius resides in Highspire Fortress'
    });
    expect(res.status).toBe(201);
    expect(res.body.relationship_type).toBe('located_in');
  });

  it('should fetch relationships for project', async () => {
    const { app } = await import('../index');
    const res = await request(app).get(`/api/projects/${projectId}/codex-relationships`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].source_id).toBe(heroEntryId);
    expect(res.body[0].target_id).toBe(kingdomEntryId);
  });

  it('should update a codex entry', async () => {
    const { app } = await import('../index');
    const res = await request(app).put(`/api/projects/${projectId}/codex/${heroEntryId}`).send({
      name: 'Valerius the Grand Cartographer',
      aliases: 'Val, High Cartographer',
      category: 'character',
      description: 'Promoted to Grand Cartographer of Eldoria.'
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Valerius the Grand Cartographer');
  });

  it('should delete a codex entry', async () => {
    const { app } = await import('../index');
    const res = await request(app).delete(`/api/projects/${projectId}/codex/${kingdomEntryId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

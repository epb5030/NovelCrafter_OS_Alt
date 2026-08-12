import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-compiler-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'The Starlight Chronicles',
    summary: 'An epic space fantasy novel',
    genre: 'Sci-Fi / Fantasy'
  });
  projectId = projectRes.body.id;

  // Create an Act, Chapter, and Scene for manuscript compilation
  const actRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    type: 'act',
    title: 'Act I: The Awakening',
    position: 1
  });

  const chapRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: actRes.body.id,
    type: 'chapter',
    title: 'Chapter 1: The Distant Signal',
    position: 1
  });

  const sceneRes = await request(app).post(`/api/projects/${projectId}/outline`).send({
    parent_id: chapRes.body.id,
    type: 'scene',
    title: 'Scene 1: Deep Space Observatory',
    position: 1
  });

  await request(app).put(`/api/scenes/${sceneRes.body.id}/content`).send({
    content: 'Captain Valerie adjusted her visor as the sensor console blared. A faint harmonic frequency resonated from the Orion nebula.\n\n"We are not alone," she whispered into the comms.'
  });
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Native Book Compiler API (/api/projects/:id/export)', () => {
  it('should compile an EPUB 3 e-book package with front-matter successfully', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .post(`/api/projects/${projectId}/export/epub`)
      .send({
        theme: 'classic',
        publisher: 'Starlight Press',
        isbn: '978-1-23456-789-0',
        language: 'en',
        dedication: 'Dedicated to stargazers and adventurers.',
        copyrightNotice: 'Copyright © 2026 E. P. Buchhalt.',
        acknowledgments: 'Special thanks to the OpenCrafter community.'
      })
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/epub+zip');
    expect(res.headers['content-disposition']).toContain('.epub');

    const buffer = Buffer.from(res.body);
    expect(buffer.length).toBeGreaterThan(0);
    // Check ZIP Magic Header (PK\x03\x04 -> 0x50 0x4B 0x03 0x04)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('should compile a Microsoft Word (.docx) manuscript with front-matter successfully', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .post(`/api/projects/${projectId}/export/docx`)
      .send({
        format: 'standard_manuscript',
        includeTitlePage: true,
        dedication: 'For dreamers everywhere.',
        acknowledgments: 'Heartfelt thanks to readers.'
      })
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(res.headers['content-disposition']).toContain('.docx');

    const buffer = Buffer.from(res.body);
    expect(buffer.length).toBeGreaterThan(0);
    // Check ZIP Magic Header for DOCX container
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});

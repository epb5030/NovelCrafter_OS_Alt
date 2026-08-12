import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-workbench-'));
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

describe('AI Prompt Tuning & Style Workbench API (/api/ai)', () => {
  it('should fetch list of preset style personas', async () => {
    const { app } = await import('../index');
    const res = await request(app).get('/api/ai/personas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
    expect(res.body.some((p: any) => p.id === 'grimdark')).toBe(true);
  });

  it('should test and compile a custom prompt template with variable placeholders', async () => {
    const { app } = await import('../index');
    const res = await request(app).post('/api/ai/test-prompt').send({
      template: 'Write prose in {{pov}} with {{tone}} tone. Input: {{prose}}. Rules: {{guidance}}',
      sampleInput: 'Valerius held the star chart.',
      pov: 'Third Person Limited',
      tone: 'Lyrical & Atmospheric',
      guidance: 'Use astronomical imagery.',
      temperature: 0.8
    });

    expect(res.status).toBe(200);
    expect(res.body.compiledPrompt).toContain('Third Person Limited');
    expect(res.body.compiledPrompt).toContain('Lyrical & Atmospheric');
    expect(res.body.compiledPrompt).toContain('Valerius held the star chart.');
    expect(res.body.compiledPrompt).toContain('Use astronomical imagery.');
    expect(res.body).toHaveProperty('simulatedOutput');
  });

  it('should return 400 when testing prompt without template', async () => {
    const { app } = await import('../index');
    const res = await request(app).post('/api/ai/test-prompt').send({});
    expect(res.status).toBe(400);
  });
});

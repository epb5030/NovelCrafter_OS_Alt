import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tempDbDir: string;
let projectId: number;
let event1Id: number;
let event2Id: number;

beforeAll(async () => {
  tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencrafter-test-timeline-'));
  process.env.DATABASE_DIR = tempDbDir;
  process.env.NODE_ENV = 'test';
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();

  const { app } = await import('../index');
  const projectRes = await request(app).post('/api/projects').send({
    title: 'Timeline Reordering Test Project',
    summary: 'Testing timeline track transfer and position reordering',
    genre: 'Sci-Fi'
  });
  projectId = projectRes.body.id;

  const e1Res = await request(app).post(`/api/projects/${projectId}/timeline`).send({
    track: 'main_story',
    title: 'Discovery of Signal',
    dateLabel: '2184-05-12',
    orderIndex: 1,
    importance: 'major'
  });
  event1Id = e1Res.body.id;

  const e2Res = await request(app).post(`/api/projects/${projectId}/timeline`).send({
    track: 'main_story',
    title: 'Arrival at Station',
    dateLabel: '2184-05-15',
    orderIndex: 2,
    importance: 'normal'
  });
  event2Id = e2Res.body.id;
});

afterAll(async () => {
  const { closeDatabase } = await import('../config/database');
  await closeDatabase();
  if (tempDbDir && fs.existsSync(tempDbDir)) {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  }
});

describe('Multi-Track Timeline Drag & Reordering API', () => {
  it('should batch reorder timeline event positions within a track', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .put(`/api/projects/${projectId}/timeline/reorder`)
      .send({
        events: [
          { id: event1Id, orderIndex: 2, track: 'main_story' },
          { id: event2Id, orderIndex: 1, track: 'main_story' }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const timelineRes = await request(app).get(`/api/projects/${projectId}/timeline`);
    expect(timelineRes.status).toBe(200);
    const eventsList = timelineRes.body.events;
    const ev1 = eventsList.find((e: any) => e.id === event1Id);
    const ev2 = eventsList.find((e: any) => e.id === event2Id);
    expect(ev1.order_index).toBe(2);
    expect(ev2.order_index).toBe(1);
  });

  it('should transfer a timeline event across tracks', async () => {
    const { app } = await import('../index');
    const res = await request(app)
      .put(`/api/projects/${projectId}/timeline/reorder`)
      .send({
        events: [
          { id: event2Id, orderIndex: 1, track: 'character_backstory' }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const timelineRes = await request(app).get(`/api/projects/${projectId}/timeline`);
    expect(timelineRes.status).toBe(200);
    const eventsList = timelineRes.body.events;
    const ev2 = eventsList.find((e: any) => e.id === event2Id);
    expect(ev2.track).toBe('character_backstory');
  });
});

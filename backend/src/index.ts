import express from 'express';
import cors from 'cors';
import { getDatabase } from './config/database';
import { AIService } from './services/ai.service';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support larger payloads for book imports/exports

// Initialize Database connection on start
getDatabase()
  .then(() => console.log('SQLite database initialized successfully.'))
  .catch(err => console.error('Failed to initialize database:', err));

// ==========================================
// 1. PROJECTS API
// ==========================================

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const db = await getDatabase();
    const projects = await db.all('SELECT * FROM projects ORDER BY updated_at DESC');
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project details
app.get('/api/projects/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  const { title, summary, genre } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const db = await getDatabase();
    const result = await db.run(
      'INSERT INTO projects (title, summary, genre) VALUES (?, ?, ?)',
      title, summary || '', genre || ''
    );
    const newProject = await db.get('SELECT * FROM projects WHERE id = ?', result.lastID);
    res.status(201).json(newProject);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  const { title, summary, genre } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const db = await getDatabase();
    await db.run(
      'UPDATE projects SET title = ?, summary = ?, genre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      title, summary || '', genre || '', req.params.id
    );
    const updated = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    // Foreign keys cascade will delete related codex and outline items automatically
    await db.run('DELETE FROM projects WHERE id = ?', req.params.id);
    res.json({ success: true, message: `Project ${req.params.id} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export project to JSON file
app.get('/api/projects/:id/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const projectId = req.params.id;

    const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const codex = await db.all('SELECT * FROM codex_entries WHERE project_id = ?', projectId);
    const outline = await db.all('SELECT * FROM outline_elements WHERE project_id = ? ORDER BY position ASC', projectId);
    
    // Fetch scene contents
    const scenesWithContent = [];
    for (const item of outline) {
      if (item.type === 'scene') {
        const contentRow = await db.get('SELECT content FROM scene_contents WHERE scene_id = ?', item.id);
        scenesWithContent.push({
          scene_id: item.id,
          content: contentRow ? contentRow.content : ''
        });
      }
    }

    res.json({
      project,
      codex,
      outline,
      scene_contents: scenesWithContent
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import project from JSON file
app.post('/api/projects/import', async (req, res) => {
  const { project, codex, outline, scene_contents } = req.body;
  if (!project || !project.title) {
    return res.status(400).json({ error: 'Invalid project data file' });
  }

  try {
    const db = await getDatabase();
    await db.run('BEGIN TRANSACTION');

    // 1. Create project
    const projResult = await db.run(
      'INSERT INTO projects (title, summary, genre) VALUES (?, ?, ?)',
      `${project.title} (Imported)`, project.summary || '', project.genre || ''
    );
    const newProjectId = projResult.lastID;

    // Mapping old IDs to new IDs
    const codexIdMap: Record<number, number> = {};
    const outlineIdMap: Record<number, number> = {};

    // 2. Insert Codex Entries
    if (Array.isArray(codex)) {
      for (const entry of codex) {
        const codexRes = await db.run(
          `INSERT INTO codex_entries (project_id, name, aliases, category, description, notes) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          newProjectId, entry.name, entry.aliases || '', entry.category, entry.description || '', entry.notes || ''
        );
        codexIdMap[entry.id as number] = codexRes.lastID as number;
      }
    }

    // 3. Insert Outline Elements (Acts first, then chapters, then scenes)
    // To handle parenting correctly, let's sort elements by their hierarchy type: act -> chapter -> scene
    const typeOrder = { act: 1, chapter: 2, scene: 3 };
    const sortedOutline = [...(outline || [])].sort((a, b) => typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder]);

    for (const elem of sortedOutline) {
      // Map parent ID
      const newParentId = elem.parent_id ? (outlineIdMap[elem.parent_id] || null) : null;
      
      // Map codex IDs in metadata
      let newMetadata = '[]';
      if (elem.metadata) {
        try {
          const oldMetaIds: number[] = JSON.parse(elem.metadata);
          const newMetaIds = oldMetaIds.map(id => codexIdMap[id]).filter(Boolean);
          newMetadata = JSON.stringify(newMetaIds);
        } catch (_) {}
      }

      const outRes = await db.run(
        `INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary, status, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newProjectId, newParentId, elem.type, elem.title, elem.position, elem.summary || '', elem.status || 'todo', newMetadata
      );
      outlineIdMap[elem.id as number] = outRes.lastID as number;
    }

    // 4. Insert Scene Contents
    if (Array.isArray(scene_contents)) {
      for (const contentItem of scene_contents) {
        const newSceneId = outlineIdMap[contentItem.scene_id];
        if (newSceneId) {
          await db.run(
            'INSERT INTO scene_contents (scene_id, content) VALUES (?, ?)',
            newSceneId, contentItem.content || ''
          );
        }
      }
    }

    await db.run('COMMIT');
    const importedProject = await db.get('SELECT * FROM projects WHERE id = ?', newProjectId);
    res.status(201).json(importedProject);
  } catch (error: any) {
    try {
      const db = await getDatabase();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CODEX API
// ==========================================

// Get Codex Entries for project
app.get('/api/projects/:projectId/codex', async (req, res) => {
  try {
    const db = await getDatabase();
    const codex = await db.all('SELECT * FROM codex_entries WHERE project_id = ? ORDER BY name ASC', req.params.projectId);
    res.json(codex);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Codex Entry
app.post('/api/projects/:projectId/codex', async (req, res) => {
  const { name, aliases, category, description, notes } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and Category are required' });
  }

  try {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO codex_entries (project_id, name, aliases, category, description, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      req.params.projectId, name, aliases || '', category, description || '', notes || ''
    );
    const newEntry = await db.get('SELECT * FROM codex_entries WHERE id = ?', result.lastID);
    
    // Trigger update project timestamp
    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
    
    res.status(201).json(newEntry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Codex Entry
app.put('/api/projects/:projectId/codex/:id', async (req, res) => {
  const { name, aliases, category, description, notes } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and Category are required' });
  }

  try {
    const db = await getDatabase();
    await db.run(
      `UPDATE codex_entries 
       SET name = ?, aliases = ?, category = ?, description = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND project_id = ?`,
      name, aliases || '', category, description || '', notes || '', req.params.id, req.params.projectId
    );
    
    // Update project timestamp
    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);

    const updated = await db.get('SELECT * FROM codex_entries WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Codex Entry
app.delete('/api/projects/:projectId/codex/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    await db.run('DELETE FROM codex_entries WHERE id = ? AND project_id = ?', req.params.id, req.params.projectId);
    
    // Update project timestamp
    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);

    res.json({ success: true, message: `Codex entry ${req.params.id} deleted.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. OUTLINE / PLANNERS API
// ==========================================

// Get Outline elements for project
app.get('/api/projects/:projectId/outline', async (req, res) => {
  try {
    const db = await getDatabase();
    const elements = await db.all(
      'SELECT * FROM outline_elements WHERE project_id = ? ORDER BY position ASC',
      req.params.projectId
    );
    res.json(elements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Outline Element (Act, Chapter, Scene)
app.post('/api/projects/:projectId/outline', async (req, res) => {
  const { parent_id, type, title, position, summary, status } = req.body;
  if (!type || !title) {
    return res.status(400).json({ error: 'Type and Title are required' });
  }

  try {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary, status, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      req.params.projectId, parent_id || null, type, title, position || 0, summary || '', status || 'todo', '[]'
    );
    
    const newElement = await db.get('SELECT * FROM outline_elements WHERE id = ?', result.lastID);

    // If type is scene, automatically initialize its empty text content
    if (type === 'scene') {
      await db.run('INSERT OR IGNORE INTO scene_contents (scene_id, content) VALUES (?, ?)', result.lastID, '');
    }

    // Update project timestamp
    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);

    res.status(201).json(newElement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Outline Element
app.put('/api/projects/:projectId/outline/:id', async (req, res) => {
  const { parent_id, title, position, summary, status, metadata } = req.body;

  try {
    const db = await getDatabase();
    
    // Construct dynamic updates based on what was passed
    await db.run(
      `UPDATE outline_elements 
       SET parent_id = ?, title = ?, position = ?, summary = ?, status = ?, metadata = ? 
       WHERE id = ? AND project_id = ?`,
      parent_id !== undefined ? parent_id : null,
      title,
      position || 0,
      summary || '',
      status || 'todo',
      metadata || '[]',
      req.params.id,
      req.params.projectId
    );

    // Update project timestamp
    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);

    const updated = await db.get('SELECT * FROM outline_elements WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Outline Element
app.delete('/api/projects/:projectId/outline/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    // Cascade constraints on outline_elements parent_id or project_id will handle nested deletions
    await db.run('DELETE FROM outline_elements WHERE id = ? AND project_id = ?', req.params.id, req.params.projectId);
    
    // Update project timestamp
    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);

    res.json({ success: true, message: `Outline element ${req.params.id} deleted.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Batch Reorder & Reparent Outline Elements (for drag and drop)
app.post('/api/projects/:projectId/outline/reorder', async (req, res) => {
  const { items } = req.body; // Array<{ id: number, parent_id: number | null, position: number }>
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }

  try {
    const db = await getDatabase();
    await db.run('BEGIN TRANSACTION');

    for (const item of items) {
      await db.run(
        'UPDATE outline_elements SET parent_id = ?, position = ? WHERE id = ? AND project_id = ?',
        item.parent_id !== undefined ? item.parent_id : null,
        item.position,
        item.id,
        req.params.projectId
      );
    }

    await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
    await db.run('COMMIT');

    res.json({ success: true, message: 'Outline reordered successfully.' });
  } catch (error: any) {
    try {
      const db = await getDatabase();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

// Get Manuscript & Outline Word Count Stats
app.get('/api/projects/:projectId/outline-stats', async (req, res) => {
  try {
    const db = await getDatabase();
    const sceneRows = await db.all(`
      SELECT o.id as scene_id, o.parent_id, sc.content 
      FROM outline_elements o
      LEFT JOIN scene_contents sc ON o.id = sc.scene_id
      WHERE o.project_id = ? AND o.type = 'scene'
    `, req.params.projectId);

    const sceneWordCounts: Record<number, number> = {};
    let totalWords = 0;

    for (const row of sceneRows) {
      const text = row.content || '';
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      sceneWordCounts[row.scene_id] = words;
      totalWords += words;
    }

    res.json({ sceneWordCounts, totalWords });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3B. GLOBAL SEARCH & REPLACE API
// ==========================================

// Global project search across scenes, outline, and codex
app.get('/api/projects/:projectId/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ scenes: [], outline: [], codex: [] });
  }

  try {
    const db = await getDatabase();
    const queryLower = query.toLowerCase();

    // 1. Search Scene Contents
    const sceneRows = await db.all(`
      SELECT o.id, o.title, o.type, o.parent_id, sc.content
      FROM outline_elements o
      JOIN scene_contents sc ON o.id = sc.scene_id
      WHERE o.project_id = ? AND o.type = 'scene'
    `, req.params.projectId);

    const sceneMatches: any[] = [];
    for (const scene of sceneRows) {
      const content = scene.content || '';
      const contentLower = content.toLowerCase();
      let matchIndex = contentLower.indexOf(queryLower);
      let occurrences = 0;

      const snippets: string[] = [];
      while (matchIndex !== -1) {
        occurrences++;
        if (snippets.length < 3) {
          const start = Math.max(0, matchIndex - 40);
          const end = Math.min(content.length, matchIndex + query.length + 40);
          let snippet = content.substring(start, end).replace(/\n+/g, ' ');
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
          snippets.push(snippet);
        }
        matchIndex = contentLower.indexOf(queryLower, matchIndex + queryLower.length);
      }

      if (occurrences > 0) {
        sceneMatches.push({
          id: scene.id,
          title: scene.title,
          occurrences,
          snippets
        });
      }
    }

    // 2. Search Outline Summaries / Titles
    const outlineRows = await db.all(`
      SELECT id, title, type, summary, status
      FROM outline_elements
      WHERE project_id = ? AND (LOWER(title) LIKE ? OR LOWER(summary) LIKE ?)
    `, req.params.projectId, `%${queryLower}%`, `%${queryLower}%`);

    // 3. Search Codex Entries
    const codexRows = await db.all(`
      SELECT id, name, aliases, category, description, notes
      FROM codex_entries
      WHERE project_id = ? AND (
        LOWER(name) LIKE ? OR 
        LOWER(aliases) LIKE ? OR 
        LOWER(description) LIKE ? OR 
        LOWER(notes) LIKE ?
      )
    `, req.params.projectId, `%${queryLower}%`, `%${queryLower}%`, `%${queryLower}%`, `%${queryLower}%`);

    res.json({
      scenes: sceneMatches,
      outline: outlineRows,
      codex: codexRows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global search & replace across scenes
app.post('/api/projects/:projectId/replace', async (req, res) => {
  const { searchTerm, replaceTerm, sceneIds } = req.body;
  if (!searchTerm) {
    return res.status(400).json({ error: 'searchTerm is required' });
  }

  try {
    const db = await getDatabase();
    let scenesToProcess = [];

    if (Array.isArray(sceneIds) && sceneIds.length > 0) {
      scenesToProcess = await db.all(`
        SELECT o.id, o.title, sc.content 
        FROM outline_elements o
        JOIN scene_contents sc ON o.id = sc.scene_id
        WHERE o.project_id = ? AND o.id IN (${sceneIds.map(() => '?').join(',')})
      `, req.params.projectId, ...sceneIds);
    } else {
      scenesToProcess = await db.all(`
        SELECT o.id, o.title, sc.content 
        FROM outline_elements o
        JOIN scene_contents sc ON o.id = sc.scene_id
        WHERE o.project_id = ? AND o.type = 'scene'
      `, req.params.projectId);
    }

    let updatedScenesCount = 0;
    let totalOccurrencesReplaced = 0;

    await db.run('BEGIN TRANSACTION');

    for (const scene of scenesToProcess) {
      const content = scene.content || '';
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = content.match(regex);

      if (matches && matches.length > 0) {
        const occurrences = matches.length;
        const newContent = content.replace(regex, replaceTerm || '');

        // 1. Take safety snapshot before replacement
        const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
        await db.run(
          'INSERT INTO scene_snapshots (scene_id, content, word_count, label, source) VALUES (?, ?, ?, ?, ?)',
          scene.id,
          content,
          words,
          `Pre-Replace Safety Backup: "${searchTerm}" → "${replaceTerm || ''}"`,
          'safety_backup'
        );

        // 2. Update scene content
        await db.run(
          'UPDATE scene_contents SET content = ?, last_saved_at = CURRENT_TIMESTAMP WHERE scene_id = ?',
          newContent,
          scene.id
        );

        updatedScenesCount++;
        totalOccurrencesReplaced += occurrences;
      }
    }

    if (updatedScenesCount > 0) {
      await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
    }

    await db.run('COMMIT');

    res.json({
      success: true,
      updatedScenesCount,
      totalOccurrencesReplaced
    });
  } catch (error: any) {
    try {
      const db = await getDatabase();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. EDITOR MANUSCRIPT API
// ==========================================

// Get scene content
app.get('/api/scenes/:sceneId/content', async (req, res) => {
  try {
    const db = await getDatabase();
    let contentRow = await db.get('SELECT * FROM scene_contents WHERE scene_id = ?', req.params.sceneId);
    
    // Auto-create blank page if somehow missing
    if (!contentRow) {
      await db.run('INSERT INTO scene_contents (scene_id, content) VALUES (?, ?)', req.params.sceneId, '');
      contentRow = { scene_id: Number(req.params.sceneId), content: '', last_saved_at: new Date().toISOString() };
    }
    
    res.json(contentRow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save scene content
app.put('/api/scenes/:sceneId/content', async (req, res) => {
  const { content } = req.body;
  try {
    const db = await getDatabase();
    await db.run(
      'INSERT INTO scene_contents (scene_id, content, last_saved_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(scene_id) DO UPDATE SET content = excluded.content, last_saved_at = CURRENT_TIMESTAMP',
      req.params.sceneId, content || ''
    );
    
    // Fetch associated project to update project updated_at timestamp
    const element = await db.get('SELECT project_id FROM outline_elements WHERE id = ?', req.params.sceneId);
    if (element) {
      await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', element.project_id);
    }

    res.json({ success: true, last_saved_at: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4B. SCENE SNAPSHOTS & HISTORY API
// ==========================================

// Get list of snapshots for a scene (metadata only, no large content body)
app.get('/api/scenes/:sceneId/snapshots', async (req, res) => {
  try {
    const db = await getDatabase();
    const snapshots = await db.all(
      'SELECT id, scene_id, word_count, label, source, created_at FROM scene_snapshots WHERE scene_id = ? ORDER BY created_at DESC',
      req.params.sceneId
    );
    res.json(snapshots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single snapshot with full content
app.get('/api/scenes/:sceneId/snapshots/:snapshotId', async (req, res) => {
  try {
    const db = await getDatabase();
    const snapshot = await db.get(
      'SELECT * FROM scene_snapshots WHERE id = ? AND scene_id = ?',
      req.params.snapshotId,
      req.params.sceneId
    );
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json(snapshot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create manual or automated snapshot
app.post('/api/scenes/:sceneId/snapshots', async (req, res) => {
  const { content, label, source } = req.body;
  try {
    const db = await getDatabase();
    const textContent = content || '';
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;

    const result = await db.run(
      'INSERT INTO scene_snapshots (scene_id, content, word_count, label, source) VALUES (?, ?, ?, ?, ?)',
      req.params.sceneId,
      textContent,
      wordCount,
      label || 'Manual Snapshot',
      source || 'manual'
    );

    const newSnapshot = await db.get(
      'SELECT id, scene_id, word_count, label, source, created_at FROM scene_snapshots WHERE id = ?',
      result.lastID
    );
    res.json(newSnapshot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete snapshot
app.delete('/api/scenes/:sceneId/snapshots/:snapshotId', async (req, res) => {
  try {
    const db = await getDatabase();
    await db.run(
      'DELETE FROM scene_snapshots WHERE id = ? AND scene_id = ?',
      req.params.snapshotId,
      req.params.sceneId
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restore snapshot
app.post('/api/scenes/:sceneId/snapshots/:snapshotId/restore', async (req, res) => {
  try {
    const db = await getDatabase();
    const snapshot = await db.get(
      'SELECT * FROM scene_snapshots WHERE id = ? AND scene_id = ?',
      req.params.snapshotId,
      req.params.sceneId
    );

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // Safety backup of current scene content before restoring
    const currentContentRow = await db.get('SELECT content FROM scene_contents WHERE scene_id = ?', req.params.sceneId);
    if (currentContentRow && currentContentRow.content) {
      const curWords = currentContentRow.content.trim() ? currentContentRow.content.trim().split(/\s+/).length : 0;
      await db.run(
        'INSERT INTO scene_snapshots (scene_id, content, word_count, label, source) VALUES (?, ?, ?, ?, ?)',
        req.params.sceneId,
        currentContentRow.content,
        curWords,
        `Pre-Restore Safety Backup (Restoring #${snapshot.id})`,
        'safety_backup'
      );
    }

    // Restore content to active scene
    await db.run(
      `INSERT INTO scene_contents (scene_id, content, last_saved_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP) 
       ON CONFLICT(scene_id) DO UPDATE SET content = excluded.content, last_saved_at = CURRENT_TIMESTAMP`,
      req.params.sceneId,
      snapshot.content
    );

    // Touch project updated timestamp
    const element = await db.get('SELECT project_id FROM outline_elements WHERE id = ?', req.params.sceneId);
    if (element) {
      await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', element.project_id);
    }

    res.json({ success: true, restoredContent: snapshot.content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. SETTINGS API
// ==========================================

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM settings');
    const settingsObj: Record<string, string> = {};
    rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });
    res.json(settingsObj);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save settings bulk
app.post('/api/settings', async (req, res) => {
  const settingsData = req.body; // Expects object e.g. { openai_api_key: "...", ... }
  try {
    const db = await getDatabase();
    await db.run('BEGIN TRANSACTION');
    
    for (const [key, value] of Object.entries(settingsData)) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key, String(value)
      );
    }
    
    await db.run('COMMIT');
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    try {
      const db = await getDatabase();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. AI DISPATCH API
// ==========================================

// Standard generation (non-streaming fallback)
app.post('/api/ai/generate', async (req, res) => {
  const { sceneId, prompt, history, action, selection, styleOverrides } = req.body;
  if (!sceneId) {
    return res.status(400).json({ error: 'sceneId is required' });
  }

  try {
    const generatedText = await AIService.generate({
      sceneId,
      prompt,
      history,
      action,
      selection,
      styleOverrides
    });
    
    res.json({ text: generatedText });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time Streaming Generation (SSE)
app.post('/api/ai/generate-stream', async (req, res) => {
  const { sceneId, prompt, history, action, selection, styleOverrides } = req.body;
  if (!sceneId) {
    return res.status(400).json({ error: 'sceneId is required' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  try {
    await AIService.generateStream(
      {
        sceneId,
        prompt,
        history,
        action,
        selection,
        styleOverrides
      },
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      },
      abortController.signal
    );

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    if (!abortController.signal.aborted) {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Streaming failed' })}\n\n`);
      res.end();
    }
  }
});

// ==========================================
// PRODUCTION FRONTEND STATIC SERVING
// ==========================================

const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// For SPA routing in production, serve index.html for all non-api routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

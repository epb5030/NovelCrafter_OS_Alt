"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const ai_service_1 = require("./services/ai.service");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3005;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' })); // Support larger payloads for book imports/exports
// Initialize Database connection on start
(0, database_1.getDatabase)()
    .then(() => console.log('SQLite database initialized successfully.'))
    .catch(err => console.error('Failed to initialize database:', err));
// ==========================================
// 1. PROJECTS API
// ==========================================
// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const projects = await db.all('SELECT * FROM projects ORDER BY updated_at DESC');
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get single project details
app.get('/api/projects/:id', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        const result = await db.run('INSERT INTO projects (title, summary, genre) VALUES (?, ?, ?)', title, summary || '', genre || '');
        const newProject = await db.get('SELECT * FROM projects WHERE id = ?', result.lastID);
        res.status(201).json(newProject);
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        await db.run('UPDATE projects SET title = ?, summary = ?, genre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', title, summary || '', genre || '', req.params.id);
        const updated = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        // Foreign keys cascade will delete related codex and outline items automatically
        await db.run('DELETE FROM projects WHERE id = ?', req.params.id);
        res.json({ success: true, message: `Project ${req.params.id} deleted successfully.` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Export project to JSON file
app.get('/api/projects/:id/export', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Export compiled full manuscript (Markdown or Printable HTML)
app.get('/api/projects/:projectId/export/manuscript', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const projectId = req.params.projectId;
        const format = (req.query.format || 'markdown').toLowerCase();
        const includeActs = req.query.includeActs !== 'false';
        const includeSummaries = req.query.includeSummaries === 'true';
        const sceneDivider = req.query.sceneDivider !== undefined ? req.query.sceneDivider : '* * *';
        const shouldDownload = req.query.download === 'true';
        const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
        if (!project)
            return res.status(404).json({ error: 'Project not found' });
        const outline = await db.all('SELECT * FROM outline_elements WHERE project_id = ? ORDER BY position ASC', projectId);
        const sceneRows = await db.all(`
      SELECT o.id, sc.content 
      FROM outline_elements o
      LEFT JOIN scene_contents sc ON o.id = sc.scene_id
      WHERE o.project_id = ? AND o.type = 'scene'
    `, projectId);
        const contentMap = {};
        for (const row of sceneRows) {
            contentMap[row.id] = row.content || '';
        }
        const acts = outline.filter(el => el.type === 'act').sort((a, b) => a.position - b.position);
        const chapters = outline.filter(el => el.type === 'chapter').sort((a, b) => a.position - b.position);
        const scenes = outline.filter(el => el.type === 'scene').sort((a, b) => a.position - b.position);
        const safeTitle = (project.title || 'Novel').replace(/[^a-zA-Z0-9_-]/g, '_');
        if (format === 'html') {
            // Build Printable HTML Document
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.title}</title>
  <style>
    @page { margin: 1.25in 1in; size: letter; }
    body {
      font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
      line-height: 1.8;
      color: #111827;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #ffffff;
    }
    h1.novel-title {
      font-size: 32px;
      text-align: center;
      margin-top: 60px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .novel-genre {
      text-align: center;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
      margin-bottom: 80px;
    }
    .act-title {
      page-break-before: always;
      text-align: center;
      font-size: 26px;
      margin-top: 100px;
      margin-bottom: 60px;
      letter-spacing: 0.05em;
    }
    .chapter-title {
      page-break-before: always;
      font-size: 20px;
      margin-top: 50px;
      margin-bottom: 30px;
      font-weight: 600;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .scene-content {
      margin-bottom: 24px;
      white-space: pre-wrap;
      font-size: 16px;
      text-align: justify;
    }
    .scene-divider {
      text-align: center;
      margin: 36px 0;
      font-weight: bold;
      color: #9ca3af;
      letter-spacing: 0.3em;
    }
  </style>
</head>
<body>
  <h1 class="novel-title">${project.title}</h1>
  <div class="novel-genre">${project.genre || 'Manuscript'}</div>
`;
            const renderChapterHTML = (chap) => {
                let chHtml = `<h2 class="chapter-title">${chap.title}</h2>\n`;
                if (includeSummaries && chap.summary) {
                    chHtml += `<p style="font-style: italic; color: #6b7280;"><em>${chap.summary}</em></p>\n`;
                }
                const chapScenes = scenes.filter(s => s.parent_id === chap.id).sort((a, b) => a.position - b.position);
                chapScenes.forEach((sc, idx) => {
                    if (idx > 0 && sceneDivider) {
                        chHtml += `<div class="scene-divider">${sceneDivider}</div>\n`;
                    }
                    const text = contentMap[sc.id] || '';
                    chHtml += `<div class="scene-content">${text}</div>\n`;
                });
                return chHtml;
            };
            if (acts.length > 0) {
                for (const act of acts) {
                    if (includeActs) {
                        html += `<h2 class="act-title">${act.title}</h2>\n`;
                    }
                    const actChapters = chapters.filter(c => c.parent_id === act.id).sort((a, b) => a.position - b.position);
                    for (const chap of actChapters) {
                        html += renderChapterHTML(chap);
                    }
                }
            }
            else {
                for (const chap of chapters) {
                    html += renderChapterHTML(chap);
                }
            }
            // Render orphan scenes
            const orphanScenes = scenes.filter(s => !s.parent_id);
            if (orphanScenes.length > 0) {
                html += `<h2 class="chapter-title">Additional Scenes</h2>\n`;
                orphanScenes.forEach((sc, idx) => {
                    if (idx > 0 && sceneDivider) {
                        html += `<div class="scene-divider">${sceneDivider}</div>\n`;
                    }
                    html += `<div class="scene-content">${contentMap[sc.id] || ''}</div>\n`;
                });
            }
            html += `</body></html>`;
            if (shouldDownload) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_manuscript.html"`);
            }
            return res.send(html);
        }
        else {
            // Build Markdown Document
            let md = `# ${project.title}\n\n`;
            if (project.genre)
                md += `**Genre:** ${project.genre}\n\n`;
            if (project.summary)
                md += `> ${project.summary}\n\n---\n\n`;
            const renderChapterMD = (chap) => {
                let chMd = `## ${chap.title}\n\n`;
                if (includeSummaries && chap.summary) {
                    chMd += `*${chap.summary}*\n\n`;
                }
                const chapScenes = scenes.filter(s => s.parent_id === chap.id).sort((a, b) => a.position - b.position);
                chapScenes.forEach((sc, idx) => {
                    if (idx > 0 && sceneDivider) {
                        chMd += `\n\n${sceneDivider}\n\n`;
                    }
                    const text = contentMap[sc.id] || '';
                    chMd += `${text}\n`;
                });
                chMd += '\n\n';
                return chMd;
            };
            if (acts.length > 0) {
                for (const act of acts) {
                    if (includeActs) {
                        md += `# ${act.title}\n\n`;
                    }
                    const actChapters = chapters.filter(c => c.parent_id === act.id).sort((a, b) => a.position - b.position);
                    for (const chap of actChapters) {
                        md += renderChapterMD(chap);
                    }
                }
            }
            else {
                for (const chap of chapters) {
                    md += renderChapterMD(chap);
                }
            }
            const orphanScenes = scenes.filter(s => !s.parent_id);
            if (orphanScenes.length > 0) {
                md += `## Additional Scenes\n\n`;
                orphanScenes.forEach((sc, idx) => {
                    if (idx > 0 && sceneDivider) {
                        md += `\n\n${sceneDivider}\n\n`;
                    }
                    md += `${contentMap[sc.id] || ''}\n`;
                });
            }
            if (shouldDownload) {
                res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_manuscript.md"`);
            }
            return res.send(md);
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Export Codex Story Bible as Formatted Markdown
app.get('/api/projects/:projectId/export/codex-bible', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const projectId = req.params.projectId;
        const shouldDownload = req.query.download === 'true';
        const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
        if (!project)
            return res.status(404).json({ error: 'Project not found' });
        const codex = await db.all('SELECT * FROM codex_entries WHERE project_id = ? ORDER BY category, name ASC', projectId);
        const relationships = await db.all(`
      SELECT r.*, s.name as source_name, t.name as target_name 
      FROM codex_relationships r
      JOIN codex_entries s ON r.source_id = s.id
      JOIN codex_entries t ON r.target_id = t.id
      WHERE r.project_id = ?
    `, projectId);
        const safeTitle = (project.title || 'Novel').replace(/[^a-zA-Z0-9_-]/g, '_');
        let bibleMd = `# Codex Story Bible: ${project.title}\n\n`;
        bibleMd += `Generated reference guide for worldbuilding, characters, factions, and locations.\n\n---\n\n`;
        const categories = Array.from(new Set(codex.map(c => c.category)));
        for (const cat of categories) {
            bibleMd += `## ${cat.toUpperCase()}\n\n`;
            const entries = codex.filter(c => c.category === cat);
            for (const entry of entries) {
                bibleMd += `### ${entry.name}\n\n`;
                if (entry.aliases)
                    bibleMd += `**Aliases:** ${entry.aliases}\n\n`;
                if (entry.description)
                    bibleMd += `${entry.description}\n\n`;
                if (entry.notes)
                    bibleMd += `*Author Notes:* ${entry.notes}\n\n`;
                // Check relationships
                const rels = relationships.filter(r => r.source_id === entry.id || r.target_id === entry.id);
                if (rels.length > 0) {
                    bibleMd += `**Relationships & Connections:**\n`;
                    for (const rel of rels) {
                        const isSource = rel.source_id === entry.id;
                        const otherName = isSource ? rel.target_name : rel.source_name;
                        const desc = rel.description ? ` (${rel.description})` : '';
                        bibleMd += `- **${rel.relationship_type.replace('_', ' ')}**: ${otherName}${desc}\n`;
                    }
                    bibleMd += '\n';
                }
            }
            bibleMd += '---\n\n';
        }
        if (shouldDownload) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_codex_bible.md"`);
        }
        return res.send(bibleMd);
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        await db.run('BEGIN TRANSACTION');
        // 1. Create project
        const projResult = await db.run('INSERT INTO projects (title, summary, genre) VALUES (?, ?, ?)', `${project.title} (Imported)`, project.summary || '', project.genre || '');
        const newProjectId = projResult.lastID;
        // Mapping old IDs to new IDs
        const codexIdMap = {};
        const outlineIdMap = {};
        // 2. Insert Codex Entries
        if (Array.isArray(codex)) {
            for (const entry of codex) {
                const codexRes = await db.run(`INSERT INTO codex_entries (project_id, name, aliases, category, description, notes) 
           VALUES (?, ?, ?, ?, ?, ?)`, newProjectId, entry.name, entry.aliases || '', entry.category, entry.description || '', entry.notes || '');
                codexIdMap[entry.id] = codexRes.lastID;
            }
        }
        // 3. Insert Outline Elements (Acts first, then chapters, then scenes)
        // To handle parenting correctly, let's sort elements by their hierarchy type: act -> chapter -> scene
        const typeOrder = { act: 1, chapter: 2, scene: 3 };
        const sortedOutline = [...(outline || [])].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
        for (const elem of sortedOutline) {
            // Map parent ID
            const newParentId = elem.parent_id ? (outlineIdMap[elem.parent_id] || null) : null;
            // Map codex IDs in metadata
            let newMetadata = '[]';
            if (elem.metadata) {
                try {
                    const oldMetaIds = JSON.parse(elem.metadata);
                    const newMetaIds = oldMetaIds.map(id => codexIdMap[id]).filter(Boolean);
                    newMetadata = JSON.stringify(newMetaIds);
                }
                catch (_) { }
            }
            const outRes = await db.run(`INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary, status, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, newProjectId, newParentId, elem.type, elem.title, elem.position, elem.summary || '', elem.status || 'todo', newMetadata);
            outlineIdMap[elem.id] = outRes.lastID;
        }
        // 4. Insert Scene Contents
        if (Array.isArray(scene_contents)) {
            for (const contentItem of scene_contents) {
                const newSceneId = outlineIdMap[contentItem.scene_id];
                if (newSceneId) {
                    await db.run('INSERT INTO scene_contents (scene_id, content) VALUES (?, ?)', newSceneId, contentItem.content || '');
                }
            }
        }
        await db.run('COMMIT');
        const importedProject = await db.get('SELECT * FROM projects WHERE id = ?', newProjectId);
        res.status(201).json(importedProject);
    }
    catch (error) {
        try {
            const db = await (0, database_1.getDatabase)();
            await db.run('ROLLBACK');
        }
        catch (_) { }
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 2. CODEX API
// ==========================================
// Get Codex Entries for project
app.get('/api/projects/:projectId/codex', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const codex = await db.all('SELECT * FROM codex_entries WHERE project_id = ? ORDER BY name ASC', req.params.projectId);
        res.json(codex);
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        const result = await db.run(`INSERT INTO codex_entries (project_id, name, aliases, category, description, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`, req.params.projectId, name, aliases || '', category, description || '', notes || '');
        const newEntry = await db.get('SELECT * FROM codex_entries WHERE id = ?', result.lastID);
        // Trigger update project timestamp
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        res.status(201).json(newEntry);
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        await db.run(`UPDATE codex_entries 
       SET name = ?, aliases = ?, category = ?, description = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND project_id = ?`, name, aliases || '', category, description || '', notes || '', req.params.id, req.params.projectId);
        // Update project timestamp
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        const updated = await db.get('SELECT * FROM codex_entries WHERE id = ?', req.params.id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete Codex Entry
app.delete('/api/projects/:projectId/codex/:id', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        await db.run('DELETE FROM codex_entries WHERE id = ? AND project_id = ?', req.params.id, req.params.projectId);
        // Update project timestamp
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        res.json({ success: true, message: `Codex entry ${req.params.id} deleted.` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 2B. CODEX RELATIONSHIPS GRAPH API
// ==========================================
// Get relationships for project with entity names & categories
app.get('/api/projects/:projectId/codex-relationships', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const relationships = await db.all(`
      SELECT 
        r.id,
        r.project_id,
        r.source_id,
        r.target_id,
        r.relationship_type,
        r.description,
        r.created_at,
        s.name as source_name,
        s.category as source_category,
        t.name as target_name,
        t.category as target_category
      FROM codex_relationships r
      JOIN codex_entries s ON r.source_id = s.id
      JOIN codex_entries t ON r.target_id = t.id
      WHERE r.project_id = ?
      ORDER BY r.created_at ASC
    `, req.params.projectId);
        res.json(relationships);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create relationship between two Codex entries
app.post('/api/projects/:projectId/codex-relationships', async (req, res) => {
    const { source_id, target_id, relationship_type, description } = req.body;
    if (!source_id || !target_id || !relationship_type) {
        return res.status(400).json({ error: 'source_id, target_id, and relationship_type are required' });
    }
    if (source_id === target_id) {
        return res.status(400).json({ error: 'An entity cannot have a relationship with itself' });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const result = await db.run(`
      INSERT INTO codex_relationships (project_id, source_id, target_id, relationship_type, description)
      VALUES (?, ?, ?, ?, ?)
    `, req.params.projectId, source_id, target_id, relationship_type, description || '');
        const newRel = await db.get(`
      SELECT 
        r.id,
        r.project_id,
        r.source_id,
        r.target_id,
        r.relationship_type,
        r.description,
        r.created_at,
        s.name as source_name,
        s.category as source_category,
        t.name as target_name,
        t.category as target_category
      FROM codex_relationships r
      JOIN codex_entries s ON r.source_id = s.id
      JOIN codex_entries t ON r.target_id = t.id
      WHERE r.id = ?
    `, result.lastID);
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        res.status(201).json(newRel);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete relationship
app.delete('/api/projects/:projectId/codex-relationships/:id', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        await db.run('DELETE FROM codex_relationships WHERE id = ? AND project_id = ?', req.params.id, req.params.projectId);
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        res.json({ success: true, message: 'Relationship deleted.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 3. OUTLINE / PLANNERS API
// ==========================================
// Get Outline elements for project
app.get('/api/projects/:projectId/outline', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const elements = await db.all('SELECT * FROM outline_elements WHERE project_id = ? ORDER BY position ASC', req.params.projectId);
        res.json(elements);
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        const result = await db.run(`INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary, status, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, req.params.projectId, parent_id || null, type, title, position || 0, summary || '', status || 'todo', '[]');
        const newElement = await db.get('SELECT * FROM outline_elements WHERE id = ?', result.lastID);
        // If type is scene, automatically initialize its empty text content
        if (type === 'scene') {
            await db.run('INSERT OR IGNORE INTO scene_contents (scene_id, content) VALUES (?, ?)', result.lastID, '');
        }
        // Update project timestamp
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        res.status(201).json(newElement);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update Outline Element
app.put('/api/projects/:projectId/outline/:id', async (req, res) => {
    const { parent_id, title, position, summary, status, metadata } = req.body;
    try {
        const db = await (0, database_1.getDatabase)();
        // Construct dynamic updates based on what was passed
        await db.run(`UPDATE outline_elements 
       SET parent_id = ?, title = ?, position = ?, summary = ?, status = ?, metadata = ? 
       WHERE id = ? AND project_id = ?`, parent_id !== undefined ? parent_id : null, title, position || 0, summary || '', status || 'todo', metadata || '[]', req.params.id, req.params.projectId);
        // Update project timestamp
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        const updated = await db.get('SELECT * FROM outline_elements WHERE id = ?', req.params.id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete Outline Element
app.delete('/api/projects/:projectId/outline/:id', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        // Cascade constraints on outline_elements parent_id or project_id will handle nested deletions
        await db.run('DELETE FROM outline_elements WHERE id = ? AND project_id = ?', req.params.id, req.params.projectId);
        // Update project timestamp
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        res.json({ success: true, message: `Outline element ${req.params.id} deleted.` });
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        await db.run('BEGIN TRANSACTION');
        for (const item of items) {
            await db.run('UPDATE outline_elements SET parent_id = ?, position = ? WHERE id = ? AND project_id = ?', item.parent_id !== undefined ? item.parent_id : null, item.position, item.id, req.params.projectId);
        }
        await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', req.params.projectId);
        await db.run('COMMIT');
        res.json({ success: true, message: 'Outline reordered successfully.' });
    }
    catch (error) {
        try {
            const db = await (0, database_1.getDatabase)();
            await db.run('ROLLBACK');
        }
        catch (_) { }
        res.status(500).json({ error: error.message });
    }
});
// Get Manuscript & Outline Word Count Stats
app.get('/api/projects/:projectId/outline-stats', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const sceneRows = await db.all(`
      SELECT o.id as scene_id, o.parent_id, sc.content 
      FROM outline_elements o
      LEFT JOIN scene_contents sc ON o.id = sc.scene_id
      WHERE o.project_id = ? AND o.type = 'scene'
    `, req.params.projectId);
        const sceneWordCounts = {};
        let totalWords = 0;
        for (const row of sceneRows) {
            const text = row.content || '';
            const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
            sceneWordCounts[row.scene_id] = words;
            totalWords += words;
        }
        res.json({ sceneWordCounts, totalWords });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 3B. GLOBAL SEARCH & REPLACE API
// ==========================================
// Global project search across scenes, outline, and codex
app.get('/api/projects/:projectId/search', async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) {
        return res.json({ scenes: [], outline: [], codex: [] });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const queryLower = query.toLowerCase();
        // 1. Search Scene Contents
        const sceneRows = await db.all(`
      SELECT o.id, o.title, o.type, o.parent_id, sc.content
      FROM outline_elements o
      JOIN scene_contents sc ON o.id = sc.scene_id
      WHERE o.project_id = ? AND o.type = 'scene'
    `, req.params.projectId);
        const sceneMatches = [];
        for (const scene of sceneRows) {
            const content = scene.content || '';
            const contentLower = content.toLowerCase();
            let matchIndex = contentLower.indexOf(queryLower);
            let occurrences = 0;
            const snippets = [];
            while (matchIndex !== -1) {
                occurrences++;
                if (snippets.length < 3) {
                    const start = Math.max(0, matchIndex - 40);
                    const end = Math.min(content.length, matchIndex + query.length + 40);
                    let snippet = content.substring(start, end).replace(/\n+/g, ' ');
                    if (start > 0)
                        snippet = '...' + snippet;
                    if (end < content.length)
                        snippet = snippet + '...';
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
    }
    catch (error) {
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
        const db = await (0, database_1.getDatabase)();
        let scenesToProcess = [];
        if (Array.isArray(sceneIds) && sceneIds.length > 0) {
            scenesToProcess = await db.all(`
        SELECT o.id, o.title, sc.content 
        FROM outline_elements o
        JOIN scene_contents sc ON o.id = sc.scene_id
        WHERE o.project_id = ? AND o.id IN (${sceneIds.map(() => '?').join(',')})
      `, req.params.projectId, ...sceneIds);
        }
        else {
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
                await db.run('INSERT INTO scene_snapshots (scene_id, content, word_count, label, source) VALUES (?, ?, ?, ?, ?)', scene.id, content, words, `Pre-Replace Safety Backup: "${searchTerm}" → "${replaceTerm || ''}"`, 'safety_backup');
                // 2. Update scene content
                await db.run('UPDATE scene_contents SET content = ?, last_saved_at = CURRENT_TIMESTAMP WHERE scene_id = ?', newContent, scene.id);
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
    }
    catch (error) {
        try {
            const db = await (0, database_1.getDatabase)();
            await db.run('ROLLBACK');
        }
        catch (_) { }
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 4. EDITOR MANUSCRIPT API
// ==========================================
// Get scene content
app.get('/api/scenes/:sceneId/content', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        let contentRow = await db.get('SELECT * FROM scene_contents WHERE scene_id = ?', req.params.sceneId);
        // Auto-create blank page if somehow missing
        if (!contentRow) {
            await db.run('INSERT INTO scene_contents (scene_id, content) VALUES (?, ?)', req.params.sceneId, '');
            contentRow = { scene_id: Number(req.params.sceneId), content: '', last_saved_at: new Date().toISOString() };
        }
        res.json(contentRow);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Save scene content
app.put('/api/scenes/:sceneId/content', async (req, res) => {
    const { content } = req.body;
    try {
        const db = await (0, database_1.getDatabase)();
        await db.run('INSERT INTO scene_contents (scene_id, content, last_saved_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(scene_id) DO UPDATE SET content = excluded.content, last_saved_at = CURRENT_TIMESTAMP', req.params.sceneId, content || '');
        // Fetch associated project to update project updated_at timestamp
        const element = await db.get('SELECT project_id FROM outline_elements WHERE id = ?', req.params.sceneId);
        if (element) {
            await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', element.project_id);
        }
        res.json({ success: true, last_saved_at: new Date().toISOString() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 4B. SCENE SNAPSHOTS & HISTORY API
// ==========================================
// Get list of snapshots for a scene (metadata only, no large content body)
app.get('/api/scenes/:sceneId/snapshots', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const snapshots = await db.all('SELECT id, scene_id, word_count, label, source, created_at FROM scene_snapshots WHERE scene_id = ? ORDER BY created_at DESC', req.params.sceneId);
        res.json(snapshots);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get single snapshot with full content
app.get('/api/scenes/:sceneId/snapshots/:snapshotId', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const snapshot = await db.get('SELECT * FROM scene_snapshots WHERE id = ? AND scene_id = ?', req.params.snapshotId, req.params.sceneId);
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        res.json(snapshot);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create manual or automated snapshot
app.post('/api/scenes/:sceneId/snapshots', async (req, res) => {
    const { content, label, source } = req.body;
    try {
        const db = await (0, database_1.getDatabase)();
        const textContent = content || '';
        const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
        const result = await db.run('INSERT INTO scene_snapshots (scene_id, content, word_count, label, source) VALUES (?, ?, ?, ?, ?)', req.params.sceneId, textContent, wordCount, label || 'Manual Snapshot', source || 'manual');
        const newSnapshot = await db.get('SELECT id, scene_id, word_count, label, source, created_at FROM scene_snapshots WHERE id = ?', result.lastID);
        res.json(newSnapshot);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete snapshot
app.delete('/api/scenes/:sceneId/snapshots/:snapshotId', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        await db.run('DELETE FROM scene_snapshots WHERE id = ? AND scene_id = ?', req.params.snapshotId, req.params.sceneId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Restore snapshot
app.post('/api/scenes/:sceneId/snapshots/:snapshotId/restore', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const snapshot = await db.get('SELECT * FROM scene_snapshots WHERE id = ? AND scene_id = ?', req.params.snapshotId, req.params.sceneId);
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        // Safety backup of current scene content before restoring
        const currentContentRow = await db.get('SELECT content FROM scene_contents WHERE scene_id = ?', req.params.sceneId);
        if (currentContentRow && currentContentRow.content) {
            const curWords = currentContentRow.content.trim() ? currentContentRow.content.trim().split(/\s+/).length : 0;
            await db.run('INSERT INTO scene_snapshots (scene_id, content, word_count, label, source) VALUES (?, ?, ?, ?, ?)', req.params.sceneId, currentContentRow.content, curWords, `Pre-Restore Safety Backup (Restoring #${snapshot.id})`, 'safety_backup');
        }
        // Restore content to active scene
        await db.run(`INSERT INTO scene_contents (scene_id, content, last_saved_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP) 
       ON CONFLICT(scene_id) DO UPDATE SET content = excluded.content, last_saved_at = CURRENT_TIMESTAMP`, req.params.sceneId, snapshot.content);
        // Touch project updated timestamp
        const element = await db.get('SELECT project_id FROM outline_elements WHERE id = ?', req.params.sceneId);
        if (element) {
            await db.run('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', element.project_id);
        }
        res.json({ success: true, restoredContent: snapshot.content });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 5. SETTINGS API
// ==========================================
// Get settings
app.get('/api/settings', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all('SELECT * FROM settings');
        const settingsObj = {};
        rows.forEach(row => {
            settingsObj[row.key] = row.value;
        });
        res.json(settingsObj);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Save settings bulk
app.post('/api/settings', async (req, res) => {
    const settingsData = req.body; // Expects object e.g. { openai_api_key: "...", ... }
    try {
        const db = await (0, database_1.getDatabase)();
        await db.run('BEGIN TRANSACTION');
        for (const [key, value] of Object.entries(settingsData)) {
            await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
        }
        await db.run('COMMIT');
        res.json({ success: true, message: 'Settings saved successfully.' });
    }
    catch (error) {
        try {
            const db = await (0, database_1.getDatabase)();
            await db.run('ROLLBACK');
        }
        catch (_) { }
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 6. AI DISPATCH API
// ==========================================
// Standard generation // Generate AI text (Non-streaming fallback)
app.post('/api/ai/generate', async (req, res) => {
    const { sceneId, prompt, history, action, selection, beats, pacing, styleOverrides } = req.body;
    if (!sceneId) {
        return res.status(400).json({ error: 'sceneId is required' });
    }
    try {
        const generatedText = await ai_service_1.AIService.generate({
            sceneId,
            prompt,
            history,
            action,
            selection,
            beats,
            pacing,
            styleOverrides
        });
        res.json({ text: generatedText });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Real-time Streaming Generation (SSE)
app.post('/api/ai/generate-stream', async (req, res) => {
    const { sceneId, prompt, history, action, selection, beats, pacing, styleOverrides } = req.body;
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
        await ai_service_1.AIService.generateStream({
            sceneId,
            prompt,
            history,
            action,
            selection,
            beats,
            pacing,
            styleOverrides
        }, (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }, abortController.signal);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
    catch (error) {
        if (!abortController.signal.aborted) {
            res.write(`data: ${JSON.stringify({ error: error.message || 'Streaming failed' })}\n\n`);
            res.end();
        }
    }
});
// ==========================================
// 7. ACCOUNT PROFILE & GLOBAL PREFERENCES API
// ==========================================
// Get active author profile
app.get('/api/account/profile', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        let profile = await db.get('SELECT * FROM author_profiles WHERE is_active = 1 LIMIT 1');
        if (!profile) {
            profile = await db.get('SELECT * FROM author_profiles ORDER BY id ASC LIMIT 1');
            if (profile) {
                await db.run('UPDATE author_profiles SET is_active = 1 WHERE id = ?', profile.id);
            }
        }
        if (!profile) {
            // Create fallback default
            const result = await db.run(`
        INSERT INTO author_profiles (username, pen_name, email, avatar_color, bio, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, 'author', 'Author', 'author@opencrafter.local', '#c89d54', 'Novelist & Story Architect');
            profile = await db.get('SELECT * FROM author_profiles WHERE id = ?', result.lastID);
        }
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update active author profile
app.put('/api/account/profile', async (req, res) => {
    const { pen_name, email, avatar_color, bio, username } = req.body;
    try {
        const db = await (0, database_1.getDatabase)();
        const active = await db.get('SELECT id FROM author_profiles WHERE is_active = 1 LIMIT 1');
        if (!active) {
            return res.status(404).json({ error: 'No active author profile found' });
        }
        await db.run(`
      UPDATE author_profiles 
      SET pen_name = COALESCE(?, pen_name),
          email = COALESCE(?, email),
          avatar_color = COALESCE(?, avatar_color),
          bio = COALESCE(?, bio),
          username = COALESCE(?, username)
      WHERE id = ?
    `, pen_name, email, avatar_color, bio, username, active.id);
        const updated = await db.get('SELECT * FROM author_profiles WHERE id = ?', active.id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all author profiles (for account switching)
app.get('/api/account/profiles', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const profiles = await db.all('SELECT * FROM author_profiles ORDER BY created_at ASC');
        res.json(profiles);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Register / Create new author pen-name account
app.post('/api/account/register', async (req, res) => {
    const { username, pen_name, email, avatar_color, bio } = req.body;
    if (!username || !pen_name) {
        return res.status(400).json({ error: 'Username and Pen Name are required' });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        // Check if username already exists
        const existing = await db.get('SELECT id FROM author_profiles WHERE username = ?', username);
        if (existing) {
            return res.status(400).json({ error: 'Username is already in use. Please choose another or sign in.' });
        }
        // Set all others to inactive
        await db.run('UPDATE author_profiles SET is_active = 0');
        const result = await db.run(`
      INSERT INTO author_profiles (username, pen_name, email, avatar_color, bio, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, username, pen_name, email || '', avatar_color || '#c89d54', bio || '');
        const newProfile = await db.get('SELECT * FROM author_profiles WHERE id = ?', result.lastID);
        res.status(201).json(newProfile);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Sign in / Switch active account
app.post('/api/account/login', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const profile = await db.get('SELECT * FROM author_profiles WHERE username = ? OR pen_name = ?', username, username);
        if (!profile) {
            return res.status(404).json({ error: `Account "${username}" not found. You can create a new profile.` });
        }
        await db.run('UPDATE author_profiles SET is_active = 0');
        await db.run('UPDATE author_profiles SET is_active = 1 WHERE id = ?', profile.id);
        const activeProfile = await db.get('SELECT * FROM author_profiles WHERE id = ?', profile.id);
        res.json(activeProfile);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Switch active account by ID
app.post('/api/account/switch', async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Account ID is required' });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const profile = await db.get('SELECT * FROM author_profiles WHERE id = ?', id);
        if (!profile) {
            return res.status(404).json({ error: 'Author account not found' });
        }
        await db.run('UPDATE author_profiles SET is_active = 0');
        await db.run('UPDATE author_profiles SET is_active = 1 WHERE id = ?', id);
        const activeProfile = await db.get('SELECT * FROM author_profiles WHERE id = ?', id);
        res.json(activeProfile);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 8. OAUTH SOCIAL AUTHENTICATION (Google & GitHub)
// ==========================================
// Check OAuth status & configuration
app.get('/api/auth/oauth-status', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const gId = await db.get("SELECT value FROM settings WHERE key = 'google_client_id'");
        const ghId = await db.get("SELECT value FROM settings WHERE key = 'github_client_id'");
        const host = req.get('host') || 'localhost:3005';
        const protocol = req.protocol || 'http';
        res.json({
            google: {
                configured: !!(gId && gId.value.trim()),
                callbackUrl: `${protocol}://${host}/api/auth/google/callback`
            },
            github: {
                configured: !!(ghId && ghId.value.trim()),
                callbackUrl: `${protocol}://${host}/api/auth/github/callback`
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Google OAuth URL generator
app.get('/api/auth/google/url', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const gId = await db.get("SELECT value FROM settings WHERE key = 'google_client_id'");
        if (!gId || !gId.value.trim()) {
            return res.status(400).json({
                error: 'Google OAuth Client ID is not configured. Please add your Google Client ID & Secret in Settings.'
            });
        }
        const host = req.get('host') || 'localhost:3005';
        const protocol = req.protocol || 'http';
        const redirectUri = encodeURIComponent(`${protocol}://${host}/api/auth/google/callback`);
        const clientId = encodeURIComponent(gId.value.trim());
        const scope = encodeURIComponent('openid email profile');
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
        res.json({ url: authUrl });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Google OAuth Callback Handler
app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.redirect('/?oauth_error=No_code_provided');
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const gId = await db.get("SELECT value FROM settings WHERE key = 'google_client_id'");
        const gSec = await db.get("SELECT value FROM settings WHERE key = 'google_client_secret'");
        const host = req.get('host') || 'localhost:3005';
        const protocol = req.protocol || 'http';
        const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
        // 1. Exchange authorization code for access token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code,
                client_id: gId?.value || '',
                client_secret: gSec?.value || '',
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            return res.redirect(`/?oauth_error=${encodeURIComponent(err)}`);
        }
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        // 2. Fetch User Profile from Google
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!userRes.ok) {
            return res.redirect('/?oauth_error=Failed_to_fetch_google_user');
        }
        const googleUser = await userRes.json();
        const googleId = googleUser.id;
        const email = googleUser.email || '';
        const name = googleUser.name || email.split('@')[0] || 'Google Author';
        const picture = googleUser.picture || '';
        // 3. Find or Create Author Profile
        let profile = await db.get('SELECT * FROM author_profiles WHERE oauth_provider = "google" AND oauth_id = ?', googleId);
        if (!profile && email) {
            profile = await db.get('SELECT * FROM author_profiles WHERE email = ?', email);
        }
        if (!profile) {
            const username = `google_${email ? email.split('@')[0] : googleId.slice(0, 8)}`;
            const result = await db.run(`
        INSERT INTO author_profiles (username, pen_name, email, avatar_color, avatar_url, bio, oauth_provider, oauth_id, is_active)
        VALUES (?, ?, ?, '#2563eb', ?, 'Authenticated via Google Account', 'google', ?, 1)
      `, username, name, email, picture, googleId);
            profile = await db.get('SELECT * FROM author_profiles WHERE id = ?', result.lastID);
        }
        else {
            await db.run(`
        UPDATE author_profiles 
        SET oauth_provider = 'google', oauth_id = ?, avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
      `, googleId, picture, profile.id);
        }
        // Set as active profile
        await db.run('UPDATE author_profiles SET is_active = 0');
        await db.run('UPDATE author_profiles SET is_active = 1 WHERE id = ?', profile.id);
        res.redirect('/?auth_success=google');
    }
    catch (error) {
        res.redirect(`/?oauth_error=${encodeURIComponent(error.message)}`);
    }
});
// GitHub OAuth URL generator
app.get('/api/auth/github/url', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        const ghId = await db.get("SELECT value FROM settings WHERE key = 'github_client_id'");
        if (!ghId || !ghId.value.trim()) {
            return res.status(400).json({
                error: 'GitHub OAuth Client ID is not configured. Please add your GitHub Client ID & Secret in Settings.'
            });
        }
        const host = req.get('host') || 'localhost:3005';
        const protocol = req.protocol || 'http';
        const redirectUri = encodeURIComponent(`${protocol}://${host}/api/auth/github/callback`);
        const clientId = encodeURIComponent(ghId.value.trim());
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
        res.json({ url: authUrl });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GitHub OAuth Callback Handler
app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.redirect('/?oauth_error=No_code_provided');
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const ghId = await db.get("SELECT value FROM settings WHERE key = 'github_client_id'");
        const ghSec = await db.get("SELECT value FROM settings WHERE key = 'github_client_secret'");
        // 1. Exchange code for access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: ghId?.value || '',
                client_secret: ghSec?.value || '',
                code: code
            })
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            return res.redirect(`/?oauth_error=${encodeURIComponent(tokenData.error_description || 'Failed to exchange GitHub token')}`);
        }
        // 2. Fetch User Profile from GitHub
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'OpenCrafter'
            }
        });
        if (!userRes.ok) {
            return res.redirect('/?oauth_error=Failed_to_fetch_github_user');
        }
        const ghUser = await userRes.json();
        const githubId = String(ghUser.id);
        const username = ghUser.login || `gh_${githubId}`;
        const penName = ghUser.name || ghUser.login || 'GitHub Author';
        const email = ghUser.email || '';
        const avatarUrl = ghUser.avatar_url || '';
        // 3. Find or Create Author Profile
        let profile = await db.get('SELECT * FROM author_profiles WHERE oauth_provider = "github" AND oauth_id = ?', githubId);
        if (!profile && email) {
            profile = await db.get('SELECT * FROM author_profiles WHERE email = ?', email);
        }
        if (!profile) {
            const result = await db.run(`
        INSERT INTO author_profiles (username, pen_name, email, avatar_color, avatar_url, bio, oauth_provider, oauth_id, is_active)
        VALUES (?, ?, ?, '#1e293b', ?, 'Authenticated via GitHub Account', 'github', ?, 1)
      `, username, penName, email, avatarUrl, githubId);
            profile = await db.get('SELECT * FROM author_profiles WHERE id = ?', result.lastID);
        }
        else {
            await db.run(`
        UPDATE author_profiles 
        SET oauth_provider = 'github', oauth_id = ?, avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
      `, githubId, avatarUrl, profile.id);
        }
        // Set as active profile
        await db.run('UPDATE author_profiles SET is_active = 0');
        await db.run('UPDATE author_profiles SET is_active = 1 WHERE id = ?', profile.id);
        res.redirect('/?auth_success=github');
    }
    catch (error) {
        res.redirect(`/?oauth_error=${encodeURIComponent(error.message)}`);
    }
});
// Direct Social Connect / Mock Link for Local Mode
app.post('/api/auth/social-connect', async (req, res) => {
    const { provider, name, email, avatar_url } = req.body;
    if (!provider || !name) {
        return res.status(400).json({ error: 'Provider and name are required' });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        const username = `${provider}_${(email || name).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 15)}`;
        let profile = await db.get('SELECT * FROM author_profiles WHERE username = ? OR (email = ? AND email != "")', username, email);
        if (!profile) {
            const color = provider === 'google' ? '#2563eb' : '#1e293b';
            const result = await db.run(`
        INSERT INTO author_profiles (username, pen_name, email, avatar_color, avatar_url, bio, oauth_provider, oauth_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, username, name, email || '', color, avatar_url || '', `Authenticated via ${provider.toUpperCase()}`, provider, `${provider}_local_id`);
            profile = await db.get('SELECT * FROM author_profiles WHERE id = ?', result.lastID);
        }
        await db.run('UPDATE author_profiles SET is_active = 0');
        await db.run('UPDATE author_profiles SET is_active = 1 WHERE id = ?', profile.id);
        const active = await db.get('SELECT * FROM author_profiles WHERE id = ?', profile.id);
        res.json(active);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 9. CHARACTER ARC & PLOT MATRIX API
// ==========================================
// Get entire Plot Matrix data for a project (scenes, character entities, and cell states)
app.get('/api/projects/:projectId/matrix', async (req, res) => {
    const { projectId } = req.params;
    try {
        const db = await (0, database_1.getDatabase)();
        // 1. Fetch scenes in sequential outline order
        const scenes = await db.all(`
      SELECT o.id, o.title, o.type, o.position, o.parent_id, o.summary, o.status,
             p.title as parent_title
      FROM outline_elements o
      LEFT JOIN outline_elements p ON o.parent_id = p.id
      WHERE o.project_id = ? AND o.type = 'scene'
      ORDER BY o.position ASC, o.id ASC
    `, projectId);
        // 2. Fetch characters from codex
        const characters = await db.all(`
      SELECT id, name, category, aliases, description, notes
      FROM codex_entries
      WHERE project_id = ? AND category = 'character'
      ORDER BY name ASC
    `, projectId);
        // 3. Fetch matrix cells
        const cells = await db.all(`
      SELECT id, scene_id, character_id, role, emotional_state, arc_notes, tension_level
      FROM scene_character_matrix
      WHERE project_id = ?
    `, projectId);
        res.json({
            scenes,
            characters,
            cells
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Upsert a matrix cell
app.post('/api/projects/:projectId/matrix/cell', async (req, res) => {
    const { projectId } = req.params;
    const { sceneId, characterId, role, emotionalState, arcNotes, tensionLevel } = req.body;
    if (!sceneId || !characterId) {
        return res.status(400).json({ error: 'sceneId and characterId are required' });
    }
    try {
        const db = await (0, database_1.getDatabase)();
        await db.run(`
      INSERT INTO scene_character_matrix (project_id, scene_id, character_id, role, emotional_state, arc_notes, tension_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scene_id, character_id) DO UPDATE SET
        role = excluded.role,
        emotional_state = excluded.emotional_state,
        arc_notes = excluded.arc_notes,
        tension_level = excluded.tension_level
    `, projectId, sceneId, characterId, role || 'participant', emotionalState || '', arcNotes || '', tensionLevel || 3);
        const updatedCell = await db.get(`
      SELECT * FROM scene_character_matrix WHERE scene_id = ? AND character_id = ?
    `, sceneId, characterId);
        res.json(updatedCell);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Auto-populate matrix by scanning manuscript text and summaries
app.post('/api/projects/:projectId/matrix/auto-populate', async (req, res) => {
    const { projectId } = req.params;
    try {
        const db = await (0, database_1.getDatabase)();
        const scenes = await db.all(`
      SELECT o.id, o.title, o.summary, sc.content 
      FROM outline_elements o
      LEFT JOIN scene_contents sc ON o.id = sc.scene_id
      WHERE o.project_id = ? AND o.type = 'scene'
    `, projectId);
        const characters = await db.all(`
      SELECT id, name, aliases FROM codex_entries 
      WHERE project_id = ? AND category = 'character'
    `, projectId);
        let populatedCount = 0;
        for (const scene of scenes) {
            const fullText = `${scene.title} ${scene.summary || ''} ${scene.content || ''}`.toLowerCase();
            for (const char of characters) {
                const nameLower = char.name.toLowerCase();
                const aliasList = (char.aliases || '').split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
                const searchTerms = [nameLower, ...aliasList];
                let isMatch = false;
                let matchCount = 0;
                for (const term of searchTerms) {
                    const regex = new RegExp(`\\b${term}\\b`, 'gi');
                    const matches = fullText.match(regex);
                    if (matches) {
                        isMatch = true;
                        matchCount += matches.length;
                    }
                }
                if (isMatch) {
                    const role = matchCount > 4 ? 'pov' : matchCount >= 2 ? 'participant' : 'mentioned';
                    await db.run(`
            INSERT INTO scene_character_matrix (project_id, scene_id, character_id, role, tension_level)
            VALUES (?, ?, ?, ?, 3)
            ON CONFLICT(scene_id, character_id) DO UPDATE SET
              role = excluded.role
          `, projectId, scene.id, char.id, role);
                    populatedCount++;
                }
            }
        }
        res.json({ message: `Successfully scanned and updated ${populatedCount} matrix cell connections!`, count: populatedCount });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// PRODUCTION FRONTEND STATIC SERVING
// ==========================================
const frontendBuildPath = path_1.default.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendBuildPath));
// For SPA routing in production, serve index.html for all non-api routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path_1.default.join(frontendBuildPath, 'index.html'));
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

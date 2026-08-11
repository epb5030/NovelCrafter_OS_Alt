"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let dbInstance = null;
async function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    // Ensure storage folder exists
    const dbDir = process.env.DATABASE_DIR || path_1.default.join(__dirname, '../../data');
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path_1.default.join(dbDir, 'novels.db');
    dbInstance = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
    });
    // Enable foreign keys
    await dbInstance.run('PRAGMA foreign_keys = ON');
    // Initialize schema
    await initializeSchema(dbInstance);
    return dbInstance;
}
async function initializeSchema(db) {
    // Projects
    await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      genre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Codex
    await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      aliases TEXT,
      category TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
    // Outline (Act -> Chapter -> Scene hierarchy)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS outline_elements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      parent_id INTEGER,
      type TEXT NOT NULL, -- 'act', 'chapter', 'scene'
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      summary TEXT,
      status TEXT DEFAULT 'todo', -- 'todo', 'drafting', 'review', 'done'
      metadata TEXT, -- JSON array of codex_entry IDs present in the element
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(parent_id) REFERENCES outline_elements(id) ON DELETE CASCADE
    )
  `);
    // Scene content
    await db.exec(`
    CREATE TABLE IF NOT EXISTS scene_contents (
      scene_id INTEGER PRIMARY KEY,
      content TEXT DEFAULT '',
      last_saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(scene_id) REFERENCES outline_elements(id) ON DELETE CASCADE
    )
  `);
    // Scene Snapshots (Version History)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS scene_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      source TEXT NOT NULL, -- 'manual', 'ai_generation', 'autosave', 'safety_backup'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(scene_id) REFERENCES outline_elements(id) ON DELETE CASCADE
    )
  `);
    // Codex Relationships (for entity connection graphs)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL, -- 'ally', 'enemy', 'rival', 'family', 'located_in', 'owns', 'member_of', 'associated'
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(source_id) REFERENCES codex_entries(id) ON DELETE CASCADE,
      FOREIGN KEY(target_id) REFERENCES codex_entries(id) ON DELETE CASCADE
    )
  `);
    // Settings table for storing local configs & credentials securely (API keys)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
    // Populate default settings (using INSERT OR IGNORE to ensure new keys exist in pre-existing databases)
    const defaultSettings = [
        { key: 'openai_api_key', value: '' },
        { key: 'openai_model', value: 'gpt-4o-mini' },
        { key: 'anthropic_api_key', value: '' },
        { key: 'anthropic_model', value: 'claude-3-5-sonnet-20240620' },
        { key: 'openrouter_api_key', value: '' },
        { key: 'openrouter_model', value: 'meta-llama/llama-3-8b-instruct:free' },
        { key: 'gemini_api_key', value: '' },
        { key: 'gemini_model', value: 'gemini-2.0-flash' },
        { key: 'ollama_url', value: 'http://localhost:11434' },
        { key: 'ollama_model', value: 'llama3' },
        { key: 'active_provider', value: 'ollama' },
        // Style & Prompt Studio Defaults
        { key: 'writing_pov', value: 'third_limited' }, // 'first_person', 'third_limited', 'third_omniscient', 'second_person'
        { key: 'writing_tense', value: 'past' }, // 'past', 'present'
        { key: 'writing_tone', value: 'Balanced Narrative' }, // 'Grimdark & Gritty', 'Lyrical & Atmospheric', 'Fast-Paced Action', 'Humorous & Witty', 'Balanced Narrative'
        { key: 'writing_custom_rules', value: '' },
        { key: 'prompt_template_continue', value: '' },
        { key: 'prompt_template_rewrite', value: '' }
    ];
    for (const setting of defaultSettings) {
        await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', setting.key, setting.value);
    }
}

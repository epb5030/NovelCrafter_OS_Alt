import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure storage folder exists
  const dbDir = process.env.DATABASE_DIR || path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'novels.db');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  await initializeSchema(dbInstance);

  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
    } catch (_) {}
    dbInstance = null;
  }
}

async function initializeSchema(db: Database) {
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
      voice_traits TEXT,
      catchphrases TEXT,
      formality_level INTEGER DEFAULT 3,
      pace_cadence TEXT DEFAULT 'balanced',
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

  // Character Arc & Plot Matrix Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scene_character_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      scene_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      role TEXT DEFAULT 'participant', -- 'pov', 'participant', 'mentioned', 'absent'
      emotional_state TEXT,
      arc_notes TEXT,
      tension_level INTEGER DEFAULT 3, -- 1 to 5
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(scene_id, character_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(scene_id) REFERENCES outline_elements(id) ON DELETE CASCADE,
      FOREIGN KEY(character_id) REFERENCES codex_entries(id) ON DELETE CASCADE
    )
  `);

  // Story Timeline & Chronology Events Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      track TEXT NOT NULL, -- 'main_story', 'character_backstory', 'world_history', 'subplot'
      title TEXT NOT NULL,
      date_label TEXT NOT NULL,
      order_index REAL NOT NULL,
      description TEXT,
      importance TEXT DEFAULT 'normal', -- 'major', 'turning_point', 'normal', 'minor'
      scene_id INTEGER,
      character_id INTEGER,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(scene_id) REFERENCES outline_elements(id) ON DELETE SET NULL,
      FOREIGN KEY(character_id) REFERENCES codex_entries(id) ON DELETE SET NULL
    )
  `);

  // Settings table for storing local configs & credentials securely (API keys)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Author Profiles Table for Multi-Account / Pen Names and Global Author Profile
  await db.exec(`
    CREATE TABLE IF NOT EXISTS author_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pen_name TEXT NOT NULL,
      email TEXT,
      avatar_color TEXT DEFAULT '#c89d54',
      avatar_url TEXT,
      bio TEXT,
      oauth_provider TEXT DEFAULT 'local',
      oauth_id TEXT,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Phase 9: World Cartography & Map Pins Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS map_pins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      codex_location_id INTEGER,
      title TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      pin_type TEXT DEFAULT 'city', -- 'city', 'fortress', 'wilderness', 'landmark', 'dungeon', 'portal'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(codex_location_id) REFERENCES codex_entries(id) ON DELETE SET NULL
    )
  `);

  // Phase 9: Character Journey Paths Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS map_journeys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      path_waypoints TEXT NOT NULL, -- JSON array of pin IDs e.g. [1, 3, 7]
      color TEXT DEFAULT '#c89d54',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(character_id) REFERENCES codex_entries(id) ON DELETE CASCADE
    )
  `);

  // Ensure columns exist for existing databases
  try {
    await db.exec('ALTER TABLE author_profiles ADD COLUMN avatar_url TEXT');
  } catch (_) {}
  try {
    await db.exec("ALTER TABLE author_profiles ADD COLUMN oauth_provider TEXT DEFAULT 'local'");
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE author_profiles ADD COLUMN oauth_id TEXT');
  } catch (_) {}

  // Ensure voice columns exist on codex_entries
  try {
    await db.exec('ALTER TABLE codex_entries ADD COLUMN voice_traits TEXT');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE codex_entries ADD COLUMN catchphrases TEXT');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE codex_entries ADD COLUMN formality_level INTEGER DEFAULT 3');
  } catch (_) {}
  try {
    await db.exec("ALTER TABLE codex_entries ADD COLUMN pace_cadence TEXT DEFAULT 'balanced'");
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE codex_entries ADD COLUMN pos_x REAL');
  } catch (_) {}
  try {
    await db.exec('ALTER TABLE codex_entries ADD COLUMN pos_y REAL');
  } catch (_) {}

  // Seed default author profile if none exist
  const existingAuthor = await db.get('SELECT id FROM author_profiles LIMIT 1');
  if (!existingAuthor) {
    await db.run(`
      INSERT INTO author_profiles (username, pen_name, email, avatar_color, bio, oauth_provider, is_active)
      VALUES (?, ?, ?, ?, ?, 'local', 1)
    `, 'buchhalt', 'E. P. Buchhalt', 'author@opencrafter.local', '#c89d54', 'Architect of worlds and weaver of speculative fiction.');
  }

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
    { key: 'ollama_cloud_url', value: '' },
    { key: 'ollama_cloud_api_key', value: '' },
    { key: 'ollama_cloud_model', value: 'llama3.3:70b' },
    { key: 'ollama_cloud_num_ctx', value: '32768' },
    { key: 'active_provider', value: 'ollama' },
    // Google & GitHub OAuth Credentials
    { key: 'google_client_id', value: '' },
    { key: 'google_client_secret', value: '' },
    { key: 'github_client_id', value: '' },
    { key: 'github_client_secret', value: '' },
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

import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'

const dbPath = join(app.getPath('userData'), 'database.sqlite')
const db = new Database(dbPath)

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    employee_name TEXT,
    role TEXT NOT NULL,
    assigned_persona_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tone TEXT,
    personality TEXT,
    knowledge_boundaries TEXT,
    response_style TEXT,
    restrictions TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    user_id TEXT NOT NULL,
    token TEXT PRIMARY KEY,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS monitoring_screenshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    image_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    content TEXT NOT NULL,
    extracted_text TEXT,
    llm_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS api_configs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_name TEXT NOT NULL,
    endpoint TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

export default db

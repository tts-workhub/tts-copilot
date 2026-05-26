import Database from 'better-sqlite3'
import { join } from 'path'
import os from 'os'
import fs from 'fs'

// For seed script, we'll use a direct path or mock the app.getPath('userData')
const userDataPath = join(os.homedir(), 'AppData', 'Roaming', 'tts-copilot')
const dbPath = join(userDataPath, 'database.sqlite')

// Ensure directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true })
}

if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath)
  } catch (e) {
    console.log('Could not unlink old DB (it might be locked by a running instance):', e)
  }
}

const db = new Database(dbPath)

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

// Seed data
const personaId = 'p1'
const adminId = 'u1'
const userId = 'u2'

db.prepare('INSERT OR REPLACE INTO personas (id, name, tone, personality, content) VALUES (?, ?, ?, ?, ?)')
  .run(personaId, 'HelperBot', 'friendly', 'A helpful assistant', 'You are HelperBot, a friendly and concise assistant.')

db.prepare('INSERT OR REPLACE INTO users (id, username, employee_name, role, assigned_persona_id) VALUES (?, ?, ?, ?, ?)')
  .run(adminId, 'admin', 'Super Administrator', 'SUPER_ADMIN', personaId)

db.prepare('INSERT OR REPLACE INTO users (id, username, employee_name, role, assigned_persona_id) VALUES (?, ?, ?, ?, ?)')
  .run(userId, 'john.doe', 'John Doe', 'REGULAR_USER', personaId)

console.log('Database seeded successfully.')
console.log('Admin User: admin')
console.log('Regular User: john.doe')
console.log('Persona: HelperBot')

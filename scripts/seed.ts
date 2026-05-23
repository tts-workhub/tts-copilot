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

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
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
`)

// Seed data
const personaId = 'p1'
const userId = 'u1'

db.prepare('INSERT OR REPLACE INTO personas (id, name, tone, personality, content) VALUES (?, ?, ?, ?, ?)')
  .run(personaId, 'HelperBot', 'friendly', 'A helpful assistant', 'You are HelperBot, a friendly and concise assistant.')

db.prepare('INSERT OR REPLACE INTO users (id, username, role, assigned_persona_id) VALUES (?, ?, ?, ?)')
  .run(userId, 'admin', 'SUPER_ADMIN', personaId)

console.log('Database seeded successfully.')
console.log('User: admin')
console.log('Persona: HelperBot')

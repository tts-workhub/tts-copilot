import db from '../database'
import { User, Session } from '../types'

export const AuthManager = {
  // Placeholder for OAuth login
  async login(username: string): Promise<any | null> {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
    if (!user) return null

    const token = Math.random().toString(36).substring(7)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
      .run(user.id, token, expiresAt.toISOString())

    const persona = user.assigned_persona_id
      ? db.prepare('SELECT name FROM personas WHERE id = ?').get(user.assigned_persona_id) as any
      : null

    return {
      userId: user.id,
      username: user.username,
      employeeName: user.employee_name,
      role: user.role,
      token,
      expiresAt: expiresAt.toISOString(),
      persona: persona ? persona.name : 'Unassigned'
    }
  },

  async validateSession(token: string): Promise<User | null> {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP').get(token) as any
    if (!session) return null

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as any
    if (!user) return null

    return {
      id: user.id,
      username: user.username,
      role: user.role as any,
      assignedPersonaId: user.assigned_persona_id
    }
  }
}

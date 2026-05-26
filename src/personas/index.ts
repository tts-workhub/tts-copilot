import db from '../database'
import { Persona } from '../types'
import { SecurityUtils } from '../utils/security'

export const PersonaManager = {
  getPersona(id: string): Persona | null {
    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      tone: row.tone,
      personality: SecurityUtils.decrypt(row.personality),
      knowledgeBoundaries: JSON.parse(SecurityUtils.decrypt(row.knowledge_boundaries || SecurityUtils.encrypt('[]'))),
      responseStyle: row.response_style,
      restrictions: JSON.parse(SecurityUtils.decrypt(row.restrictions || SecurityUtils.encrypt('[]'))),
      content: SecurityUtils.decrypt(row.content)
    }
  },

  createPersona(persona: Persona): void {
    const stmt = db.prepare(`
      INSERT INTO personas (id, name, tone, personality, knowledge_boundaries, response_style, restrictions, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      persona.id,
      persona.name,
      persona.tone,
      SecurityUtils.encrypt(persona.personality || ''),
      SecurityUtils.encrypt(JSON.stringify(persona.knowledgeBoundaries || [])),
      persona.responseStyle,
      SecurityUtils.encrypt(JSON.stringify(persona.restrictions || [])),
      SecurityUtils.encrypt(persona.content || '')
    )
  },

  updatePersona(persona: Persona): void {
    const stmt = db.prepare(`
      UPDATE personas
      SET name = ?, tone = ?, personality = ?, knowledge_boundaries = ?, response_style = ?, restrictions = ?, content = ?
      WHERE id = ?
    `)
    stmt.run(
      persona.name,
      persona.tone,
      SecurityUtils.encrypt(persona.personality || ''),
      SecurityUtils.encrypt(JSON.stringify(persona.knowledgeBoundaries || [])),
      persona.responseStyle,
      SecurityUtils.encrypt(JSON.stringify(persona.restrictions || [])),
      SecurityUtils.encrypt(persona.content || ''),
      persona.id
    )
  }
}

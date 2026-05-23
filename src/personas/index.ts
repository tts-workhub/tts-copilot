import db from '../database'
import { Persona } from '../types'

export const PersonaManager = {
  getPersona(id: string): Persona | null {
    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      tone: row.tone,
      personality: row.personality,
      knowledgeBoundaries: JSON.parse(row.knowledge_boundaries || '[]'),
      responseStyle: row.response_style,
      restrictions: JSON.parse(row.restrictions || '[]'),
      content: row.content
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
      persona.personality,
      JSON.stringify(persona.knowledgeBoundaries),
      persona.responseStyle,
      JSON.stringify(persona.restrictions),
      persona.content
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
      persona.personality,
      JSON.stringify(persona.knowledgeBoundaries),
      persona.responseStyle,
      JSON.stringify(persona.restrictions),
      persona.content,
      persona.id
    )
  }
}

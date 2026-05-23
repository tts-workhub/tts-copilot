import pdfParse from 'pdf-parse'
import fs from 'fs'

export interface ParsedPersonaData {
  name: string
  tone: string
  personality: string
  knowledgeBoundaries: string[]
  responseStyle: string
  restrictions: string[]
  content: string
  rawText: string
}

/**
 * Parse PDF file and extract persona information
 * Looks for structured sections or attempts to intelligently parse content
 */
export async function parsePdfToPersona(filePath: string): Promise<ParsedPersonaData> {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    const text = data.text

    // Basic extraction: look for key sections or create from full text
    const personaData: ParsedPersonaData = {
      name: extractField(text, 'name') || 'Extracted Persona',
      tone: extractField(text, 'tone') || detectTone(text),
      personality: extractField(text, 'personality') || text.substring(0, 200),
      knowledgeBoundaries: extractList(text, 'boundaries|limitations|constraints'),
      responseStyle: extractField(text, 'style|format') || 'Professional and concise',
      restrictions: extractList(text, 'restrictions|avoid|do not'),
      content: text,
      rawText: text
    }

    return personaData
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Convert parsed PDF data to JSON for fast crawling
 */
export function personaToJson(persona: ParsedPersonaData): string {
  return JSON.stringify({
    metadata: {
      createdAt: new Date().toISOString(),
      source: 'pdf_upload'
    },
    persona: {
      name: persona.name,
      tone: persona.tone,
      personality: persona.personality,
      knowledgeBoundaries: persona.knowledgeBoundaries,
      responseStyle: persona.responseStyle,
      restrictions: persona.restrictions,
      contentSummary: persona.content.substring(0, 500),
      fullContent: persona.content
    }
  }, null, 2)
}

// Helper functions
function extractField(text: string, fieldName: string): string {
  const regex = new RegExp(`${fieldName}[:\\s]*([^\\n]+)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function extractList(text: string, fieldName: string): string[] {
  const regex = new RegExp(`${fieldName}[:\\s]*([^\\n]+(?:\\n(?!\\n)[^\\n]+)*)`, 'i')
  const match = text.match(regex)
  if (!match) return []
  
  return match[1]
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0 && item.length < 200)
}

function detectTone(text: string): string {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('professional') || lowerText.includes('formal')) return 'Professional'
  if (lowerText.includes('friendly') || lowerText.includes('casual')) return 'Friendly'
  if (lowerText.includes('technical')) return 'Technical'
  if (lowerText.includes('creative')) return 'Creative'
  return 'Balanced'
}

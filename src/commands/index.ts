import { PersonaManager } from '../personas'
import { User } from '../types'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

export const CommandHandler = {
  async handleCommand(user: User, command: string): Promise<string> {
    if (!user.assignedPersonaId) {
      return "System: No persona assigned."
    }

    const persona = PersonaManager.getPersona(user.assignedPersonaId)
    if (!persona) {
      return "System: Assigned persona missing."
    }

    try {
      // Example integration with an OpenAI-compatible API
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are ${persona.name}. Tone: ${persona.tone}. Guidelines: ${persona.content}` },
          { role: 'user', content: command }
        ]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY}` }
      })

      return response.data.choices[0].message.content
    } catch (error) {
      console.error('LLM API Error:', error)
      return `[${persona.name} (Simulated)]: ${command} (LLM API call failed: check credentials in .env)`
    }
  }
}

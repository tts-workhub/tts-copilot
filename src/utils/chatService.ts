import screenshot from 'screenshot-desktop';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import db from '../database';
import { randomUUID } from 'crypto';

export class ChatService {
  static async captureAndExtractText(userId: string): Promise<{ screenshot: string; extractedText: string }> {
    try {
      // Capture screenshot
      const screenshotPath = await screenshot();
      
      // Read screenshot file
      const screenshotData = fs.readFileSync(screenshotPath);
      const base64Screenshot = screenshotData.toString('base64');
      
      // Extract text using Tesseract
      const result = await Tesseract.recognize(screenshotData, 'eng');
      const extractedText = result.data.text;
      
      // Save to database
      const messageId = randomUUID();
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, message_type, content, extracted_text)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        messageId,
        userId,
        'screenshot',
        `Screenshot captured at ${new Date().toISOString()}`,
        extractedText
      );
      
      // Clean up temp screenshot file
      try {
        fs.unlinkSync(screenshotPath);
      } catch (e) {
        console.error('Failed to clean up screenshot file:', e);
      }
      
      return {
        screenshot: `data:image/png;base64,${base64Screenshot}`,
        extractedText
      };
    } catch (error) {
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendToLLM(userId: string, extractedText: string): Promise<{ response: string }> {
    try {
      // Get user's assigned persona
      const user = db.prepare('SELECT assigned_persona_id FROM users WHERE id = ?').get(userId) as any;
      
      if (!user?.assigned_persona_id) {
        throw new Error('No persona assigned to this user');
      }
      
      // Get persona details
      const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(user.assigned_persona_id) as any;
      
      if (!persona) {
        throw new Error('Persona not found');
      }
      
      // Get active API config
      const apiConfig = db.prepare('SELECT * FROM api_configs LIMIT 1').get() as any;
      
      if (!apiConfig) {
        throw new Error('No LLM API configured. Please configure an API in the admin panel.');
      }
      
      // Prepare the prompt with persona context
      const systemPrompt = `You are a professional assistant with the following characteristics:
Name: ${persona.name}
Tone: ${persona.tone}
Personality: ${persona.personality}
Guidelines: ${persona.content}

Please analyze the following text and provide a structured response based on your persona.`;

      const userPrompt = `Please analyze this extracted text from a survey or document:\n\n${extractedText}`;

      // Call LLM API
      let llmResponse: string;
      
      if (apiConfig.provider === 'openai') {
        llmResponse = await this.callOpenAI(apiConfig, systemPrompt, userPrompt);
      } else if (apiConfig.provider === 'anthropic') {
        llmResponse = await this.callAnthropic(apiConfig, systemPrompt, userPrompt);
      } else if (apiConfig.provider === 'google') {
        llmResponse = await this.callGoogle(apiConfig, systemPrompt, userPrompt);
      } else {
        throw new Error(`Unknown API provider: ${apiConfig.provider}`);
      }
      
      // Save to database
      const messageId = randomUUID();
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, message_type, content, extracted_text, llm_response)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        userId,
        'llm_response',
        'LLM Analysis Complete',
        extractedText,
        llmResponse
      );
      
      return { response: llmResponse };
    } catch (error) {
      throw new Error(`LLM processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async callOpenAI(apiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: apiConfig.model_name || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiConfig.api_key}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }

  private static async callAnthropic(apiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: apiConfig.model_name || 'claude-3-opus-20240229',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          'x-api-key': apiConfig.api_key,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.content[0].text;
  }

  private static async callGoogle(apiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model_name || 'gemini-pro'}:generateContent?key=${apiConfig.api_key}`,
      {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.candidates[0].content.parts[0].text;
  }

  static getChatHistory(userId: string, limit: number = 50): any[] {
    const messages = db.prepare(`
      SELECT id, message_type, content, extracted_text, llm_response, created_at
      FROM chat_messages
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
    
    return (messages as any[]).reverse();
  }
}

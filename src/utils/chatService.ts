import screenshot from 'screenshot-desktop';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import db from '../database';
import { randomUUID } from 'crypto';
import { app } from 'electron';
import { SecurityUtils } from './security';

export class ChatService {
  static async captureAndExtractText(userId: string): Promise<{ screenshot: string; extractedText: string }> {
    try {
      // Capture screenshot as buffer
      const imgBuf = await screenshot({ format: 'png' });
      const base64Screenshot = imgBuf.toString('base64');
      
      // Save screenshot in userData/screenshots folder for archival/monitoring
      const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const filename = `${Date.now()}_${userId}.png`;
      const fullPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(fullPath, imgBuf);
      
      // Extract text using Tesseract
      const result = await Tesseract.recognize(imgBuf, 'eng');
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
      
      return {
        screenshot: `data:image/png;base64,${base64Screenshot}`,
        extractedText
      };
    } catch (error) {
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async captureAndStructureSurvey(userId: string): Promise<{ screenshot: string; structuredData: string }> {
    try {
      const { screenshot: screenshotData, extractedText } = await this.captureAndExtractText(userId);
      
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('No significant text found in screenshot to structure.');
      }

      // Prepare a prompt specifically for structuring survey data
      const systemPrompt = `You are a specialized data extractor. Your task is to take OCR text from a survey or form and organize it into a structured, highly readable format.
Identify:
1. Survey Title/Header
2. Questions
3. Available Options/Choices
4. Instructions or context for each section.
Format the output clearly using Markdown.`;

      const userPrompt = `Here is the OCR text from a survey page:\n\n${extractedText}`;

      // Get LLM to structure this
      const { response } = await this.sendToLLM(userId, userPrompt);
      
      // Save the structured message to database as a follow-up or replacement
      const messageId = randomUUID();
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, message_type, content, extracted_text, llm_response)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        userId,
        'llm_response',
        'Structured Survey Analysis',
        extractedText,
        response
      );

      return {
        screenshot: screenshotData,
        structuredData: response
      };
    } catch (error) {
      throw new Error(`Survey structuring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getPersonaGuidance(userId: string, structuredText: string): Promise<{ response: string }> {
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
        throw new Error('No LLM API configured.');
      }
      
      // Decrypt the API Key
      const decryptedKey = SecurityUtils.decrypt(apiConfig.api_key);
      
      const systemPrompt = `You are ${persona.name}. 
TONE: ${persona.tone}
PERSONALITY: ${persona.personality}
KNOWLEDGE BOUNDARIES: ${persona.knowledge_boundaries}
RESTRICTIONS: ${persona.restrictions}
CORE GUIDELINES: ${persona.content}

Your goal is to provide accurate, up-to-date survey answers based STIRCTLY on your persona's profile. 
Analyze the survey questions provided and for each one:
1. Provide the specific answer you would give.
2. Recommend which option to select.
3. Briefly explain why this aligns with your persona.

Stay in character at all times. Use Markdown for a clean structure.`;

      const userPrompt = `Here is a structured survey. Please provide the answers and recommendations according to your persona:\n\n${structuredText}`;

      let llmResponse: string;
      const configWithDecryptedKey = { ...apiConfig, api_key: decryptedKey };

      if (apiConfig.provider === 'openai' || apiConfig.provider === 'deepseek' || apiConfig.provider === 'custom') {
        llmResponse = await this.callOpenAI(configWithDecryptedKey, systemPrompt, userPrompt);
      } else if (apiConfig.provider === 'anthropic') {
        llmResponse = await this.callAnthropic(configWithDecryptedKey, systemPrompt, userPrompt);
      } else if (apiConfig.provider === 'google') {
        llmResponse = await this.callGoogle(configWithDecryptedKey, systemPrompt, userPrompt);
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
        'Persona Survey Guidance',
        structuredText,
        llmResponse
      );
      
      return { response: llmResponse };
    } catch (error) {
      throw new Error(`Persona guidance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      // Decrypt the API Key
      const decryptedKey = SecurityUtils.decrypt(apiConfig.api_key);
      const configWithDecryptedKey = { ...apiConfig, api_key: decryptedKey };

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
      
      if (apiConfig.provider === 'openai' || apiConfig.provider === 'deepseek' || apiConfig.provider === 'custom') {
        llmResponse = await this.callOpenAI(configWithDecryptedKey, systemPrompt, userPrompt);
      } else if (apiConfig.provider === 'anthropic') {
        llmResponse = await this.callAnthropic(configWithDecryptedKey, systemPrompt, userPrompt);
      } else if (apiConfig.provider === 'google') {
        llmResponse = await this.callGoogle(configWithDecryptedKey, systemPrompt, userPrompt);
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
    const endpoint = apiConfig.endpoint || 
      (apiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
    
    const response = await axios.post(
      endpoint,
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
      apiConfig.endpoint || 'https://api.anthropic.com/v1/messages',
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
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.content[0].text;
  }

  private static async callGoogle(apiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    const endpoint = apiConfig.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model_name || 'gemini-pro'}:generateContent?key=${apiConfig.api_key}`;
    
    const response = await axios.post(
      endpoint,
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

  static async testConnection(apiConfig: any): Promise<boolean> {
    try {
      const decryptedKey = SecurityUtils.decrypt(apiConfig.api_key);
      const configWithDecryptedKey = { ...apiConfig, api_key: decryptedKey };

      if (apiConfig.provider === 'openai' || apiConfig.provider === 'deepseek' || apiConfig.provider === 'custom') {
        const endpoint = apiConfig.endpoint || 
          (apiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
        
        await axios.post(
          endpoint,
          {
            model: apiConfig.model_name || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'respond with ok' }],
            max_tokens: 5
          },
          {
            headers: {
              'Authorization': `Bearer ${configWithDecryptedKey.api_key}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
      } else if (apiConfig.provider === 'anthropic') {
        await axios.post(
          apiConfig.endpoint || 'https://api.anthropic.com/v1/messages',
          {
            model: apiConfig.model_name || 'claude-3-haiku-20240307',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'respond with ok' }]
          },
          {
            headers: {
              'x-api-key': configWithDecryptedKey.api_key,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
      } else if (apiConfig.provider === 'google') {
        const endpoint = apiConfig.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model_name || 'gemini-1.5-flash'}:generateContent?key=${configWithDecryptedKey.api_key}`;
        
        await axios.post(
          endpoint,
          {
            contents: [{ parts: [{ text: 'respond with ok' }] }]
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          }
        );
      } else {
        throw new Error(`Unknown provider: ${apiConfig.provider}`);
      }
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      throw new Error(errorMsg);
    }
  }

  static cleanupOldScreenshots(days: number = 7): void {
    try {
      const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) return;

      const files = fs.readdirSync(screenshotsDir);
      const now = Date.now();
      const msPerDay = 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(screenshotsDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > (days * msPerDay)) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error('Screenshot cleanup failed:', error);
    }
  }
}

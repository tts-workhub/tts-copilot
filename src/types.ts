export interface Persona {
  id: string;
  name: string;
  tone: string;
  personality: string;
  knowledgeBoundaries: string[];
  responseStyle: string;
  restrictions: string[];
  content: string; // The full 10k-20k character persona
}

export interface User {
  id: string;
  username: string;
  employee_name?: string;
  role: 'SUPER_ADMIN' | 'REGULAR_USER';
  assignedPersonaId?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  messageType: 'screenshot' | 'llm_response' | 'user_message';
  content: string;
  extractedText?: string;
  llmResponse?: string;
  createdAt: Date;
}

export interface ApiConfig {
  id: string;
  provider: string;
  apiKey: string;
  modelName: string;
  endpoint?: string;
  createdAt: Date;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
}

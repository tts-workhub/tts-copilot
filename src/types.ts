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
  role: 'SUPER_ADMIN' | 'REGULAR_USER';
  assignedPersonaId?: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
}

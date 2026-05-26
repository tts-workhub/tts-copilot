import { Persona } from './types'

export interface IElectronAPI {
  login: (username: string) => Promise<any | null>;
  logout: (token: string) => Promise<{ success: boolean }>;
  sendCommand: (token: string, command: string) => Promise<string>;
  getPersonas: (token: string) => Promise<Persona[]>;
  createPersona: (token: string, persona: any) => Promise<{ success: boolean }>;
  updatePersona: (token: string, persona: any) => Promise<{ success: boolean }>;
  deletePersona: (token: string, id: string) => Promise<{ success: boolean }>;
  uploadPersonaPdf: (token: string, filePath: string) => Promise<{ success: boolean; personaId: string; persona: any; jsonData: string }>;
  getUsers: (token: string) => Promise<any[]>;
  createUser: (token: string, username: string, employeeName: string, role: string, personaId: string) => Promise<{ success: boolean; userId: string }>;
  updateUser: (token: string, userId: string, personaId: string) => Promise<{ success: boolean }>;
  deleteUser: (token: string, userId: string) => Promise<{ success: boolean }>;
  takeScreenshot: (token: string) => Promise<{ screenshot: string; extractedText: string }>;
  sendToLLM: (token: string, text: string) => Promise<{ response: string }>;
  getChatHistory: (token: string) => Promise<any[]>;
  toggleAlwaysOnTop: (onTop: boolean) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

export {}

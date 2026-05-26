import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  login: (username: string) => ipcRenderer.invoke('auth:login', username),
  sendCommand: (token: string, command: string) => ipcRenderer.invoke('command:send', token, command),
  getPersonas: (token: string) => ipcRenderer.invoke('persona:list', token),
  createPersona: (token: string, persona: any) => ipcRenderer.invoke('persona:create', token, persona),
  updatePersona: (token: string, persona: any) => ipcRenderer.invoke('persona:update', token, persona),
  deletePersona: (token: string, id: string) => ipcRenderer.invoke('persona:delete', token, id),
  uploadPersonaPdf: (token: string, filePath: string) => ipcRenderer.invoke('persona:upload-pdf', token, filePath),
  getUsers: (token: string) => ipcRenderer.invoke('user:list', token),
  createUser: (token: string, username: string, employeeName: string, role: string, personaId: string) => ipcRenderer.invoke('user:create', token, username, employeeName, role, personaId),
  updateUser: (token: string, userId: string, personaId: string) => ipcRenderer.invoke('user:update', token, userId, personaId),
  deleteUser: (token: string, userId: string) => ipcRenderer.invoke('user:delete', token, userId),
  // Chat and LLM
  takeScreenshot: (token: string) => ipcRenderer.invoke('chat:screenshot', token),
  takeStructuredScreenshot: (token: string) => ipcRenderer.invoke('chat:screenshot-structured', token),
  getPersonaGuidance: (token: string, structuredText: string) => ipcRenderer.invoke('chat:get-persona-guidance', token, structuredText),
  sendToLLM: (token: string, text: string) => ipcRenderer.invoke('chat:send-llm', token, text),
  getChatHistory: (token: string) => ipcRenderer.invoke('chat:history', token),
  // API Config
  getApiConfigs: (token: string) => ipcRenderer.invoke('api:list-configs', token),
  createApiConfig: (token: string, config: any) => ipcRenderer.invoke('api:create-config', token, config),
  updateApiConfig: (token: string, configId: string, config: any) => ipcRenderer.invoke('api:update-config', token, configId, config),
  deleteApiConfig: (token: string, configId: string) => ipcRenderer.invoke('api:delete-config', token, configId),
  testApiConfig: (token: string, configId: string) => ipcRenderer.invoke('api:test-config', token, configId),
  toggleAlwaysOnTop: (onTop: boolean) => ipcRenderer.invoke('window:always-on-top', onTop)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

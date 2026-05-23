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
  createUser: (token: string, username: string, role: string, personaId: string) => ipcRenderer.invoke('user:create', token, username, role, personaId),
  updateUser: (token: string, userId: string, personaId: string) => ipcRenderer.invoke('user:update', token, userId, personaId),
  deleteUser: (token: string, userId: string) => ipcRenderer.invoke('user:delete', token, userId)
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

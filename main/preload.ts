import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  login: (username: string) => ipcRenderer.invoke('auth:login', username),
  sendCommand: (token: string, command: string) => ipcRenderer.invoke('command:send', token, command),
  getPersonas: () => ipcRenderer.invoke('persona:list'),
  createPersona: (persona: any) => ipcRenderer.invoke('persona:create', persona),
  updatePersona: (persona: any) => ipcRenderer.invoke('persona:update', persona),
  deletePersona: (id: string) => ipcRenderer.invoke('persona:delete', id)
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

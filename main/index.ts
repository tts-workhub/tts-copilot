import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { AuthManager } from '../src/auth'
import { PersonaManager } from '../src/personas'
import { parsePdfToPersona, personaToJson } from '../src/utils/pdfParser'
import { ChatService } from '../src/utils/chatService'
import db from '../src/database'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { SecurityUtils } from '../src/utils/security'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isAlwaysOnTop = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const iconPath = join(__dirname, '../renderer/assets/Logo.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  
  tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Hide',
      click: () => {
        if (mainWindow) mainWindow.hide()
      }
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: () => {
        isAlwaysOnTop = !isAlwaysOnTop
        if (mainWindow) mainWindow.setAlwaysOnTop(isAlwaysOnTop)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
  
  tray.setContextMenu(contextMenu)
}

const validateAdmin = async (token: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user || user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  return user
}

// IPC Handlers
ipcMain.handle('auth:login', async (_, username: string) => {
  if (typeof username !== 'string' || !username.trim()) throw new Error('Invalid username')
  return await AuthManager.login(username)
})

ipcMain.handle('auth:logout', async (_, token: string) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  return { success: true }
})

ipcMain.handle('command:send', async (_, token: string, command: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  const result = await ChatService.sendToLLM(user.id, command)
  return result.response
})

ipcMain.handle('persona:list', async (_, token: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  return db.prepare('SELECT * FROM personas').all()
})

ipcMain.handle('persona:create', async (_, token: string, persona: any) => {
  await validateAdmin(token)
  if (!persona.name) throw new Error('Invalid persona data')
  const id = randomUUID()
  PersonaManager.createPersona({ id, ...persona, knowledgeBoundaries: [], restrictions: [] })
  return { success: true }
})

ipcMain.handle('persona:update', async (_, token: string, persona: any) => {
  await validateAdmin(token)
  if (!persona.id) throw new Error('Missing persona ID')
  PersonaManager.updatePersona(persona)
  return { success: true }
})

ipcMain.handle('persona:delete', async (_, token: string, id: string) => {
  await validateAdmin(token)
  db.prepare('DELETE FROM personas WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('persona:upload-pdf', async (_, token: string, filePath: string) => {
  await validateAdmin(token)
  if (!fs.existsSync(filePath)) throw new Error('File not found')
  const parsedData = await parsePdfToPersona(filePath)
  const personaId = randomUUID()
  PersonaManager.createPersona({ id: personaId, ...parsedData })
  return { success: true, personaId, persona: parsedData }
})

ipcMain.handle('user:list', async (_, token: string) => {
  await validateAdmin(token)
  return db.prepare('SELECT id, username, employee_name, role, assigned_persona_id FROM users').all()
})

ipcMain.handle('user:create', async (_, token: string, username: string, employeeName: string, role: string, personaId: string) => {
  await validateAdmin(token)
  if (!username || !role) throw new Error('Missing fields')
  const userId = randomUUID()
  db.prepare('INSERT INTO users (id, username, employee_name, role, assigned_persona_id) VALUES (?, ?, ?, ?, ?)')
    .run(userId, username, employeeName, role, personaId || null)
  return { success: true, userId }
})

ipcMain.handle('user:update', async (_, token: string, userId: string, personaId: string) => {
  await validateAdmin(token)
  db.prepare('UPDATE users SET assigned_persona_id = ? WHERE id = ?').run(personaId || null, userId)
  return { success: true }
})

ipcMain.handle('user:delete', async (_, token: string, userId: string) => {
  await validateAdmin(token)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  return { success: true }
})

ipcMain.handle('chat:screenshot', async (_, token: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  return await ChatService.captureAndExtractText(user.id)
})

ipcMain.handle('chat:screenshot-structured', async (_, token: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  return await ChatService.captureAndStructureSurvey(user.id)
})

ipcMain.handle('chat:get-persona-guidance', async (_, token: string, structuredText: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  return await ChatService.getPersonaGuidance(user.id, structuredText)
})

ipcMain.handle('chat:history', async (_, token: string, limit?: number) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  return ChatService.getChatHistory(user.id, limit)
})

ipcMain.handle('api:list-configs', async (_, token: string) => {
  await validateAdmin(token)
  return db.prepare('SELECT id, provider, model_name, endpoint FROM api_configs').all()
})

ipcMain.handle('api:create-config', async (_, token: string, config: any) => {
  await validateAdmin(token)
  const id = randomUUID()
  const encryptedKey = SecurityUtils.encrypt(config.apiKey)
  db.prepare('INSERT INTO api_configs (id, provider, api_key, model_name, endpoint) VALUES (?, ?, ?, ?, ?)')
    .run(id, config.provider, encryptedKey, config.modelName, config.endpoint || null)
  return { success: true, configId: id }
})

ipcMain.handle('api:delete-config', async (_, token: string, id: string) => {
  await validateAdmin(token)
  db.prepare('DELETE FROM api_configs WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('api:test-config', async (_, token: string, id: string) => {
  await validateAdmin(token)
  const config = db.prepare('SELECT * FROM api_configs WHERE id = ?').get(id) as any
  if (!config) throw new Error('Not found')
  await ChatService.testConnection(config)
  return { success: true, message: 'Connection successful' }
})
// Window Control Handler
ipcMain.handle('window:always-on-top', async (_, onTop: boolean) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(onTop)
    isAlwaysOnTop = onTop
  }
  return { success: true }
})

// Monitoring & Maintenance Loop (Run every 2 minutes)
setInterval(() => {
  // Storage Cleanup: Delete screenshots older than 7 days
  ChatService.cleanupOldScreenshots(7);
}, 120000);

app.whenReady().then(() => {

  electronApp.setAppUserModelId('com.tts-copilot')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

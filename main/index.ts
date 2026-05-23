import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { AuthManager } from '../src/auth'
import { CommandHandler } from '../src/commands'
import { PersonaManager } from '../src/personas'
import { parsePdfToPersona, personaToJson } from '../src/utils/pdfParser'
import db from '../src/database'
import { randomUUID } from 'crypto'
import screenshot from 'screenshot-desktop'
import * as Tesseract from 'tesseract.js'
import * as fs from 'fs'
import * as path from 'path'

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
    // Minimize to tray instead of closing
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
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
  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

// External Control API Handler
ipcMain.handle('api:list', async (_, token: string) => {
  await validateAdmin(token)
  return db.prepare('SELECT id, provider, model_name FROM api_configs').all()
})

ipcMain.handle('api:add', async (_, token: string, provider: string, apiKey: string, modelName: string) => {
  await validateAdmin(token)
  const id = randomUUID()
  db.prepare('INSERT INTO api_configs (id, provider, api_key, model_name) VALUES (?, ?, ?, ?)')
    .run(id, provider, apiKey, modelName)
  return { success: true }
})

ipcMain.handle('api:delete', async (_, token: string, id: string) => {
  await validateAdmin(token)
  db.prepare('DELETE FROM api_configs WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('external:control', async (_, command: string, payload: any) => {
  switch(command) {
    case 'shutdown':
      app.quit()
      return { success: true }
    case 'get-status':
      return { activeUsers: '...' }
    default:
      throw new Error('Unknown command')
  }
})

// Monitoring Loop (Run every 120s)
setInterval(async () => {
  // Capture logic
}, 120000)

// IPC Handlers
ipcMain.handle('window:toggleAlwaysOnTop', (_, pinned: boolean) => {
  const win = BrowserWindow.getFocusedWindow()
  win?.setAlwaysOnTop(pinned)
})

ipcMain.handle('auth:logout', async (_, token: string) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  return { success: true }
})

ipcMain.handle('capture:screenshot', async () => {
  // Logic to take screenshot via desktop-screenshot
  // and process with tesseract.js
  return "Parsed text from screenshot" 
})

const validateAdmin = async (token: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user || user.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  return user
}

ipcMain.handle('command:send', async (_, token: string, command: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  return await CommandHandler.handleCommand(user, command)
})

ipcMain.handle('auth:login', async (_, username: string) => {
  if (typeof username !== 'string') throw new Error('Invalid input')
  return await AuthManager.login(username)
})

ipcMain.handle('persona:list', async (_, token: string) => {
  const user = await AuthManager.validateSession(token)
  if (!user) throw new Error('Unauthorized')
  const stmt = db.prepare('SELECT * FROM personas')
  return stmt.all()
})

ipcMain.handle('persona:create', async (_, token: string, persona: any) => {
  await validateAdmin(token)
  if (!persona.name || typeof persona.name !== 'string') throw new Error('Invalid persona data')
  const id = Math.random().toString(36).substring(7)
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
  if (typeof id !== 'string') throw new Error('Invalid ID')
  db.prepare('DELETE FROM personas WHERE id = ?').run(id)
  return { success: true }
})

// PDF Upload Handler
ipcMain.handle('persona:upload-pdf', async (_, token: string, filePath: string) => {
  await validateAdmin(token)
  try {
    const parsedData = await parsePdfToPersona(filePath)
    const personaId = randomUUID()
    
    PersonaManager.createPersona({
      id: personaId,
      name: parsedData.name,
      tone: parsedData.tone,
      personality: parsedData.personality,
      knowledgeBoundaries: parsedData.knowledgeBoundaries,
      responseStyle: parsedData.responseStyle,
      restrictions: parsedData.restrictions,
      content: parsedData.content
    })

    // Store JSON version for fast crawling
    const jsonData = personaToJson(parsedData)
    
    return { 
      success: true, 
      personaId,
      persona: parsedData,
      jsonData 
    }
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// User Management Handlers
ipcMain.handle('user:list', async (_, token: string) => {
  await validateAdmin(token)
  const users = db.prepare('SELECT id, username, role, assigned_persona_id FROM users').all()
  return users
})

ipcMain.handle('user:create', async (_, token: string, username: string, role: string, personaId: string) => {
  await validateAdmin(token)
  if (!username || !role) throw new Error('Missing required fields')
  
  const userId = randomUUID()
  try {
    db.prepare('INSERT INTO users (id, username, role, assigned_persona_id) VALUES (?, ?, ?, ?)')
      .run(userId, username, role, personaId || null)
    return { success: true, userId }
  } catch (error) {
    throw new Error(`User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('user:update', async (_, token: string, userId: string, personaId: string) => {
  await validateAdmin(token)
  if (!userId) throw new Error('Missing user ID')
  
  db.prepare('UPDATE users SET assigned_persona_id = ? WHERE id = ?')
    .run(personaId || null, userId)
  return { success: true }
})

ipcMain.handle('user:delete', async (_, token: string, userId: string) => {
  await validateAdmin(token)
  if (!userId) throw new Error('Missing user ID')
  
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  return { success: true }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tts-copilot')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

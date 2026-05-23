import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { AuthManager } from '../src/auth'
import { CommandHandler } from '../src/commands'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

// IPC Handlers
ipcMain.handle('auth:login', async (_, username: string) => {
  return await AuthManager.login(username)
})

ipcMain.handle('persona:list', async () => {
  const stmt = db.prepare('SELECT * FROM personas')
  return stmt.all()
})

ipcMain.handle('persona:create', async (_, persona: any) => {
  const id = Math.random().toString(36).substring(7)
  PersonaManager.createPersona({ id, ...persona, knowledgeBoundaries: [], restrictions: [] })
  return { success: true }
})


app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tts-copilot')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

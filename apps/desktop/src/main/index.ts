import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { handleRequest, restoreSession } from './api'

async function createWindow(): Promise<void> {
  const developmentUrl =
    !app.isPackaged && process.env['NODE_ENV'] === 'development'
      ? process.env['ELECTRON_RENDERER_URL']
      : undefined
  const url = developmentUrl ? new URL(developmentUrl) : undefined
  if (
    url &&
    (url.origin !== 'http://127.0.0.1:5180' || url.username || url.password)
  ) {
    throw new Error(
      'Electron renderer development URL must use http://127.0.0.1:5180'
    )
  }

  const window = new BrowserWindow({
    title: 'Noema',
    width: 1280,
    height: 820,
    minWidth: 390,
    minHeight: 400,
    backgroundColor: '#ffffff',
    icon: join(import.meta.dirname, '../renderer/brand/icon-256.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, '../preload/index.cjs')
    }
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-frame-navigate', (event) => {
    if (!url || !event.isMainFrame || event.url !== url.href)
      event.preventDefault()
  })
  window.webContents.on('will-redirect', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => {
      callback(false)
    }
  )
  window.webContents.session.setPermissionCheckHandler(() => false)

  if (url) {
    await window.loadURL(url.href)
  } else {
    await window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

app
  .whenReady()
  .then(async () => {
    await restoreSession()
    ipcMain.handle('noema:request', (event, request: unknown) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const frame = event.senderFrame
      const expectedUrl =
        process.env['NODE_ENV'] === 'development' && !app.isPackaged
          ? new URL(process.env['ELECTRON_RENDERER_URL'] ?? '').href
          : pathToFileURL(join(import.meta.dirname, '../renderer/index.html'))
              .href
      if (
        !window ||
        frame !== event.sender.mainFrame ||
        frame?.url !== expectedUrl
      ) {
        return { ok: false, status: 403, message: '请求来源无效。' }
      }
      return handleRequest(request as Parameters<typeof handleRequest>[0])
    })
    await createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow().catch((error: unknown) => {
          console.error(error)
          app.exit(1)
        })
      }
    })
  })
  .catch((error: unknown) => {
    console.error(error)
    app.exit(1)
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

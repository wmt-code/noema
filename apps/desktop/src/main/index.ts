import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

async function createWindow(): Promise<void> {
  const developmentUrl = !app.isPackaged && process.env['NODE_ENV'] === 'development'
    ? process.env['ELECTRON_RENDERER_URL']
    : undefined
  const url = developmentUrl ? new URL(developmentUrl) : undefined
  if (url && (url.origin !== 'http://127.0.0.1:5180' || url.username || url.password)) {
    throw new Error('Electron renderer development URL must use http://127.0.0.1:5180')
  }

  const window = new BrowserWindow({
    title: 'Noema',
    width: 1120,
    height: 760,
    minWidth: 390,
    minHeight: 400,
    backgroundColor: '#f1f4f7',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-frame-navigate', (event) => {
    if (!url || !event.isMainFrame || event.url !== url.href) event.preventDefault()
  })
  window.webContents.on('will-redirect', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })
  window.webContents.session.setPermissionCheckHandler(() => false)

  if (url) {
    await window.loadURL(url.href)
  } else {
    await window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow().catch((error: unknown) => {
        console.error(error)
        app.exit(1)
      })
    }
  })
}).catch((error: unknown) => {
  console.error(error)
  app.exit(1)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi } from '../shared/api'

const api: DesktopApi = {
  request: (request) => ipcRenderer.invoke('noema:request', request)
}

contextBridge.exposeInMainWorld('noema', api)

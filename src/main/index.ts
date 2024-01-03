import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ExifReader from 'exifreader'
import store from './store'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  ipcMain.handle('store.get', (_event, key: string) => store.get(key))

  ipcMain.handle('store.set', (_event, key: string, value: unknown) => store.set(key, value))

  ipcMain.handle('store.has', (_event, key: string) => store.has(key))

  ipcMain.handle('showSaveDialog', async (_event, options: SaveDialogOptions) => {
    const { canceled, filePath } = await dialog.showSaveDialog(options)
    if (!canceled) {
      return filePath
    } else return null
  })

  ipcMain.handle('showOpenDialog', async (_event, options: OpenDialogOptions) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options)
    if (!canceled) {
      return filePaths
    } else return null
  })

  ipcMain.handle('getPath', (_event, name: 'home' | 'appData' | 'userData' | 'temp') =>
    app.getPath(name)
  )

  ipcMain.handle('getName', () => app.getName())

  ipcMain.handle('readExif', (_event, path: string) => ExifReader.load(path))

  ipcMain.handle('openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!canceled) {
      return filePaths[0]
    } else return null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { bypassCSP: true } },
  { scheme: 'data', privileges: { bypassCSP: true } }
])
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  protocol.handle('atom', (request) => net.fetch('file://' + request.url.slice('atom:///'.length)))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { zip, zipCancel, getZipTrackList } from './zip'
import { unzip, unzipCancel, getZipIndex } from './unzip'
import { setSetting, getSetting, settingSchema, getEncoder } from './setting'
import { preview, getFileHeadMd5, cleanPreviewCache } from './preview'

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

  ipcMain.handle(
    'zip',
    async (_event, zipTrackList: ZipTrack[], savePath: string) =>
      await zip(zipTrackList, savePath, (progress: ZipProgress) => {
        mainWindow.webContents.send('zipProgress', progress)
      })
  )

  ipcMain.handle('zipCancel', () => zipCancel())

  ipcMain.handle(
    'getZipTrackList',
    async (_event, imageList: ImageInfo[]) => await getZipTrackList(imageList)
  )

  ipcMain.handle(
    'unzip',
    async (_event, filePath: string, savePath: string, zipIndex?: ZipIndex) =>
      await unzip(
        filePath,
        savePath,
        (progress: ZipProgress) => {
          mainWindow.webContents.send('unzipProgress', progress)
        },
        zipIndex
      )
  )

  ipcMain.handle('unzipCancel', () => unzipCancel())

  ipcMain.handle('getZipIndex', async (_event, filePath: string) => await getZipIndex(filePath))

  // setting
  ipcMain.handle('setSetting', (_event, setting: SettingOptions) => setSetting(setting))

  ipcMain.handle('getSetting', () => getSetting())

  ipcMain.handle('getSettingSchema', () => settingSchema)

  ipcMain.handle(
    'getEncoder',
    (_event, encoder: SettingOptions['encoder'], hardware: SettingOptions['hardware']) =>
      getEncoder(encoder, hardware)
  )

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

  ipcMain.handle('openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!canceled) {
      return filePaths[0]
    } else return null
  })

  ipcMain.handle(
    'getFileHeadMd5',
    async (_event, filePath: string) => await getFileHeadMd5(filePath)
  )

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
  { scheme: 'preview', privileges: { bypassCSP: true } },
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

  protocol.handle('preview', (request) => {
    const { pathname, searchParams } = new URL(request.url)
    return preview(
      decodeURI(pathname.slice(1)),
      searchParams.get('md5'),
      searchParams.has('track') ? Number(searchParams.get('track')) : 0,
      searchParams.has('index') ? Number(searchParams.get('index')) : 0,
      searchParams.has('nums') ? Number(searchParams.get('nums')) : 0
    )
  })

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
  cleanPreviewCache()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

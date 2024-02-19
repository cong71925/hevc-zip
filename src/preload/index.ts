import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { join, relative, basename } from 'path'
import fs from 'fs'

// zip
const zip = async (zipTrackList: ZipTrack[], savePath: string) =>
  await ipcRenderer.invoke('zip', zipTrackList, savePath)

const onZipProgress = (onProgress: (progress: Progress) => void) =>
  ipcRenderer.on('zipProgress', (_event, progress: Progress) => onProgress(progress))

const zipCancel = async () => await ipcRenderer.invoke('zipCancel')

const getZipTrackList = async (imageList: ImageInfo[]) =>
  await ipcRenderer.invoke('getZipTrackList', imageList)

// unzip
const unzip = async (filePath: string, savePath: string, zipIndex?: ZipIndex) =>
  await ipcRenderer.invoke('unzip', filePath, savePath, zipIndex)

const onUnzipProgress = (onProgress: (progress: Progress) => void) =>
  ipcRenderer.on('unzipProgress', (_event, progress: Progress) => onProgress(progress))

const unzipCancel = async () => await ipcRenderer.invoke('unzipCancel')

const getZipIndex = async (filePath: string) => await ipcRenderer.invoke('getZipIndex', filePath)

// setting
const setSetting = async (setting: SettingOptions) =>
  await ipcRenderer.invoke('setSetting', setting)

const getSetting = async () => await ipcRenderer.invoke('getSetting')

const getSettingSchema = async () => await ipcRenderer.invoke('getSettingSchema')

const getEncoder = async (
  encoder: SettingOptions['encoder'],
  hardware: SettingOptions['hardware']
) => await ipcRenderer.invoke('getEncoder', encoder, hardware)

const showOpenDialog = async (options: OpenDialogOptions[]) =>
  await ipcRenderer.invoke('showOpenDialog', options)

const showSaveDialog = async (options: SaveDialogOptions[]) =>
  await ipcRenderer.invoke('showSaveDialog', options)

const readDir = (currentDirPath: string, rootDir?: string) => {
  let result: { absolutePath: string; fileName: string; relativePath: string }[] = []
  fs.readdirSync(currentDirPath, { withFileTypes: true }).forEach((dirent) => {
    const filePath = join(currentDirPath, dirent.name)
    if (dirent.isFile() && new RegExp('.(jpg|jpeg|png|webp)$', 'i').test(dirent.name)) {
      result.push({
        absolutePath: filePath,
        fileName: dirent.name,
        relativePath: relative(join(rootDir || currentDirPath, '../'), filePath)
      })
    } else if (dirent.isDirectory()) {
      result = [...result, ...readDir(filePath, rootDir || currentDirPath)]
    }
  })
  return result
}

const isDir = (path: string) => fs.statSync(path).isDirectory()

// Custom APIs for renderer
const api = {
  showOpenDialog,
  showSaveDialog,
  readDir,
  isDir,
  basename,
  join,
  // setting
  getSetting,
  setSetting,
  getEncoder,
  getSettingSchema,
  // zip
  zip,
  onZipProgress,
  zipCancel,
  getZipTrackList,
  // unzip
  unzip,
  onUnzipProgress,
  unzipCancel,
  getZipIndex
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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

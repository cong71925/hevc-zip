import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { join, relative, basename } from 'path'
import fs from 'fs'
import Ffmpeg from 'fluent-ffmpeg'

import { zip, getZipTrackList } from './zip'
import { unzip, getZipIndex } from './unzip'
import { getSetting, setSetting } from './setting'

import ffmpegPath from '../../resources/ffmpeg.exe?asset&asarUnpack'
Ffmpeg.setFfmpegPath(ffmpegPath)

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
  // zip
  zip,
  getZipTrackList,
  // unzip
  unzip,
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

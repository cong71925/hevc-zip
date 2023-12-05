import { ElectronAPI } from '@electron-toolkit/preload'
import { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { basename, join } from 'path'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      zip: (
        zipTrackList: ZipTrack[],
        savePath: string,
        progress?: (progress: Progress) => void
      ) => Promise<void>
      getZipTrackList: (imageList: ImageInfo[]) => Promise<ZipTrack[]>

      unzip: (
        filePath: string,
        savePath: string,
        progress?: (progress: Progress) => void,
        zipIndex?: ZipIndex
      ) => Promise<void>
      getZipIndex: (path: string) => Promise<ZipIndex>

      showOpenDialog: (options?: OpenDialogOptions) => Promise<string[] | null>
      showSaveDialog: (options?: SaveDialogOptions) => Promise<string | null>
      readDir: (currentDirPath: string) => ImageInfo[]
      isDir: (path: string) => boolean
      basename: basename
      join: join
      getSetting: () => Promise<SettingOptions>
      setSetting: (setting: SettingOptions) => Promise<void>
    }
  }
}

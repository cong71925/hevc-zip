import { ElectronAPI } from '@electron-toolkit/preload'
import { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { basename, join } from 'path'
import { JSONSchemaType } from 'ajv'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      zip: (zipTrackList: ZipTrack[], savePath: string) => Promise<void>
      onZipProgress: (onProgress: (progress: Progress) => void) => void
      zipCancel: () => Promise<void>
      getZipTrackList: (imageList: ImageInfo[]) => Promise<ZipTrack[]>

      unzip: (filePath: string, savePath: string, zipIndex?: ZipIndex) => Promise<void>
      onUnzipProgress: (onProgress: (progress: Progress) => void) => void
      unzipCancel: () => Promise<void>
      getZipIndex: (path: string) => Promise<ZipIndex>

      showOpenDialog: (options?: OpenDialogOptions) => Promise<string[] | null>
      showSaveDialog: (options?: SaveDialogOptions) => Promise<string | null>
      readDir: (currentDirPath: string) => ImageInfo[]
      readDirTree: (currentDirPath: string) => ImageTreeInfo
      isDir: (path: string) => boolean
      basename: basename
      join: join
      getFileHeadMd5: (filePath: string) => Promise<string>
      getSetting: () => Promise<SettingOptions>
      setSetting: (setting: SettingOptions) => Promise<void>
      getEncoder: (
        encoder: SettingOptions['encoder'],
        hardware: SettingOptions['hardware']
      ) => Promise<RealEncoder>
      getSettingSchema: () => Promise<JSONSchemaType<SettingOptions>>
    }
  }
}

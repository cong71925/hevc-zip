import { ipcRenderer, shell } from 'electron'
import { join, extname } from 'path'
import fs from 'fs'
import Ffmpeg from 'fluent-ffmpeg'
import { getSetting } from './setting'

export const getZipIndex = async (filePath: string) => {
  const appName = await ipcRenderer.invoke('getName')
  const tempPath = await ipcRenderer.invoke('getPath', 'temp')
  const cacheFolder = join(tempPath, appName)
  const jsonPath = join(cacheFolder, '/index.json')
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder, { recursive: true })
  }
  const ffmpeg = Ffmpeg()
  await new Promise<void>((resolve, reject) => {
    ffmpeg
      .on('error', reject)
      .on('end', resolve)
      .input(filePath)
      .inputOptions([`-dump_attachment:t:0 ${jsonPath}`])
      .toFormat('ffmetadata')
      .output(join(cacheFolder, 'out.null'))
      .run()
  })
  const zipIndex: ZipIndex = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf-8' }))
  fs.rmSync(jsonPath)
  return zipIndex
}

export const unzip = async (
  filePath: string,
  savePath: string,
  progress?: (progress: Progress) => void,
  zipIndex?: ZipIndex
) => {
  zipIndex = zipIndex || (await getZipIndex(filePath))
  const cacheFolder = join(savePath, '.cache')
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder, { recursive: true })
  }

  const { outputType } = await getSetting()

  const { trackList, imageList } = zipIndex
  for (const index in trackList) {
    const { imageType } = trackList[index]
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = Ffmpeg()
      if (progress) {
        ffmpeg.on('progress', (e) => {
          progress({
            ...e,
            state: 'unzipping',
            track: Number(index)
          })
        })
      }

      ffmpeg.input(filePath)
      switch (outputType) {
        case 'jpeg':
        case 'png':
          ffmpeg.output(join(cacheFolder, `track_${index}_%d.${outputType}`))
          break
        case 'original':
        default:
          ffmpeg.output(join(cacheFolder, `track_${index}_%d.${imageType}`))
      }

      ffmpeg
        .outputFormat('image2')
        .outputOption(['-qscale:v 2', `-map 0:${index}`])
        .on('error', (error) => {
          fs.rmSync(cacheFolder, { recursive: true })
          console.error(error)
          reject(error)
        })
        .on('end', resolve)
        .run()
    })
  }

  for (const zipImage of imageList) {
    const { index, track, relativePath, imageType, fileName } = zipImage
    const folder = join(savePath, relativePath, '../')
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true })
    }

    switch (outputType) {
      case 'jpeg':
      case 'png':
        fs.renameSync(
          join(cacheFolder, `./track_${track}_${index + 1}.${outputType}`),
          join(
            savePath,
            (relativePath || fileName).replace(
              new RegExp(extname(relativePath || fileName) + '$'),
              `.${outputType}`
            )
          )
        )
        break

      case 'original':
      default:
        fs.renameSync(
          join(cacheFolder, `./track_${track}_${index + 1}.${imageType}`),
          join(savePath, relativePath || fileName)
        )
    }
  }
  fs.rmSync(cacheFolder, { recursive: true })
  shell.showItemInFolder(savePath)
}

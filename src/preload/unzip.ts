import { ipcRenderer, shell } from 'electron'
import { join, extname } from 'path'
import fs from 'fs'
import Ffmpeg from 'fluent-ffmpeg'
import { getSetting } from './setting'

let controller = new AbortController()

export const unzipCancel = () => {
  controller.abort()
}

export const unzip = async (
  filePath: string,
  savePath: string,
  progress?: (progress: Progress) => void,
  zipIndex?: ZipIndex
) => {
  controller.abort()
  controller = new AbortController()
  const signal = controller.signal

  zipIndex = zipIndex || (await getZipIndex(filePath))
  const cacheFolder = join(savePath, '.cache')
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder, { recursive: true })
  }

  const { outputType, outputWebpLossless, outputQualityLevel } = await getSetting()

  const { trackList, imageList } = zipIndex
  for (const index in trackList) {
    const { imageType } = trackList[index]
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = Ffmpeg()
      signal.addEventListener('abort', () => ffmpeg.kill(''))

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

      const outputFormat = outputType === 'original' ? imageType : outputType
      switch (outputFormat) {
        case 'webp':
          ffmpeg
            .output(join(cacheFolder, `track_${index}_%d.${outputFormat}`))
            .outputOption([
              `-qscale:v ${
                outputWebpLossless ? 75 : getImageQuality(outputFormat, outputQualityLevel)
              }`,
              `-lossless ${outputWebpLossless}`
            ])
          break
        case 'jpeg':
          ffmpeg
            .output(join(cacheFolder, `track_${index}_%d.${outputFormat}`))
            .outputOption([`-qscale:v ${getImageQuality(outputFormat, outputQualityLevel)}`])
          break
        case 'png':
        default:
          ffmpeg.output(join(cacheFolder, `track_${index}_%d.${outputFormat}`))
      }

      ffmpeg
        .outputFormat('image2')
        .outputOption([`-map 0:${index}`])
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
      case 'webp':
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

const getImageQuality = (imageType: 'jpeg' | 'webp', qualityLevel: IntRange<0, 10>) => {
  switch (imageType) {
    case 'jpeg':
      return 31 - 3 * (qualityLevel + 1)
    case 'webp':
      return 10 * qualityLevel + 10
  }
}

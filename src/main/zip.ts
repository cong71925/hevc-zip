import { shell, app } from 'electron'
import { join, dirname, extname } from 'path'
import fs from 'fs'
import Ffmpeg from './ffmpeg'
import ExifReader from 'exifreader'
import { getSetting, getEncoder } from './setting'
import { version } from '../../package.json'

const APP_NAME = app.getName()
const TEMP_PATH = app.getPath('temp')
const ZIP_TEMP_PATH = join(TEMP_PATH, APP_NAME, '/zip')

let controller = new AbortController()

export const zipCancel = () => {
  controller.abort()
}

export const zip = async (
  zipTrackList: ZipTrack[],
  savePath: string,
  progress?: (progress: ZipProgress) => void
) => {
  controller.abort()
  controller = new AbortController()
  const signal = controller.signal

  const targetFolder = dirname(savePath)
  const cacheFolder = join(ZIP_TEMP_PATH, new Date().getTime().toString())
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true })
  }
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder, { recursive: true })
  }
  for (const index in zipTrackList) {
    const payload = zipTrackList[index].imageList
      .map(({ absolutePath }) => `file '${absolutePath}'\nduration 1`)
      .join('\n')
    const targetFile = join(cacheFolder, `content_${index}.txt`)
    fs.writeFileSync(targetFile, payload)
  }
  const zipIndex = zipTrack2Index(zipTrackList)
  fs.writeFileSync(join(cacheFolder, 'index.json'), JSON.stringify(zipIndex))

  const setting = getSetting()

  for (const index in zipTrackList) {
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = Ffmpeg()
      const killFfmpeg = () => ffmpeg.kill('')
      signal.addEventListener('abort', killFfmpeg)
      if (progress) {
        ffmpeg.on('progress', (e) => {
          progress({
            ...e,
            state: 'zipping',
            track: Number(index)
          })
        })
      }
      ffmpeg
        .input(join(cacheFolder, `content_${index}.txt`))
        .fromFormat('concat')
        .inputOption(['-safe 0'])
        .videoCodec(getEncoder(setting.encoder, setting.hardware))
        .size('100%')
        .outputOption(getOutputOption(setting))
        .outputFps(1)
        .output(join(cacheFolder, `content_${index}.mkv`))
        .on('error', (error) => {
          console.error(error)
          fs.rmSync(cacheFolder, { recursive: true })
          signal.removeEventListener('abort', killFfmpeg)
          reject(String(error))
        })
        .on('end', () => {
          signal.removeEventListener('abort', killFfmpeg)
          resolve()
        })
        .run()
    })
  }
  const outputFilePath = savePath.replace(new RegExp(extname(savePath) + '$'), '.mkv')
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = Ffmpeg()
    for (const index in zipTrackList) {
      ffmpeg.input(join(cacheFolder, `content_${index}.mkv`)).outputOption([`-map ${index}:v`])
    }
    if (progress) {
      ffmpeg.on('progress', (e) => {
        progress({ ...e, state: 'merging' })
      })
    }
    ffmpeg
      .output(outputFilePath)
      .outputOption([
        `-attach ${join(cacheFolder, 'index.json')}`,
        '-metadata:s mimetype=application/json',
        '-metadata:s filename=index.json'
      ])
      .videoCodec('copy')
      .on('error', (error) => {
        console.error(error)
        fs.rmSync(cacheFolder, { recursive: true })
        reject(String(error))
      })
      .on('end', () => { 
        resolve()
      })
      .run()
  })
  fs.renameSync(outputFilePath, savePath)
  fs.rmSync(cacheFolder, { recursive: true })
  shell.showItemInFolder(savePath)
}

const zipTrack2Index = (zipTrackList: ZipTrack[]): ZipIndex => ({
  version,
  trackList: zipTrackList.map(({ imageType }, index) => ({ imageType: imageType, track: index })),
  imageList: zipTrackList
    .map(({ imageList, imageType }, track) =>
      imageList.map(({ fileName, relativePath, sort }, index) => ({
        imageType,
        track,
        fileName,
        relativePath,
        index,
        sort
      }))
    )
    .flat(1)
})

const checkImgSizeMax = (height: number, width: number) =>
  Math.pow(2, 31) / 8 - 1 - height * width >= 0

export const getZipTrackList = async (imageList: ImageInfo[]) => {
  controller.abort()
  controller = new AbortController()
  const signal = controller.signal
  let cancel = false
  signal.addEventListener('abort', () => (cancel = true))
  const map = new Map<string, ZipTrack>()
  for (const index in imageList) {
    if (cancel) {
      throw new Error('停止处理')
    }
    const image = imageList[index]
    const tags = await ExifReader.load(image.absolutePath)
    let str: string
    let imageType: 'jpeg' | 'png' | 'webp'
    if (!checkImgSizeMax(tags['Image Height']?.value || 0, tags['Image Width']?.value || 0)) {
      throw new Error(`${image.absolutePath}的图片分辨率超出了FFMEPG的处理上限`)
    }
    switch (tags.FileType.value) {
      case 'jpeg':
        imageType = 'jpeg'
        str = `${tags['Image Height']?.value}x${tags['Image Width']?.value}_${tags['Bits Per Sample']?.value}Bits_${tags['Color Components']?.value}_${tags['Subsampling']?.description}_${tags.FileType.value}`
        break
      case 'png':
        imageType = 'png'
        str = `${tags['Image Height']?.value}x${tags['Image Width']?.value}_${tags['Bit Depth']?.value}Bits_${tags['Color Type']?.description}_${tags.FileType.value}`
        break
      case 'webp':
        imageType = 'webp'
        str = `${tags['Image Height']?.value}x${tags['Image Width']?.value}`
        break
      default:
        continue
    }
    if (map.has(str)) {
      map.set(str, {
        imageType,
        imageList: [...(map.get(str)?.imageList || []), image]
      })
    } else {
      map.set(str, {
        imageType,
        imageList: [image]
      })
    }
  }
  return [...map.values()].sort((a, b) => b.imageList.length - a.imageList.length)
}

const getOutputOption = (setting: SettingOptions) => {
  const encoder = getEncoder(setting.encoder, setting.hardware)
  switch (encoder) {
    case 'libx265':
      return [`-crf ${setting.crf_libx265}`, `-preset ${setting.preset_libx265}`]
    case 'hevc_amf':
      return [
        `-rc cqp`,
        `-qp_i ${setting.crf_hevc_amf}`,
        `-qp_p ${setting.crf_hevc_amf}`,
        `-quality ${10 - setting.preset_hevc_amf}`
      ]
    case 'hevc_nvenc':
      return [
        `-rc constqp`,
        `-cq ${setting.crf_hevc_nvenc + 1}`,
        `-quality ${12 + setting.preset_hevc_nvenc}`
      ]
    case 'libsvtav1':
      return [`-crf ${setting.crf_libsvtav1}`, `-preset ${13 - setting.preset_libsvtav1}`]
    case 'av1_amf':
      return [
        `-rc cqp`,
        `-qp_i ${setting.crf_av1_amf}`,
        `-qp_p ${setting.crf_av1_amf}`,
        `-quality ${100 - 10 * setting.preset_av1_amf}`
      ]
    case 'av1_nvenc':
      return [
        `-rc constqp`,
        `-cq ${setting.crf_av1_nvenc + 1}`,
        `-quality ${12 + setting.preset_av1_nvenc}`
      ]
  }
}

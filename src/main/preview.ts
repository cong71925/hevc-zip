import { net, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import CryptoJS from 'crypto-js'
import Ffmpeg from './ffmpeg'

const APP_NAME = app.getName()
const TEMP_PATH = app.getPath('temp')
const PREVIEW_TEMP_PATH = join(TEMP_PATH, APP_NAME, '/preview')
let unzipping = false

export const cleanPreviewCache = () => {
  fs.rmSync(PREVIEW_TEMP_PATH, { recursive: true })
}

export const preview = async (
  filePath: string,
  md5: string | null,
  track = 0,
  index = 0,
  nums = 0
) => {
  if (!md5) {
    md5 = await getFileHeadMd5(filePath)
  }

  if (!md5) {
    return net.fetch('')
  }
  const cacheFolder = join(PREVIEW_TEMP_PATH, md5)
  if (!fs.existsSync(cacheFolder)) {
    fs.mkdirSync(cacheFolder, { recursive: true })
  }
  const previewImgPath = join(cacheFolder, `track_${track}_${index}.jpg`)
  while (unzipping) {
    await new Promise<void>((resolve) => setTimeout(resolve, 100))
  }
  const preIndex = index - 5 < 0 ? index : index - 5
  const nextIndex = index + 5 > nums ? nums : index + 5
  if (
    !fs.existsSync(join(cacheFolder, `track_${track}_${preIndex}.jpg`)) ||
    !fs.existsSync(join(cacheFolder, `track_${track}_${nextIndex}.jpg`))
  ) {
    unzip(filePath, cacheFolder, track, index)
  }
  if (fs.existsSync(previewImgPath)) {
    return net.fetch('file://' + previewImgPath)
  }
  await unzip(filePath, cacheFolder, track, index)
  return net.fetch('file://' + previewImgPath)
}

export const getFileHeadMd5 = (filePath: string, max = 2 * 1024 * 1024): Promise<string | null> =>
  new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(null)
    }
    const md5 = CryptoJS.algo.MD5.create()
    const readStream = fs.createReadStream(filePath, { start: 0, end: max - 1 })
    readStream.on('data', (chunk) => {
      if (typeof chunk === 'string') {
        md5.update(chunk)
      } else {
        md5.update(CryptoJS.lib.WordArray.create(chunk))
      }
    })
    readStream.on('end', () => {
      resolve(md5.finalize().toString())
    })
    readStream.on('error', () => {
      reject(null)
    })
  })

const unzip = async (filePath: string, cacheFolder: string, track = 0, index = 0) => {
  const ffmpeg = Ffmpeg()
  index = index - 5 < 0 ? index : index - 5
  unzipping = true
  await new Promise<void>((resolve, reject) => {
    ffmpeg
      .input(filePath)
      .output(join(cacheFolder, `track_${track}_%d.jpg`))
      .outputOption([`-qscale:v 2`])
      .outputFormat('image2')
      .outputOption([`-map 0:${track}`])
      .outputOption([`-start_number ${index}`])
      .outputOption([`-ss ${index}`])
      .outputOption([`-t 15`])
      .on('error', (error) => {
        unzipping = false
        reject(String(error))
      })
      .on('end', () => {
        unzipping = false
        resolve()
      })
      .run()
  })
}

import { shell, ipcRenderer } from 'electron'
import { join, dirname, extname } from 'path'
import fs from 'fs'
import Ffmpeg from 'fluent-ffmpeg'
import { getSetting } from './setting'
import { version } from '../../package.json'

export const zip = async (
  zipTrackList: ZipTrack[],
  savePath: string,
  progress?: (progress: Progress) => void
) => {
  const targetFolder = dirname(savePath)
  const cacheFolder = join(targetFolder, '.cache')
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

  const setting = await getSetting()

  for (const index in zipTrackList) {
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = Ffmpeg()
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
        .videoCodec(setting?.encoder || 'libx265')
        .size('100%')
        .outputOption([`-crf ${setting?.crf || 23}`, `-preset ${setting?.preset || 'medium'}`])
        .outputFps(1)
        .output(join(cacheFolder, `content_${index}.mkv`))
        .on('error', (error) => {
          console.error(error)
          fs.rmSync(cacheFolder, { recursive: true })
          reject(String(error))
        })
        .on('end', resolve)
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
      .on('end', resolve)
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
      imageList.map(({ fileName, relativePath }, index) => ({
        imageType,
        track,
        fileName,
        relativePath,
        index
      }))
    )
    .flat(1)
})

const checkImgSizeMax = (height: number, width: number) =>
  Math.pow(2, 31) / 8 - 1 - height * width >= 0

export const getZipTrackList = async (imageList: ImageInfo[]) => {
  const map = new Map<string, ZipTrack>()
  for (const index in imageList) {
    const image = imageList[index]
    const tags = await ipcRenderer.invoke('readExif', image.absolutePath)
    console.log(tags)
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

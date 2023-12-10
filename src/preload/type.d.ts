export declare global {
  interface ZipTrack {
    imageType: 'jpeg' | 'png'
    imageList: ImageInfo[]
  }

  interface ZipIndex {
    version: string
    trackList: {
      imageType: 'jpeg' | 'png'
      track: number
    }[]
    imageList: ZipImageInfo[]
  }

  interface ImageInfo {
    fileName: string
    absolutePath: string
    relativePath: string
  }

  interface ZipImageInfo {
    fileName: string
    relativePath: string
    track: number
    index: number
    imageType: 'jpeg' | 'png'
  }

  interface Progress {
    msg: string
    frames: number
    currentFps: number
    currentKbps: number
    targetSize: number
    timemark: string
    state: 'zipping' | 'merging' | 'unzipping'
    track?: number
  }

  interface SettingOptions {
    encoder: 'libx265' | 'hevc_nvenc' | 'hevc_amf'
    crf: IntRange<0, 52>
    preset:
      | 'ultrafast'
      | 'superfast'
      | 'veryfast'
      | 'faster'
      | 'fast'
      | 'medium'
      | 'slow'
      | 'slower'
      | 'veryslow'
      | 'placebo'
    outputType: 'original' | 'jpeg' | 'png'
  }

  type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

  type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>
}

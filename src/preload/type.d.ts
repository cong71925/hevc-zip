export declare global {
  interface ZipTrack {
    imageType: 'jpeg' | 'png' | 'webp'
    imageList: ImageInfo[]
  }

  interface ZipIndex {
    version: string
    trackList: {
      imageType: 'jpeg' | 'png' | 'webp'
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
    imageType: 'jpeg' | 'png' | 'webp'
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
    encoder: 'hevc' | 'av1'
    hardware: '' | 'amd' | 'nvidia'

    crf_libx265: IntRange<0, 52>
    preset_libx265: IntRange<0, 10>

    crf_hevc_amf: IntRange<0, 52>
    preset_hevc_amf: IntRange<0, 11>

    crf_hevc_nvenc: IntRange<0, 52>
    preset_hevc_nvenc: IntRange<0, 7>

    crf_libsvtav1: IntRange<0, 63>
    preset_libsvtav1: IntRange<0, 14>

    crf_av1_amf: IntRange<0, 256>
    preset_av1_amf: IntRange<0, 11>

    crf_av1_nvenc: IntRange<0, 52>
    preset_av1_nvenc: IntRange<0, 7>

    outputType: 'original' | 'jpeg' | 'png' | 'webp'
    outputWebpLossless: 0 | 1
    outputQualityLevel: IntRange<0, 10>
  }

  type RealEncoder = 'libx265' | 'hevc_amf' | 'hevc_nvenc' | 'libsvtav1' | 'av1_amf' | 'av1_nvenc'

  type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

  type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>
}

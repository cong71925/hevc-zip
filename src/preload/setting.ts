import { ipcRenderer } from 'electron'
import Ajv, { JSONSchemaType } from 'ajv'

const ajv = new Ajv({ useDefaults: true })
export const settingSchema: JSONSchemaType<SettingOptions> = {
  type: 'object',
  properties: {
    encoder: {
      type: 'string',
      enum: ['hevc', 'av1'],
      default: 'hevc'
    },
    hardware: {
      type: 'string',
      enum: ['', 'amd', 'nvidia'],
      default: ''
    },
    crf_libx265: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 51,
      default: 18
    },
    preset_libx265: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9,
      default: 5
    },
    crf_hevc_amf: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 51,
      default: 12
    },
    preset_hevc_amf: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 10,
      default: 5
    },
    crf_hevc_nvenc: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 51,
      default: 18
    },
    preset_hevc_nvenc: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 6,
      default: 3
    },
    crf_libsvtav1: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 62,
      default: 5
    },
    preset_libsvtav1: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 13,
      default: 7
    },
    crf_av1_amf: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 255,
      default: 12
    },
    preset_av1_amf: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 10,
      default: 7
    },
    crf_av1_nvenc: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 51,
      default: 18
    },
    preset_av1_nvenc: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 6,
      default: 3
    },
    outputType: {
      type: 'string',
      enum: ['original', 'jpeg', 'png', 'webp'],
      default: 'original'
    },
    outputWebpLossless: {
      type: 'number',
      enum: [0, 1],
      default: 0
    },
    outputQualityLevel: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9,
      default: 8
    }
  },
  required: [
    'encoder',
    'hardware',
    'crf_libx265',
    'preset_libx265',
    'crf_hevc_amf',
    'preset_hevc_amf',
    'crf_hevc_nvenc',
    'preset_hevc_nvenc',
    'crf_libsvtav1',
    'preset_libsvtav1',
    'crf_av1_amf',
    'preset_av1_amf',
    'crf_av1_nvenc',
    'preset_av1_nvenc',
    'outputType',
    'outputWebpLossless',
    'outputQualityLevel'
  ]
}
const settingValidate = ajv.compile(settingSchema)
const defaultSetting = Object.fromEntries(
  Object.entries(settingSchema.properties as unknown as JSONSchemaType<SettingOptions>).map(
    ([key, value]) => [key, value.default]
  )
) as SettingOptions
Object.freeze(defaultSetting)

export const getSetting = async (): Promise<SettingOptions> => {
  const setting: unknown = await ipcRenderer.invoke('store.get', 'setting')
  if (!settingValidate(setting)) {
    return defaultSetting
  }
  return setting
}

export const setSetting = async (setting: SettingOptions): Promise<void> =>
  await ipcRenderer.invoke('store.set', 'setting', setting)

export const getEncoder = (
  encoder: SettingOptions['encoder'],
  hardware: SettingOptions['hardware']
): RealEncoder => {
  switch (encoder) {
    case 'hevc':
      switch (hardware) {
        case '':
          return 'libx265'
        case 'amd':
          return 'hevc_amf'
        case 'nvidia':
          return 'hevc_nvenc'
      }
      break
    case 'av1':
      switch (hardware) {
        case '':
          return 'libsvtav1'
        case 'amd':
          return 'av1_amf'
        case 'nvidia':
          return 'av1_nvenc'
      }
  }
}

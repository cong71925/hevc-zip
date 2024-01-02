import { ipcRenderer } from 'electron'

const defaultSetting: SettingOptions = {
  encoder: 'libx265',
  crf: 23,
  preset: 'medium',
  outputType: 'original',
  outputWebpLossless: 0,
  outputQualityLevel: 8
}

export const getSetting = async (): Promise<SettingOptions> => {
  const setting: SettingOptions = await ipcRenderer.invoke('store.get', 'setting')
  return {
    ...defaultSetting,
    ...setting
  }
}

export const setSetting = async (setting: SettingOptions): Promise<void> =>
  await ipcRenderer.invoke('store.set', 'setting', setting)

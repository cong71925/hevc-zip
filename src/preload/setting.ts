import { ipcRenderer } from 'electron'

const defaultSetting: SettingOptions = {
  encoder: 'libx265',
  crf: 23,
  preset: 'medium'
}

export const getSetting = async (): Promise<SettingOptions> => {
  const setting: SettingOptions = await ipcRenderer.invoke('store.get', 'setting')
  return setting ? setting : defaultSetting
}

export const setSetting = async (setting: SettingOptions): Promise<void> =>
  await ipcRenderer.invoke('store.set', 'setting', setting)

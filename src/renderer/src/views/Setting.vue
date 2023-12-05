<template>
  <Versions />
  <NForm :model="form">
    <NFormItem label="硬件编码">
      <div class="w-full">
        <NSelect v-model:value="form.encoder" :options="options" />
        <NTag :bordered="false" class="w-full mt-2">
          使用硬件编码器会使图像质量稍微下降，但是可以大幅加快编码速度
        </NTag>
      </div>
    </NFormItem>
    <NFormItem label="CRF">
      <div class="w-full">
        <NSlider v-model:value="form.crf" :step="1" :min="0" :max="51" />
        <NTag :bordered="false" class="w-full mt-2">
          CRF越高，生成的文件越小，但图像质量也会越低
        </NTag>
      </div>
    </NFormItem>
    <NFormItem label="编码等级">
      <div class="w-full">
        <NSlider v-model:value="form.preset" :step="1" :min="0" :max="9" />
        <NTag :bordered="false" class="w-full mt-2">
          编码等级越高，压缩比也就越高，但是编码时间会变长
        </NTag>
      </div>
    </NFormItem>
  </NForm>
</template>
<script setup async lang="ts">
import { NForm, NFormItem, NSelect, NSlider, NTag } from 'naive-ui'
import { reactive, watch } from 'vue'

interface Form extends Omit<SettingOptions, 'preset'> {
  preset: IntRange<0, 10>
}

const options = [
  { value: 'libx265', label: '禁用' },
  { value: 'hevc_nvenc', label: 'Nvidia' },
  { value: 'hevc_amf', label: 'AMD' }
]

const presetList: SettingOptions['preset'][] = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
  'placebo'
]

const setting = await window.api.getSetting()
const form = reactive<Form>({
  encoder: setting.encoder || 'libx265',
  crf: setting.crf || 20,
  preset: (presetList.findIndex((value) => value === setting.preset) as IntRange<0, 10>) || 5
})

watch(form, (newVal) => {
  window.api.setSetting({
    ...newVal,
    preset: presetList[newVal.preset]
  })
})
</script>

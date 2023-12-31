<template>
  <NScrollbar>
    <NForm :model="form" class="mx-2">
      <NFormItem label="硬件编码">
        <div class="w-full">
          <NSelect v-model:value="form.encoder" :options="encoderOptions" />
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
      <NFormItem label="解压输出格式">
        <div class="w-full">
          <NSelect v-model:value="form.outputType" :options="outputTypeOptions" />
          <NTag :bordered="false" class="w-full mt-2">
            强制输出PNG格式可以缓解源文件是JPG时造成的二次编码的图像质量下降问题
          </NTag>
        </div>
      </NFormItem>
      <NFormItem label="WEBP输出编码">
        <div class="w-full">
          <NSelect v-model:value="form.outputWebpLossless" :options="outputWebpLosslessOptions" />
        </div>
      </NFormItem>
      <NFormItem label="解压输出图像质量">
        <div class="w-full">
          <NSlider v-model:value="form.outputQualityLevel" :step="1" :min="0" :max="9" />
          <NTag :bordered="false" class="w-full mt-2">
            输出图像质量越高，输出的图像也就越清晰，但图片的大小也会增加；仅对JPG格式和WEBP有损格式有效
          </NTag>
        </div>
      </NFormItem>
    </NForm>
  </NScrollbar>
</template>
<script setup async lang="ts">
import { NScrollbar, NForm, NFormItem, NSelect, NSlider, NTag } from 'naive-ui'
import { reactive, watch } from 'vue'

interface Form extends Omit<SettingOptions, 'preset'> {
  preset: IntRange<0, 10>
}

const encoderOptions = [
  { value: 'libx265', label: '禁用' },
  { value: 'hevc_nvenc', label: 'Nvidia' },
  { value: 'hevc_amf', label: 'AMD' }
]

const outputTypeOptions = [
  { value: 'original', label: '同源文件' },
  { value: 'png', label: '强制输出PNG格式' },
  { value: 'jpeg', label: '强制输出JPG格式' },
  { value: 'webp', label: '强制输出WEBP格式' }
]

const outputWebpLosslessOptions = [
  { value: 1, label: '无损' },
  { value: 0, label: '有损' }
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
  preset: (presetList.findIndex((value) => value === setting.preset) as IntRange<0, 10>) || 5,
  outputType: setting.outputType || 'original',
  outputWebpLossless: setting.outputWebpLossless || 0,
  outputQualityLevel: setting.outputQualityLevel || 8
})

watch(form, (newVal) => {
  window.api.setSetting({
    ...newVal,
    preset: presetList[newVal.preset]
  })
})
</script>

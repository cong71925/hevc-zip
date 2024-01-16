<template>
  <NScrollbar>
    <NForm :model="form" class="mr-4">
      <NFormItem label="编码器">
        <div class="w-full">
          <NSelect v-model:value="form.encoder" :options="encoderOptions" />
        </div>
      </NFormItem>
      <NFormItem label="硬件编码">
        <div class="w-full">
          <NSelect v-model:value="form.hardware" :options="hardwareOptions" />
          <NTag :bordered="false" class="w-full mt-2">
            使用硬件编码器会使图像质量稍微下降，但是可以大幅加快编码速度
          </NTag>
        </div>
      </NFormItem>
      <NFormItem label="质量因子">
        <div class="w-full">
          <NSlider v-model:value="form[reactiveForm.crf.key]" :step="1" :min="reactiveForm.crf.min"
            :max="reactiveForm.crf.max" />
          <NTag :bordered="false" class="w-full mt-2">
            质量因子越高，生成的文件越小，但图像质量也会越低
          </NTag>
        </div>
      </NFormItem>
      <NFormItem label="编码等级">
        <div class="w-full">
          <NSlider v-model:value="form[reactiveForm.preset.key]" :step="1" :min="reactiveForm.preset.min"
            :max="reactiveForm.preset.max" />
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
import { reactive, ref, watch, watchEffect } from 'vue'

const hardwareOptions = [
  { value: '', label: '禁用' },
  { value: 'nvidia', label: 'Nvidia' },
  { value: 'amd', label: 'AMD' }
]

const encoderOptions = [
  { value: 'hevc', label: 'H.265/HEVC' },
  { value: 'av1', label: 'AV1' }
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

const setting = await window.api.getSetting()
const form = reactive<SettingOptions>({ ...setting })
watch(form, (newVal) => window.api.setSetting({ ...newVal }))

interface ReactiveForm {
  crf: {
    key: `crf_${RealEncoder}`
    min: 0
    max: 51 | 62 | 255
  }
  preset: {
    key: `preset_${RealEncoder}`
    min: 0
    max: 6 | 9 | 10 | 13
  }
}
const getReactiveForm = (realEncoder: RealEncoder): ReactiveForm => ({
  crf: {
    key: `crf_${realEncoder}`,
    min: 0,
    max: window.api.settingSchema.properties[`crf_${realEncoder}`].maximum
  },
  preset: {
    key: `preset_${realEncoder}`,
    min: 0,
    max: window.api.settingSchema.properties[`preset_${realEncoder}`].maximum
  }
})

const { encoder, hardware } = form
const realEncoder = window.api.getEncoder(encoder, hardware)
const reactiveForm = ref<ReactiveForm>(getReactiveForm(realEncoder))

watchEffect(() => {
  const { encoder, hardware } = form
  const realEncoder = window.api.getEncoder(encoder, hardware)
  reactiveForm.value = getReactiveForm(realEncoder)
})
</script>

<template>
  <div class="h-full flex flex-col" @dragover.prevent @drop="drag">
    <NCollapseTransition :show="errorInfo.show">
      <NAlert :title="errorInfo.title" type="error" class="mb-2">
        {{ errorInfo.message }}
      </NAlert>
    </NCollapseTransition>
    <div class="flex">
      <NButton :disabled="loading" class="mr-2" @click="openFile">
        <NIcon size="20" :component="DocumentOutline" />
        <span class="p-1"></span>
        选择文件
      </NButton>
      <div class="flex-1"></div>
      <NButton type="info" ghost :disabled="loading" @click="run">
        <NIcon size="20" :component="PlayOutline" />
        <span class="p-1"></span>
        执行
      </NButton>
    </div>
    <div class="p-1"></div>
    <NInputGroup>
      <NButton :disabled="loading" @click="openSaveDialog">
        <NIcon size="20" :component="SaveOutline" />
        <span class="p-1"></span>
        解压到
      </NButton>
      <NInput v-model:value="savePath" disabled type="text" placeholder="保存路径" />
    </NInputGroup>
    <div class="p-1"></div>
    <NDataTable
      class="flex-1"
      :loading="loading"
      :columns="columns"
      :data="tableData"
      :row-key="getRowKey"
      virtual-scroll
      flex-height
    >
      <template #empty>
        <NEmpty description="空空的" />
      </template>
      <template #loading>
        <NSpin>
          <template #description>{{ loadingMsg }} </template>
        </NSpin>
      </template>
    </NDataTable>
    <NProgress
      v-if="percentage"
      processing
      indicator-placement="inside"
      :percentage="percentage"
      class="pt-2"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, onBeforeUnmount, computed, watch } from 'vue'
import {
  NButton,
  NInput,
  NInputGroup,
  NDataTable,
  NIcon,
  NAlert,
  NCollapseTransition,
  NEmpty,
  NSpin,
  NProgress
} from 'naive-ui'
import { DocumentOutline, PlayOutline, SaveOutline } from '@vicons/ionicons5'
const columns = [
  {
    title: '文件名',
    key: 'fileName',
    width: 110,
    resizable: true
  },
  {
    title: '相对路径',
    key: 'relativePath',
    width: 150,
    resizable: true
  },
  {
    title: '解压后路径',
    key: 'absolutePath'
  }
]
const filePath = ref('')
const savePath = ref('')
const tableData = ref<ImageInfo[]>([])
const loadingMsg = ref('')
const loading = computed(() => (loadingMsg.value ? true : false))
const getRowKey = (row: ImageInfo) => row.relativePath
let zipIndex: ZipIndex

const openSaveDialog = async () => {
  loadingMsg.value = '正在打开文件'
  const filepath = await window.api.showOpenDialog({
    properties: ['openDirectory']
  })
  loadingMsg.value = ''
  if (!filepath) return
  savePath.value = filepath[0]
}

watch(savePath, (path) => {
  tableData.value = tableData.value.map((item) => ({
    ...item,
    absolutePath: window.api.join(path, item.relativePath || item.fileName)
  }))
})

watch(filePath, async (path) => {
  if (!path) return
  loadingMsg.value = '文件解析中...'
  const result = await window.api.getZipIndex(path).catch(() => {
    loadingMsg.value = ''
  })
  if (!result) {
    return
  }
  zipIndex = result
  tableData.value = zipIndex.imageList.map(({ fileName, relativePath }) => ({
    fileName,
    absolutePath: savePath.value ? window.api.join(savePath.value, relativePath || fileName) : '',
    relativePath
  }))
  loadingMsg.value = ''
})

const openFile = async () => {
  loadingMsg.value = '正在打开文件'
  const filepath = await window.api.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: '压缩文件', extensions: ['mkz'] }]
  })
  loadingMsg.value = ''
  if (!filepath || !filepath[0]) return
  filePath.value = filepath[0]
}

const drag = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (loading.value) return
  if (!e.dataTransfer) return
  const file = e.dataTransfer.files?.[0]
  if (!file) {
    return
  }
  filePath.value = file.path
}

const errorInfo = ref({ show: false, message: '', title: '' })

const showErrorMsg = (message: string, title?: string, time = 3000) => {
  errorInfo.value = { show: true, message, title: title || '' }
  const timeout = setTimeout(() => {
    errorInfo.value = { show: false, message: '', title: '' }
  }, time)
  onBeforeUnmount(() => {
    clearTimeout(timeout)
  })
}

const check = () => {
  if (!tableData.value || tableData.value.length < 1) {
    showErrorMsg('没有选择文件！')
    return false
  }
  if (!savePath.value) {
    showErrorMsg('请选择保存路径！')
    return false
  }
  return true
}

const percentage = ref(0)
const run = async () => {
  if (!check()) {
    return
  }

  const sums = tableData.value.length
  percentage.value = 1
  const map = new Map<number, number>()
  loadingMsg.value = '文件解析中...'
  for (const index in zipIndex.imageList) {
    const image = zipIndex.imageList[index]
    map.set(image.track, (map.get(image.track) || 0) + 1)
  }
  const trackSums = [...map].map(([track, imgSums]) => ({ track, imgSums }))
  await window.api
    .unzip(
      filePath.value,
      savePath.value,
      (progress) => {
        switch (progress.state) {
          case 'unzipping': {
            const track = progress.track || 0
            const imageNums =
              trackSums
                .filter((item) => item.track < track)
                .map(({ imgSums }) => imgSums)
                .reduce((a, b) => a + b, 0) + progress.frames
            loadingMsg.value = `${imageNums} / ${sums} 正在解码...`
            percentage.value = Math.round(((imageNums + 1) / (sums + 1)) * 100)
          }
        }
      },
      zipIndex
    )
    .catch((error) => {
      showErrorMsg(String(error))
      console.error(error)
      loadingMsg.value = ''
      percentage.value = 0
    })
  loadingMsg.value = ''
  percentage.value = 0
}
</script>

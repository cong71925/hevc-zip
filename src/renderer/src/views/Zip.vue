<template>
  <div class="h-full flex flex-col" @dragover.prevent @drop="drag">
    <NCollapseTransition :show="errorInfo.show">
      <NAlert :title="errorInfo.title" type="error" class="mb-2" closable @close="clearErrorMsg">
        {{ errorInfo.message }}
      </NAlert>
    </NCollapseTransition>
    <div class="flex">
      <NButton :disabled="loading" class="mr-2" @click="openFiles">
        <NIcon size="20" :component="DocumentOutline" />
        <span class="p-1"></span>
        添加文件
      </NButton>
      <NButton :disabled="loading" class="mr-2" @click="openDirs">
        <NIcon size="20" :component="FolderOpenOutline" />
        <span class="p-1"></span>
        添加文件夹
      </NButton>
      <NButton type="error" ghost :disabled="loading" class="mr-2" @click="tableData = []">
        <NIcon size="20" :component="TrashBinOutline" />
        <span class="p-1"></span>
        清空
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
        保存到
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
          <template #description>{{ loadingMsg }}</template>
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
import { ref, onBeforeUnmount, computed, h } from 'vue'
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
import {
  DocumentOutline,
  FolderOpenOutline,
  PlayOutline,
  TrashBinOutline,
  SaveOutline
} from '@vicons/ionicons5'
import { openImageListPreview } from '@renderer/components/ImagePreview'
const { getZipTrackList, zip } = window.api
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
    title: '路径',
    key: 'absolutePath',
    resizable: true
  },
  {
    title: '操作',
    key: 'preview',
    width: 100,
    render: (_row: ImageInfo, index: number) => [
      h(
        NButton,
        {
          class: 'mr-1',
          onClick: () =>
            openImageListPreview(
              index,
              tableData.value.map(({ absolutePath }) => 'atom:///' + absolutePath)
            ),
          text: true
        },
        { default: () => '预览' }
      ),
      h(
        NButton,
        {
          onClick: () => {
            tableData.value.splice(index, 1)
          },
          text: true,
          type: 'error'
        },
        { default: () => '移除' }
      )
    ]
  }
]
const savePath = ref('')
const tableData = ref<ImageInfo[]>([])
const loadingMsg = ref('')
const loading = computed(() => (loadingMsg.value ? true : false))
const getRowKey = (row: ImageInfo) => row.absolutePath

const openSaveDialog = async () => {
  loadingMsg.value = '正在选择保存路径...'
  const filepath = await window.api.showSaveDialog({
    filters: [{ name: '压缩文件', extensions: ['mkz'] }]
  })
  loadingMsg.value = ''
  if (!filepath) return
  savePath.value = filepath
}

const openFiles = async () => {
  loadingMsg.value = '正在打开文件...'
  const filepath = await window.api.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片文件', extensions: ['jpg', 'png'] }]
  })
  loadingMsg.value = ''
  if (!filepath) return
  tableData.value = [
    ...tableData.value,
    ...filepath.map((path) => ({
      fileName: window.api.basename(path),
      absolutePath: path,
      relativePath: ''
    }))
  ]
}

const openDirs = async () => {
  loadingMsg.value = '正在打开文件...'
  const filepath = await window.api.showOpenDialog({
    properties: ['openDirectory', 'multiSelections']
  })
  loadingMsg.value = ''
  if (!filepath) return
  tableData.value = [
    ...tableData.value,
    ...filepath.map((path) => window.api.readDir(path)).flat(1)
  ]
}

const drag = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (loading.value) return
  if (!e.dataTransfer) return
  for (const file of e.dataTransfer.files) {
    if (window.api.isDir(file.path)) {
      tableData.value = [...tableData.value, ...window.api.readDir(file.path)]
    } else if (file.type === 'image/jpeg' || file.type === 'image/png') {
      tableData.value = [
        ...tableData.value,
        { fileName: file.name, absolutePath: file.path, relativePath: '\\' }
      ]
    }
  }
}

const errorInfo = ref({ show: false, message: '', title: '' })

const showErrorMsg = (message: string, title?: string, time = 3000) => {
  errorInfo.value = { show: true, message, title: title || '' }
  if (time) {
    const timeout = setTimeout(clearErrorMsg, time)
    onBeforeUnmount(() => {
      clearTimeout(timeout)
    })
  }
}

const clearErrorMsg = () => {
  errorInfo.value = { show: false, message: '', title: '' }
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
  loadingMsg.value = '正在构建索引...'
  const zipTrackList = await getZipTrackList(tableData.value.map((item) => ({ ...item }))).catch(
    (msg) => {
      showErrorMsg(msg, '', 0)
      loadingMsg.value = ''
    }
  )
  if (!zipTrackList) {
    loadingMsg.value = ''
    percentage.value = 0
    return
  }
  percentage.value = 2
  await zip(zipTrackList, savePath.value, (progress) => {
    switch (progress.state) {
      case 'zipping': {
        const track = progress.track || 0
        const imageNums =
          zipTrackList
            .filter((_item, index) => index < track)
            .map(({ imageList }) => imageList.length)
            .reduce((a, b) => a + b, 0) + progress.frames
        loadingMsg.value = `${imageNums} / ${sums} 正在编码...`
        percentage.value = Math.round(((imageNums + 2) / (sums + 3)) * 100)
        return
      }
      case 'merging':
        loadingMsg.value = `正在合并...`
        return
      default:
        return
    }
  }).catch((error) => {
    showErrorMsg(String(error))
    console.error(error)
    loadingMsg.value = ''
    percentage.value = 0
  })
  loadingMsg.value = ''
  percentage.value = 0
}
</script>

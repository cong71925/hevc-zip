<template>
  <div class="h-full flex flex-col" @dragover.prevent @drop="drag">
    <NCollapseTransition :show="errorInfo.show">
      <NAlert :title="errorInfo.title" type="error" class="mb-2" closable @close="clearErrorMsg">
        {{ errorInfo.message }}
      </NAlert>
    </NCollapseTransition>
    <div class="flex">
      <NButton :disabled="loading" class="mr-2" @click="openFiles">
        <template #icon>
          <NIcon size="20" :component="DocumentOutline" />
        </template>
        添加文件
      </NButton>
      <NButton :disabled="loading" class="mr-2" @click="openDirs">
        <template #icon>
          <NIcon size="20" :component="FolderOpenOutline" />
        </template>
        添加文件夹
      </NButton>
      <NButton type="error" ghost :disabled="loading" class="mr-2" @click="treeData = []">
        <template #icon>
          <NIcon size="20" :component="TrashBinOutline" />
        </template>
        清空
      </NButton>
      <div class="flex-1"></div>
      <NButton type="info" ghost :loading="loading" @click="run">
        <template #icon>
          <NIcon size="20" :component="PlayOutline" />
        </template>
        执行
      </NButton>
    </div>
    <div class="p-1"></div>
    <NInputGroup>
      <NButton :disabled="loading" @click="openSaveDialog">
        <template #icon>
          <NIcon size="20" :component="SaveOutline" />
        </template>
        保存到
      </NButton>
      <NInput v-model:value="savePath" disabled type="text" placeholder="保存路径" />
    </NInputGroup>
    <div class="p-1"></div>
    <NSpin :show="loading" class="flex-1">
      <template #description>
        {{ loadingMsg }}
      </template>
      <FileTree v-model:data="treeData" @preview="handlePreview" />
    </NSpin>
    <!-- <FileTree v-model:data="treeData" /> -->
    <div v-if="percentage" class="flex items-center pt-2">
      <NProgress class="pr-2" processing indicator-placement="inside" :percentage="percentage" />
      <NButton type="error" size="tiny" ghost @click="zipCancel">
        <template #icon>
          <NIcon size="12" :component="CloseOutline" />
        </template>
      </NButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onBeforeUnmount, computed } from 'vue'
import {
  NButton,
  NInput,
  NInputGroup,
  NIcon,
  NAlert,
  NCollapseTransition,
  NSpin,
  NProgress,
  useThemeVars
} from 'naive-ui'
import {
  DocumentOutline,
  FolderOpenOutline,
  PlayOutline,
  TrashBinOutline,
  SaveOutline,
  CloseOutline
} from '@vicons/ionicons5'
import FileTree from '@renderer/components/FileTree.vue'
import { openImageListPreview, openImagePreview } from '@renderer/components/ImagePreview'
const { getZipTrackList, zip } = window.api

const savePath = ref('')
const treeData = ref<ImageTreeInfo[]>([])
const loadingMsg = ref('')
const loading = computed(() => (loadingMsg.value ? true : false))

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
    filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  })
  loadingMsg.value = ''
  if (!filepath) return
  treeData.value = [
    ...filepath.map((path) => ({
      fileName: window.api.basename(path),
      absolutePath: path,
      relativePath: ''
    })),
    ...treeData.value
  ]
}

const deDuplication = (data: ImageTreeInfo[]) => [
  ...new Map(data.map((item) => [item.absolutePath, item])).values()
]

const openDirs = async () => {
  loadingMsg.value = '正在打开文件...'
  const filepath = await window.api.showOpenDialog({
    properties: ['openDirectory', 'multiSelections']
  })
  loadingMsg.value = ''
  if (!filepath) return
  treeData.value = deDuplication([
    ...filepath.map((path) => window.api.readDirTree(path)),
    ...treeData.value
  ])
  console.log('treeData', treeData.value)
}

const drag = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (loading.value) return
  if (!e.dataTransfer) return
  for (const file of e.dataTransfer.files) {
    if (window.api.isDir(file.path)) {
      treeData.value = deDuplication([window.api.readDirTree(file.path), ...treeData.value])
    } else if (
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp'
    ) {
      treeData.value = deDuplication([
        { fileName: file.name, absolutePath: file.path, relativePath: '' },
        ...treeData.value
      ])
    }
  }
}

const handlePreview = (option: ImageTreeInfo) => {
  if (option.content) return
  const { parent } = option
  if (!parent || !parent?.content) {
    openImagePreview('atom:///' + option.absolutePath)
    return
  }
  const index =
    (parent?.content || []).findIndex(({ relativePath }) => relativePath === option.relativePath) ||
    0
  openImageListPreview(
    index,
    (parent?.content || []).map(({ absolutePath }) => 'atom:///' + absolutePath)
  )
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
  if (!treeData.value || treeData.value.length < 1) {
    showErrorMsg('没有选择文件！')
    return false
  }
  if (!savePath.value) {
    showErrorMsg('请选择保存路径！')
    return false
  }
  return true
}

const flatTree = (data: ImageTreeInfo[]): ImageInfo[] => {
  const result: ImageInfo[] = []
  for (let index = 0; index < data.length; index++) {
    const element = data[index]
    if (element.content) {
      result.push(...flatTree(element.content))
    } else {
      result.push({
        fileName: element.fileName,
        absolutePath: element.absolutePath,
        relativePath: element.relativePath || element.fileName
      })
    }
  }
  return result
}

const addAttrSort = (data: ImageInfo[]): ImageInfo[] => data.map((item, index) => ({ ...item, sort: index }))

const percentage = ref(0)
const run = async () => {
  if (!check()) {
    return
  }
  const imageList = addAttrSort(flatTree(treeData.value))
  const sums = imageList.length
  percentage.value = Number(((1 / (sums + 3)) * 100).toFixed(2))
  loadingMsg.value = '正在构建索引...'
  const zipTrackList = await getZipTrackList(imageList).catch((msg) => {
    showErrorMsg(msg, '', 0)
    loadingMsg.value = ''
  })
  if (!zipTrackList) {
    loadingMsg.value = ''
    percentage.value = 0
    return
  }

  percentage.value = percentage.value = Number(((2 / (sums + 3)) * 100).toFixed(2))
  window.api.onZipProgress((progress) => {
    switch (progress.state) {
      case 'zipping': {
        const track = progress.track || 0
        const imageNums =
          zipTrackList
            .filter((_item, index) => index < track)
            .map(({ imageList }) => imageList.length)
            .reduce((a, b) => a + b, 0) + progress.frames
        loadingMsg.value = `${imageNums} / ${sums} 正在编码...`
        percentage.value = Number((((imageNums + 2) / (sums + 3)) * 100).toFixed(2))
        return
      }
      case 'merging':
        loadingMsg.value = `正在合并...`
        return
    }
  })
  await zip(zipTrackList, savePath.value).catch((error) => {
    showErrorMsg(String(error))
    console.error(error)
    loadingMsg.value = ''
    percentage.value = 0
  })
  loadingMsg.value = ''
  percentage.value = 0
}
const zipCancel = window.api.zipCancel

const { borderColor, borderRadius } = useThemeVars().value
</script>
<style scoped>
:deep(.n-spin-content) {
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  border-color: v-bind(borderColor);
  border-radius: v-bind(borderRadius);
  border-width: 0.5px;
}
</style>

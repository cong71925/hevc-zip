<template>
  <div class="h-full flex flex-col" @dragover.prevent @drop="drag">
    <NCollapseTransition :show="errorInfo.show">
      <NAlert :title="errorInfo.title" type="error" class="mb-2">
        {{ errorInfo.message }}
      </NAlert>
    </NCollapseTransition>
    <div class="flex">
      <NButton :disabled="loading" class="mr-2" @click="openFile">
        <template #icon>
          <NIcon size="20" :component="DocumentOutline" />
        </template>
        选择文件
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
        解压到
      </NButton>
      <NInput v-model:value="savePath" disabled type="text" placeholder="保存路径" />
    </NInputGroup>
    <div class="p-1"></div>
    <NSpin :show="loading" class="flex-1">
      <template #description>
        {{ loadingMsg }}
      </template>
      <FileTree v-model:data="treeData" modify-disabled @preview="handlePreview" />
    </NSpin>
    <div v-if="percentage" class="flex items-center pt-2">
      <NProgress class="pr-2" processing indicator-placement="inside" :percentage="percentage" />
      <NButton type="error" size="tiny" ghost @click="unzipCancel">
        <template #icon>
          <NIcon size="12" :component="CloseOutline" />
        </template>
      </NButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onBeforeUnmount, computed, watch } from 'vue'
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
import { DocumentOutline, PlayOutline, SaveOutline, CloseOutline } from '@vicons/ionicons5'
import { openImagePreview, openImageListPreview } from '@renderer/components/ImagePreview'
import FileTree from '@renderer/components/FileTree.vue'

const loadingMsg = ref('')
const loading = computed(() => (loadingMsg.value ? true : false))

const filePath = ref('')
const savePath = ref('')
const zipIndex = ref<ZipIndex | null>(null)
const treeData = ref<ImageTreeInfo[]>([])
let fileMd5: string

const openSaveDialog = async () => {
  loadingMsg.value = '正在打开文件'
  const filepath = await window.api.showOpenDialog({
    properties: ['openDirectory']
  })
  loadingMsg.value = ''
  if (!filepath) return
  savePath.value = filepath[0]
}

watch(filePath, async (path) => {
  if (!path) return
  loadingMsg.value = '文件解析中...'
  fileMd5 = await window.api.getFileHeadMd5(path)
  const result = await window.api.getZipIndex(path).catch(() => {
    loadingMsg.value = ''
  })
  if (!result) {
    return
  }
  zipIndex.value = result
  loadingMsg.value = ''
  treeData.value = generateTreeData(zipIndex.value)
})

const trackSumsMap = computed(() => {
  const map = new Map<number, number>()
  if (!zipIndex.value) return map
  zipIndex.value.imageList.forEach(({ track }) => {
    map.set(track, (map.get(track) || 0) + 1)
  })
  return map
})

const generateTreeData = (zipIndex: ZipIndex) => {
  if (!zipIndex) return []
  const map = new Map<string, ImageTreeInfo>()
  const imageList = zipIndex.imageList.toSorted((a, b) => (a.sort || 0) - (b.sort || 0))
  for (const { fileName, relativePath, track, index } of imageList) {
    if (!relativePath) {
      map.set(fileName, {
        fileName,
        absolutePath: '',
        relativePath: fileName,
        track,
        index
      })
      continue
    }
    const paths = relativePath.split(/[/\\]/)
    let currentPath = ''
    paths.forEach((name, i) => {
      currentPath = currentPath ? window.api.join(currentPath, name) : name
      if (!map.has(currentPath)) {
        const payload = Object.assign(
          {
            fileName: name,
            absolutePath: '',
            relativePath: currentPath
          },
          paths.length - 1 === i ? { track, index } : { content: [] }
        )
        map.set(currentPath, payload)
      }
      if (i > 0) {
        const parentPath = paths.slice(0, i).join('\\')
        const parent = map.get(parentPath)
        if (parent && parent.content && !parent.content.find((item) => item.fileName === name)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          parent.content.push({ ...map.get(currentPath)!, parent })
        }
      }
    })
  }
  return [...map.values()].filter((item) => !item.relativePath.includes('\\'))
}

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
    (parent?.content || []).map(
      ({ track, index: i }) =>
        `preview:///${filePath.value}?md5=${fileMd5}&track=${track}&index=${i}&nums=${track !== void 0 ? trackSumsMap.value.get(track) : i}`
    )
  )
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
  if (!zipIndex.value || zipIndex.value.imageList.length < 1) {
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
  if (!zipIndex.value) {
    return
  }
  if (!check()) {
    return
  }

  const sums = zipIndex.value.imageList.length
  percentage.value = Number(((1 / (sums + 1)) * 100).toFixed(2))
  const map = new Map<number, number>()
  loadingMsg.value = '文件解析中...'
  for (const index in zipIndex.value.imageList) {
    const image = zipIndex.value.imageList[index]
    map.set(image.track, (map.get(image.track) || 0) + 1)
  }
  const trackSums = [...map].map(([track, imgSums]) => ({ track, imgSums }))
  window.api.onUnzipProgress((progress: Progress) => {
    switch (progress.state) {
      case 'unzipping': {
        const track = progress.track || 0
        const imageNums =
          trackSums
            .filter((item) => item.track < track)
            .map(({ imgSums }) => imgSums)
            .reduce((a, b) => a + b, 0) + progress.frames
        loadingMsg.value = `${imageNums} / ${sums} 正在解码...`
        percentage.value = Number((((imageNums + 1) / (sums + 1)) * 100).toFixed(2))
      }
    }
  })
  await window.api.unzip(filePath.value, savePath.value).catch((error) => {
    showErrorMsg(String(error))
    console.error(error)
    loadingMsg.value = ''
    percentage.value = 0
  })
  loadingMsg.value = ''
  percentage.value = 0
}

const unzipCancel = window.api.unzipCancel

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

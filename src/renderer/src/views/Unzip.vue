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
    <NDataTable
      class="flex-1"
      :loading="loading"
      :columns="columns"
      :data="sortedTableData"
      :row-key="getRowKey"
      virtual-scroll
      flex-height
      @update-sorter="handleSorterChange"
    >
      <template #empty>
        <NEmpty description="空空的" />
      </template>
      <template #loading>
        <NSpin>
          <template #description>
            {{ loadingMsg }}
          </template>
        </NSpin>
      </template>
    </NDataTable>
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
import { ref, onBeforeUnmount, computed, watch, h } from 'vue'
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
import { DataTableSortState, DataTableBaseColumn } from 'naive-ui'
import { DocumentOutline, PlayOutline, SaveOutline, CloseOutline } from '@vicons/ionicons5'
import { openImageListPreview } from '@renderer/components/ImagePreview'
const columns = ref<DataTableBaseColumn[]>([
  {
    title: '文件名',
    key: 'fileName',
    width: 110,
    resizable: true,
    sortOrder: 'ascend',
    sorter: true
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
  },
  {
    title: '操作',
    key: 'preview',
    width: 100,
    render: (_rowData, rowIndex) => [
      h(
        NButton,
        {
          class: 'mr-1',
          onClick: () =>
            openImageListPreview(
              rowIndex,
              sortedTableData.value.map(
                ({ track, index, thisTrackImageNums }) =>
                  `preview:///${filePath.value}?md5=${fileMd5}&track=${track}&index=${index}&nums=${thisTrackImageNums}`
              )
            ),
          text: true
        },
        { default: () => '预览' }
      )
    ]
  }
])

const tableData = computed(() =>
  zipIndex.value
    ? zipIndex.value.imageList.map(({ fileName, relativePath, track, index }, _index, array) => ({
        fileName,
        thisTrackImageNums: array.filter((item) => item.track === track).length,
        absolutePath: savePath.value
          ? window.api.join(savePath.value, relativePath || fileName)
          : '',
        relativePath,
        track,
        index
      }))
    : []
)

const handleSorterChange = (sorter: DataTableSortState) => {
  columns.value[0].sortOrder = sorter.order
}

const sortedTableData = computed(() => {
  switch (columns.value[0].sortOrder) {
    case 'ascend':
      return tableData.value.toSorted((a, b) => a.fileName.localeCompare(b.fileName))
    case 'descend':
      return tableData.value.toSorted((a, b) => b.fileName.localeCompare(a.fileName))
    default:
      return tableData.value
  }
})

const getRowKey = (row: ImageInfo) => row.relativePath

const loadingMsg = ref('')
const loading = computed(() => (loadingMsg.value ? true : false))

const filePath = ref('')
const savePath = ref('')
const zipIndex = ref<ZipIndex | null>(null)
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
  if (!zipIndex.value) {
    return
  }
  if (!check()) {
    return
  }

  const sums = tableData.value.length
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
  await window.api.unzip(filePath.value, savePath.value, zipIndex.value).catch((error) => {
    showErrorMsg(String(error))
    console.error(error)
    loadingMsg.value = ''
    percentage.value = 0
  })
  loadingMsg.value = ''
  percentage.value = 0
}

const unzipCancel = window.api.unzipCancel
</script>

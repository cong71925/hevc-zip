<template>
  <NTree
    v-if="props.data && props.data.length"
    v-bind="$attrs"
    :data="props.data"
    :expanded-keys="expandedKeys"
    label-field="fileName"
    children-field="content"
    key-field="relativePath"
    expand-on-click
    ellipsis
    :node-props="nodeProps"
    :render-suffix="renderSuffix"
    :selectable="false"
    virtual-scroll
    block-line
    draggable
    flex-height
    :on-drop="handleDrop"
    :render-prefix="renderPrefix"
    :allow-drop="isAllowDrop"
    @update:expanded-keys="handleExpandedKeysChange"
  >
  </NTree>
  <NEmpty v-else description="空空的" class="grow items-center justify-center" />
  <NDropdown
    trigger="manual"
    placement="bottom-start"
    :options="dropdownOptions"
    :show="showDropdownRef"
    :x="xRef"
    :y="yRef"
    @clickoutside="handleClickOutside"
    @select="handleSelect"
  />
</template>

<script setup lang="ts">
import { h, ref, computed, withModifiers } from 'vue'
import { NTree, NIcon, NButton, NEmpty, NDropdown } from 'naive-ui'
import {
  FolderOutline,
  FolderOpenOutline,
  ImageOutline,
  EyeOutline,
  TrashOutline
} from '@vicons/ionicons5'
import type { TreeOption, TreeDropInfo, DropdownOption } from 'naive-ui'

const props = defineProps<{
  data: (ImageTreeInfo & TreeOption)[]
  modifyDisabled?: boolean
}>()
const emit = defineEmits<{ (e: 'preview', option: ImageTreeInfo): void }>()

const renderPrefix = ({ option }: { option: TreeOption }) =>
  h(NIcon, null, {
    default: () => h(option.content ? FolderOutline : ImageOutline)
  })

const handlePreview = (option: ImageTreeInfo) => {
  if (option.content) return
  const el = document.activeElement as HTMLElement | null
  el?.blur()
  emit('preview', option)
}

const renderSuffix = ({ option }: { option: TreeOption }) => {
  const node = option as unknown as ImageTreeInfo
  const btnRemove = h(
    NButton,
    {
      onClick: withModifiers(() => removeNode(node), ['stop']),
      text: true,
      type: 'error'
    },
    {
      default: () =>
        h(NIcon, null, {
          default: () => h(TrashOutline)
        })
    }
  )

  const btnPreview = h(
    NButton,
    {
      class: 'mr-1',
      onClick: withModifiers(() => handlePreview(node), ['stop']),
      text: true
    },
    {
      default: () =>
        h(NIcon, null, {
          default: () => h(EyeOutline)
        })
    }
  )
  if (props.modifyDisabled) {
    if (option.content) return null
    return btnPreview
  }
  if (option.content) return btnRemove
  return [btnPreview, btnRemove]
}

const dropdownOptions = computed<DropdownOption[]>(() => {
  const result: DropdownOption[] = []
  if (!cacheNode.value?.content) {
    result.push({
      label: '预览',
      key: 'preview',
      icon: () => h(NIcon, null, { default: () => h(EyeOutline) })
    })
  } else {
    result.push({
      label: '展开',
      key: 'expand',
      icon: () => h(NIcon, null, { default: () => h(FolderOpenOutline) })
    })
  }
  if (!props.modifyDisabled) {
    result.push({
      label: '删除',
      key: 'delete',
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
    })
  }
  return result
})

const showDropdownRef = ref(false)
const xRef = ref(0)
const yRef = ref(0)
const cacheNode = ref<ImageTreeInfo | null>(null)
const expandedKeys = ref<string[]>([])
const handleExpandedKeysChange = (keys: string[]) => (expandedKeys.value = keys)
const handleClickOutside = () => setTimeout(() => (showDropdownRef.value = false))
const handleSelect = (key: string) => {
  if (!cacheNode.value) return
  switch (key) {
    case 'preview':
      handlePreview(cacheNode.value)
      break
    case 'expand':
      if (!cacheNode.value.content) break
      if (!expandedKeys.value.includes(cacheNode.value.relativePath)) {
        expandedKeys.value.push(cacheNode.value.relativePath)
      }
      break
    case 'delete':
      removeNode(cacheNode.value)
      break
  }
  showDropdownRef.value = false
}

const nodeProps = ({ option }: { option: TreeOption }) => {
  const node = option as unknown as ImageTreeInfo
  return {
    onClick() {
      if (showDropdownRef.value) return
      handlePreview(node)
    },
    onContextmenu(e: MouseEvent): void {
      showDropdownRef.value = true
      xRef.value = e.clientX
      yRef.value = e.clientY
      cacheNode.value = node
      e.preventDefault()
    }
  }
}

const isAllowDrop = ({ dropPosition }: { dropPosition: string }) => {
  if (props.modifyDisabled) return false
  if (dropPosition === 'inside') return false
  return true
}

const removeNode = (node: ImageTreeInfo) => {
  if (!node) return false
  if (!node.parent) {
    const index = props.data.findIndex((n) => n.relativePath === node.relativePath)
    if (index === -1) return false
    // eslint-disable-next-line vue/no-mutating-props
    props.data.splice(index, 1)
    return true
  }
  if (!node.parent.content) return false
  const index = node.parent.content.findIndex((n) => n.relativePath === node.relativePath)
  if (index !== -1) {
    node.parent.content.splice(index, 1)
    return true
  }
  return false
}

const hasDuplicates = (node: ImageTreeInfo, dragNode: ImageTreeInfo): boolean => {
  if (node.parent === dragNode.parent) return false
  if (!node.parent) {
    return props.data.some((n) => n.fileName === dragNode.fileName)
  }
  if (node.parent?.content?.some((n) => n.fileName === dragNode.fileName)) return true
  return false
}

const handleDrop = ({ node, dragNode, dropPosition }: TreeDropInfo) => {
  const [target, dragTarget] = [
    node as unknown as ImageTreeInfo,
    dragNode as unknown as ImageTreeInfo
  ]

  if (!dragTarget || !target) return
  if (dragTarget === target) return
  if (hasDuplicates(target, dragTarget)) return
  if (!removeNode(dragTarget)) return

  if (dropPosition === 'inside') {
    // Drop as child
    if (!target.content) {
      target.content = []
    }
    target.content.push(dragTarget)
  } else {
    // Drop before or after
    const siblings = target.parent ? target.parent.content : props.data
    if (!siblings) return
    const idx = siblings.findIndex((n) => n === target)
    if (dropPosition === 'before') {
      siblings.splice(idx, 0, dragTarget)
    } else {
      siblings.splice(idx + 1, 0, dragTarget)
    }
  }
  dragTarget.parent = target.parent
  dragTarget.relativePath = target.parent
    ? target.parent.relativePath + '\\' + dragTarget.fileName
    : dragTarget.fileName
  if (dragTarget.content) {
    rewriteContentRelativePath(dragTarget.content, dragTarget.relativePath)
  }
}

const rewriteContentRelativePath = (nodes: ImageTreeInfo[], path: string): void => {
  for (const item of nodes) {
    if (item.content) {
      rewriteContentRelativePath(item.content, path + '\\' + item.fileName)
    }
    item.relativePath = path ? path + '\\' + item.fileName : item.fileName
  }
}
</script>
<style scoped>
:deep(.n-tree-node-content__suffix) {
  opacity: 0;
  transition: opacity 0.3s;
}

:deep(.n-tree-node:not(.n-tree-node--disabled):hover .n-tree-node-content__suffix) {
  opacity: 1;
}
</style>

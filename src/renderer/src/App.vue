<template>
  <div class="flex h-full">
    <NMenu
      :value="activeComponentKey"
      :options="menuOptions"
      class="w-32"
      @update:value="(key) => (activeComponentKey = key)"
    ></NMenu>
    <div class="flex-1 w-full m-2 relative">
      <Suspense>
        <KeepAlive>
          <component :is="activeComponent" />
        </KeepAlive>
      </Suspense>
    </div>
  </div>
</template>
<script setup lang="ts">
import { h, ref, computed } from 'vue'
import type { Component } from 'vue'
import { NMenu, NIcon } from 'naive-ui'
import { FileTrayFullOutline, FileTrayOutline, SettingsOutline } from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'
import Zip from '@renderer/views/Zip.vue'
import Unzip from '@renderer/views/Unzip.vue'
import Setting from '@renderer/views/Setting.vue'
const renderIcon = (icon: Component) => () => h(NIcon, null, { default: () => h(icon) })
const menuOptions: MenuOption[] = [
  {
    label: '打包',
    key: 'zip',
    icon: renderIcon(FileTrayFullOutline)
  },
  {
    label: '解压',
    key: 'unzip',
    icon: renderIcon(FileTrayOutline)
  },
  {
    label: '设置',
    key: 'setting',
    icon: renderIcon(SettingsOutline)
  }
]

const activeComponentKey = ref('zip')
const map = new Map<string, Component>([
  ['zip', Zip],
  ['unzip', Unzip],
  ['setting', Setting]
])
const activeComponent = computed(() => map.get(activeComponentKey.value))
</script>

<style lang="less">
@import './assets/css/styles.less';
</style>

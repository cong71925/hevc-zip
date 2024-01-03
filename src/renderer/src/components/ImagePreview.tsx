import { createApp, defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { Resize, Add, Remove, Close, ArrowBack, ArrowForward } from '@vicons/ionicons5'

interface Props {
  src?: string
  index?: number
  srcList?: string[]
  close: () => void
}
// eslint-disable-next-line vue/one-component-per-file
const ImagePreviewVue = defineComponent({
  // eslint-disable-next-line vue/require-prop-types
  props: ['src', 'close', 'index', 'srcList'],
  setup(props: Props) {
    const { srcList, close } = props
    const index = ref(props.index)
    const src = computed(() => srcList?.[index.value || 0] || props.src || '')
    const scale = ref(1)
    const isImageList = computed(() => (srcList?.[index.value || 0] ? true : false))
    const startPoint = {
      x: 0,
      y: 0,
      isDrag: false
    }
    const endPoint = {
      x: 0,
      y: 0
    }
    const moveX = ref(0)
    const moveY = ref(0)
    const mousedown = (e: MouseEvent) => {
      startPoint.x = e.clientX
      startPoint.y = e.clientY
      startPoint.isDrag = true
    }
    const mouseup = () => {
      startPoint.isDrag = false
      endPoint.x = moveX.value
      endPoint.y = moveY.value
    }
    const mousemove = (e: MouseEvent) => {
      const { x, y, isDrag } = startPoint
      if (!isDrag) {
        return
      }
      moveX.value = (e.clientX - x) / scale.value + endPoint.x
      moveY.value = (e.clientY - y) / scale.value + endPoint.y
    }
    const setScale = (plus: number) => {
      scale.value = scale.value + plus < 0 ? 0 : scale.value + plus
    }
    const wheelListener = (e: WheelEvent) => {
      setScale(-e.deltaY / 1000)
    }
    const keydown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
          setScale(0.25)
          return
        case 'ArrowDown':
          setScale(-0.25)
          return
        case 'ArrowLeft':
          setPre()
          return
        case 'ArrowRight':
          setNext()
          return
        case 'Escape':
          close()
          return
      }
    }

    onMounted(() => {
      document.addEventListener('wheel', wheelListener)
      document.addEventListener('keydown', keydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('wheel', wheelListener)
      document.removeEventListener('keydown', keydown)
    })

    const resize = () => {
      scale.value = 1
      moveX.value = 0
      moveY.value = 0
      endPoint.x = 0
      endPoint.y = 0
    }

    const hasNext = computed(() =>
      srcList && srcList.length > Number(index.value) + 1 ? true : false
    )

    const setNext = () => {
      if (!hasNext.value) {
        return
      }
      index.value = (index.value || 0) + 1
      resize()
    }

    const hasPre = computed(() => srcList && Number(index.value) > 0)

    const setPre = () => {
      if (!hasPre.value || !index.value) {
        return
      }
      index.value = index.value - 1
      resize()
    }

    return () => (
      <>
        <div class="fixed flex inset-0 z-30 select-none">
          <img
            src={src.value}
            draggable="false"
            class="m-auto max-h-screen max-w-screen cursor-grab"
            style={`transform: scale(${scale.value}) translateX(${moveX.value}px) translateY(${moveY.value}px)`}
            onMousedown={mousedown}
            onMouseup={mouseup}
            onMouseout={mouseup}
            onMousemove={mousemove}
          />
        </div>
        <div class="absolute inset-0 z-10 bg-black/30"></div>
        <div class="absolute left-1/2 -translate-x-1/2 bg-white/50 rounded-full bottom-12 z-50 p-1 flex">
          {isImageList.value ? (
            <NTooltip
              trigger="hover"
              v-slots={{
                trigger: () => (
                  <NButton text disabled={!hasPre.value} onClick={setPre}>
                    <NIcon size="30" component={ArrowBack} />
                  </NButton>
                ),
                default: () => '上一张 (←)'
              }}
            />
          ) : (
            ''
          )}
          {isImageList.value ? (
            <NTooltip
              trigger="hover"
              v-slots={{
                trigger: () => (
                  <NButton text disabled={!hasNext.value} onClick={setNext}>
                    <NIcon size="30" component={ArrowForward} />
                  </NButton>
                ),
                default: () => '下一张 (→)'
              }}
            />
          ) : (
            ''
          )}
          <NTooltip
            trigger="hover"
            v-slots={{
              trigger: () => (
                <NButton text onClick={resize}>
                  <NIcon size="30" component={Resize} />
                </NButton>
              ),
              default: () => '原始尺寸'
            }}
          />
          <NTooltip
            trigger="hover"
            v-slots={{
              trigger: () => (
                <NButton text onClick={() => setScale(-0.25)}>
                  <NIcon size="30" component={Remove} />
                </NButton>
              ),
              default: () => '缩小 (↓)'
            }}
          />
          <NTooltip
            trigger="hover"
            v-slots={{
              trigger: () => (
                <NButton text onClick={() => setScale(0.25)}>
                  <NIcon size="30" component={Add} />
                </NButton>
              ),
              default: () => '放大 (↑)'
            }}
          />
          <NTooltip
            trigger="hover"
            v-slots={{
              trigger: () => (
                <NButton text onClick={close}>
                  <NIcon size="30" component={Close} />
                </NButton>
              ),
              default: () => '关闭 (Esc)'
            }}
          />
        </div>
      </>
    )
  }
})

export const openImagePreview = (src: string) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  // eslint-disable-next-line vue/one-component-per-file
  const instance = createApp(ImagePreviewVue, {
    src,
    close: () => {
      instance.unmount()
      document.body.removeChild(el)
    }
  })
  instance.mount(el)
}

export const openImageListPreview = (index: number, srcList: string[]) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  // eslint-disable-next-line vue/one-component-per-file
  const instance = createApp(ImagePreviewVue, {
    index,
    srcList,
    close: () => {
      instance.unmount()
      document.body.removeChild(el)
    }
  })
  instance.mount(el)
}

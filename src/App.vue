<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onErrorCaptured } from "vue"
import MenuBar from "./components/MenuBar.vue"
import InstructionLibrary from "./components/InstructionLibrary.vue"
import EditCanvas from "./components/EditCanvas.vue"
import CodePreview from "./components/CodePreview.vue"
import LogConsole from "./components/LogConsole.vue"
import { useScriptStore } from "./stores/scriptStore"

const store = useScriptStore()
const appReady = ref(false)
const fatalError = ref("")
const sidebarWidth = ref(220)
const previewWidth = ref(360)
const consoleHeight = ref(200)
let dragging: null | "side" | "preview" | "console" = null

function onMouseDown(panel: "side" | "preview" | "console") {
  dragging = panel
  document.body.style.cursor = panel === "console" ? "row-resize" : "col-resize"
  document.body.style.userSelect = "none"
}

function onMouseMove(e: MouseEvent) {
  if (dragging === "side") sidebarWidth.value = Math.max(160, Math.min(400, e.clientX))
  else if (dragging === "preview") previewWidth.value = Math.max(200, Math.min(600, window.innerWidth - e.clientX))
  else if (dragging === "console") consoleHeight.value = Math.max(60, Math.min(500, window.innerHeight - e.clientY))
}

function onMouseUp() {
  if (dragging) {
    dragging = null
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }
}

onMounted(() => {
  document.addEventListener("mousemove", onMouseMove)
  document.addEventListener("mouseup", onMouseUp)
  try {
    store.addLog("BAT 可视化编辑器已启动", "info")
    store.addLog("从左侧指令库拖拽指令到画布开始编辑", "info")
  } catch (e) { console.error(e) }
  appReady.value = true
})

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", onMouseMove)
  document.removeEventListener("mouseup", onMouseUp)
})

onErrorCaptured((err: any) => {
  fatalError.value = "应用错误: " + (err?.message || err)
  console.error(err)
  return false
})
</script>

<template>
  <div v-if="fatalError" style="padding:40px;text-align:center;color:#f56c6c;">
    <h2>应用加载失败</h2>
    <p style="margin-top:12px;font-size:14px;">{{ fatalError }}</p>
  </div>
  <div v-else-if="!appReady" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#909399;font-size:14px;">
    加载中...
  </div>
  <div v-else style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;">
    <MenuBar />
    <div style="display:flex;flex:1;min-height:0;overflow:hidden;">
      <div :style="{ width: sidebarWidth + 'px', minWidth: '160px', flexShrink: 0, overflow: 'hidden' }">
        <InstructionLibrary />
      </div>
      <div class="resize-handle resize-handle-col" @mousedown.prevent="onMouseDown('side')"></div>
      <div style="flex:1;min-width:0;overflow:hidden;">
        <EditCanvas />
      </div>
      <div class="resize-handle resize-handle-col" @mousedown.prevent="onMouseDown('preview')"></div>
      <div :style="{ width: previewWidth + 'px', minWidth: '200px', flexShrink: 0, overflow: 'hidden' }">
        <CodePreview />
      </div>
    </div>
    <div class="resize-handle resize-handle-row" @mousedown.prevent="onMouseDown('console')"></div>
    <div :style="{ height: consoleHeight + 'px', minHeight: '40px', flexShrink: 0, overflow: 'hidden' }">
      <LogConsole />
    </div>
  </div>
</template>
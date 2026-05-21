<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue"
import { useScriptStore } from "../stores/scriptStore"

const store = useScriptStore()
const consoleBody = ref<HTMLDivElement>()

onMounted(async () => {
  try {
    const { listen } = await import("@tauri-apps/api/event")
    listen<string>("cmd-output", (event) => {
      store.addLog(event.payload, "info")
    })
    listen<boolean>("cmd-complete", (event) => {
      store.isRunning = false
      if (event.payload) {
        store.addLog("=== 脚本执行完成 ===", "success")
      } else {
        store.addLog("=== 脚本执行失败 ===", "error")
      }
    })
  } catch {
    // 在纯浏览器模式下（非 Tauri），不注册 IPC 监听
    console.log("Tauri IPC 不可用，日志监听未注册")
  }
})

watch(() => store.logs.length, async () => {
  await nextTick()
  if (consoleBody.value) {
    consoleBody.value.scrollTop = consoleBody.value.scrollHeight
  }
})
</script>

<template>
  <div class="console-panel">
    <div class="console-header">
      <span>
        <el-icon style="vertical-align:-2px"><Monitor /></el-icon>
        运行日志
      </span>
      <div style="display:flex;gap:6px;align-items:center;">
        <span v-if="store.isRunning" style="font-size:11px;color:#67c23a;">
          <el-icon style="vertical-align:-2px;"><Loading /></el-icon> 运行中...
        </span>
        <el-button size="small" text style="color:#ccc;" @click="store.clearLogs()">
          <el-icon><Delete /></el-icon> 清空
        </el-button>
      </div>
    </div>
    <div class="console-body" ref="consoleBody">
      <div v-if="store.logs.length === 0" style="color:#666;text-align:center;padding:20px;">
        暂无日志，点击"运行"按钮执行脚本
      </div>
      <div
        v-for="(log, index) in store.logs"
        :key="index"
        :class="['log-line', 'log-' + log.type]"
      >
        <span style="color:#888;">[{{ log.timestamp }}]</span> {{ log.message }}
      </div>
    </div>
  </div>
</template>
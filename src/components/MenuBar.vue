<script setup lang="ts">
import { ref } from "vue"
import { useScriptStore } from "../stores/scriptStore"
import { ElMessage, ElMessageBox } from "element-plus"

const store = useScriptStore()

const tauriCore = ref<any>(null)
const tauriDialog = ref<any>(null)

async function ensureTauri() {
  if (!tauriCore.value) {
    try {
      tauriCore.value = await import("@tauri-apps/api/core")
      tauriDialog.value = await import("@tauri-apps/plugin-dialog")
    } catch {
      ElMessage.error("Tauri 运行时不可用，请在 Tauri 窗口中运行")
      return null
    }
  }
  return tauriCore.value
}

async function handleNew() {
  if (store.placedCommands.length > 0) {
    try {
      await ElMessageBox.confirm("当前脚本未保存，是否继续新建？", "提示", {
        confirmButtonText: "继续新建",
        cancelButtonText: "取消",
        type: "warning",
      })
    } catch { return }
  }
  store.clearCanvas()
  store.clearLogs()
  store.setScriptFile("", "未命名脚本.bat")
  store.addLog("已创建新脚本", "info")
}

async function handleOpen() {
  const core = await ensureTauri()
  if (!core) return
  try {
    const dialog = tauriDialog.value
    const result = await dialog.open({
      multiple: false,
      filters: [{ name: "BAT 脚本", extensions: ["bat", "cmd"] }],
    })
    if (result) {
      const path = typeof result === "string" ? result : result.path
      const name = path.split("\\").pop() || path.split("/").pop() || "脚本.bat"
      const content = await core.invoke("read_script", { path })
      store.setScriptFile(path, name)
      store.clearCanvas()
      store.clearLogs()
      store.isManualMode = true
      store.setManualCode(content)
      store.addLog("已打开脚本: " + name, "success")
    }
  } catch (e: any) {
    ElMessage.error("打开文件失败: " + (e?.message || e))
    store.addLog("打开文件失败", "error")
  }
}

async function handleSave() {
  const core = await ensureTauri()
  if (!core) return
  if (!store.currentFilePath) return handleSaveAs()
  try {
    await core.invoke("write_script", { path: store.currentFilePath, content: store.generatedCode })
    store.addLog("已保存: " + store.currentFileName, "success")
    ElMessage.success("保存成功")
  } catch (e: any) {
    ElMessage.error("保存失败: " + (e?.message || e))
  }
}

async function handleSaveAs() {
  const core = await ensureTauri()
  if (!core) return
  try {
    const dialog = tauriDialog.value
    const path = await dialog.save({
      filters: [{ name: "BAT 脚本", extensions: ["bat"] }],
      defaultPath: store.currentFileName,
    })
    if (path) {
      await core.invoke("write_script", { path, content: store.generatedCode })
      const name = path.split("\\").pop() || path.split("/").pop() || "脚本.bat"
      store.setScriptFile(path, name)
      store.addLog("已另存为: " + name, "success")
      ElMessage.success("保存成功")
    }
  } catch (e: any) {
    ElMessage.error("保存失败: " + (e?.message || e))
  }
}

// === 运行：写入临时文件后执行，支持多行 BAT 脚本 ===
async function handleRun() {
  const core = await ensureTauri()
  if (!core) return

  const code = store.isManualMode ? (store.manualCode || store.generatedCode) : store.generatedCode
  if (!code.trim()) {
    ElMessage.warning("脚本内容为空")
    return
  }

  store.isRunning = true
  store.clearLogs()
  store.addLog("=== 开始执行脚本（临时文件模式） ===", "info")

  try {
    // execute_bat 会自动写临时文件、执行、传回输出、清理
    await core.invoke("execute_bat", { content: code })
    store.addLog("脚本已提交到 CMD 执行，正在等待输出...", "info")
  } catch (e: any) {
    store.addLog("执行失败: " + (e?.message || e), "error")
    store.isRunning = false
  }
}

// === 保存并运行 ===
async function handleSaveAndRun() {
  const core = await ensureTauri()
  if (!core) return

  const code = store.isManualMode ? (store.manualCode || store.generatedCode) : store.generatedCode
  if (!code.trim()) {
    ElMessage.warning("脚本内容为空")
    return
  }

  if (!store.currentFilePath) {
    await handleSaveAs()
    if (!store.currentFilePath) return
  }

  store.isRunning = true
  store.clearLogs()
  store.addLog("=== 开始执行脚本（文件模式） ===", "info")

  try {
    await core.invoke("write_script", { path: store.currentFilePath, content: code })
    // 使用临时文件方式执行（同样可以支持文件模式）
    await core.invoke("execute_bat", { content: code })
  } catch (e: any) {
    store.addLog("执行失败: " + (e?.message || e), "error")
    store.isRunning = false
  }
}

async function handleDelete() {
  const core = await ensureTauri()
  if (!core) return
  if (!store.currentFilePath) {
    ElMessage.warning("请先保存脚本后再删除")
    return
  }
  try {
    await ElMessageBox.confirm("确定删除 \"" + store.currentFileName + "\" 吗？", "确认删除", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    })
    await core.invoke("delete_script", { path: store.currentFilePath })
    store.clearCanvas()
    store.setScriptFile("", "未命名脚本.bat")
    store.addLog("已删除: " + store.currentFileName, "warning")
    ElMessage.success("删除成功")
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error("删除失败: " + (e?.message || e))
  }
}

function handleToggleMode() {
  store.toggleMode()
  store.addLog(store.isManualMode ? "已切换到手动编辑模式" : "已切换到图形编辑模式", "info")
}
</script>

<template>
  <div class="menu-bar">
    <div class="app-title">
      <el-icon style="margin-right:4px;vertical-align:-2px"><Tools /></el-icon>
      BAT 可视化编辑器
    </div>
    <el-button size="small" @click="handleNew"><el-icon><DocumentAdd /></el-icon> 新建</el-button>
    <el-button size="small" @click="handleOpen"><el-icon><FolderOpened /></el-icon> 打开</el-button>
    <el-button size="small" @click="handleSave"><el-icon><Upload /></el-icon> 保存</el-button>
    <el-button size="small" @click="handleSaveAs"><el-icon><CopyDocument /></el-icon> 另存为</el-button>
    <div class="right-actions">
      <el-button size="small" :type="store.isManualMode ? 'warning' : 'default'" @click="handleToggleMode">
        <el-icon><EditPen /></el-icon> {{ store.isManualMode ? "图形模式" : "手动编辑" }}
      </el-button>
      <el-button size="small" type="danger" @click="handleDelete"><el-icon><Delete /></el-icon> 删除</el-button>
      <el-button size="small" type="success" @click="handleRun" :loading="store.isRunning" :disabled="store.isRunning">
        <el-icon><VideoPlay /></el-icon> 运行
      </el-button>
      <el-button size="small" @click="handleSaveAndRun" :loading="store.isRunning" :disabled="store.isRunning">
        <el-icon><Upload /></el-icon> 保存并运行
      </el-button>
    </div>
  </div>
</template>
import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { PlacedCommand, LogEntry, CommandModule } from "../types"
import { commandModules } from "../data/templates"

function loadCustomCommands(): CommandModule[] {
  try {
    const saved = localStorage.getItem("bat-builder-custom-commands")
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

export const useScriptStore = defineStore("script", () => {
  const currentFilePath = ref<string>("")
  const currentFileName = ref<string>("未命名脚本.bat")
  const placedCommands = ref<PlacedCommand[]>([])
  const manualCode = ref<string>("")
  const isManualMode = ref(false)
  const logs = ref<LogEntry[]>([])
  const isRunning = ref(false)

  // 自定义命令
  const customCommands = ref<CommandModule[]>(loadCustomCommands())

  function saveCustomCommands() {
    try {
      localStorage.setItem("bat-builder-custom-commands", JSON.stringify(customCommands.value))
    } catch { /* storage not available */ }
  }

  const allCommands = computed(() => [...commandModules, ...customCommands.value])

  function addCustomCommand(cmd: CommandModule) {
    customCommands.value.push(cmd)
    saveCustomCommands()
  }

  function updateCustomCommand(id: string, cmd: Partial<CommandModule>) {
    const idx = customCommands.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      customCommands.value[idx] = { ...customCommands.value[idx], ...cmd } as CommandModule
      saveCustomCommands()
    }
  }

  function removeCustomCommand(id: string) {
    customCommands.value = customCommands.value.filter((c) => c.id !== id)
    saveCustomCommands()
  }

  const generatedCode = computed(() => {
    if (isManualMode.value && manualCode.value) return manualCode.value
    const parts: string[] = ["@echo off", "chcp 65001 >nul", ""]
    for (const cmd of placedCommands.value) {
      if (cmd.generatedCode) {
        parts.push(cmd.generatedCode)
        parts.push("")
      }
    }
    parts.push("pause")
    return parts.join("\r\n")
  })

  function addCommand(moduleId: string) {
    const mod = allCommands.value.find((m) => m.id === moduleId)
    if (!mod) return
    const defaultParams: Record<string, string> = {}
    mod.params.forEach((p) => { defaultParams[p.key] = p.default || "" })
    const cmd: PlacedCommand = {
      uid: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      moduleId,
      params: defaultParams,
      generatedCode: mod.template,
    }
    placedCommands.value.push(cmd)
    updateCode(cmd.uid)
  }

  function updateCode(uid: string) {
    const idx = placedCommands.value.findIndex((c) => c.uid === uid)
    if (idx === -1) return
    const cmd = placedCommands.value[idx]
    const mod = allCommands.value.find((m) => m.id === cmd.moduleId)
    if (!mod) return
    let code = mod.template
    for (const [key, value] of Object.entries(cmd.params)) {
      code = code.replace(new RegExp("{{" + key + "}}", "g"), value)
    }
    placedCommands.value[idx].generatedCode = code
  }

  function updateParams(uid: string, key: string, value: string) {
    const cmd = placedCommands.value.find((c) => c.uid === uid)
    if (!cmd) return
    cmd.params[key] = value
    updateCode(uid)
  }

  function removeCommand(uid: string) {
    placedCommands.value = placedCommands.value.filter((c) => c.uid !== uid)
  }

  function moveCommand(fromIndex: number, toIndex: number) {
    const item = placedCommands.value.splice(fromIndex, 1)[0]
    placedCommands.value.splice(toIndex, 0, item)
  }

  function clearCanvas() { placedCommands.value = [] }
  function setManualCode(code: string) { manualCode.value = code }
  function toggleMode() {
    isManualMode.value = !isManualMode.value
    if (!isManualMode.value) manualCode.value = ""
  }

  function addLog(message: string, type: LogEntry["type"] = "info") {
    const now = new Date()
    const timestamp = now.toLocaleTimeString("zh-CN", { hour12: false })
    logs.value.push({ timestamp, message, type })
  }

  function clearLogs() { logs.value = [] }

  function setScriptFile(path: string, name: string) {
    currentFilePath.value = path
    currentFileName.value = name
  }

  return {
    currentFilePath, currentFileName, placedCommands,
    manualCode, isManualMode, logs, isRunning, generatedCode,
    customCommands, allCommands,
    addCustomCommand, updateCustomCommand, removeCustomCommand,
    addCommand, updateParams, removeCommand, moveCommand,
    clearCanvas, setManualCode, toggleMode,
    addLog, clearLogs, setScriptFile,
  }
})
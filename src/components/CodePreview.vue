<script setup lang="ts">
import { ref, watch, onMounted, nextTick, onBeforeUnmount } from "vue"
import { useScriptStore } from "../stores/scriptStore"
import { ElMessage } from "element-plus"

const store = useScriptStore()
const editorContainer = ref<HTMLDivElement>()
const displayCode = ref("")
const useFallback = ref(false)
let editor: any = null

onMounted(async () => {
  try {
    const monaco = await import("monaco-editor")

    // Worker 配置
    const baseUrl = "/node_modules/monaco-editor/esm/"
    ;(self as any).MonacoEnvironment = {
      getWorker(_: any, label: string) {
        switch (label) {
          case "json": return new Worker(baseUrl + "vs/language/json/json.worker.js", { type: "module" })
          case "css": return new Worker(baseUrl + "vs/language/css/css.worker.js", { type: "module" })
          case "html": return new Worker(baseUrl + "vs/language/html/html.worker.js", { type: "module" })
          case "typescript":
          case "javascript": return new Worker(baseUrl + "vs/language/typescript/ts.worker.js", { type: "module" })
          default: return new Worker(baseUrl + "vs/editor/editor.worker.js", { type: "module" })
        }
      },
    }

    // 注册 BAT 语言
    monaco.languages.register({ id: "bat" })
    monaco.languages.setMonarchTokensProvider("bat", {
      defaultToken: "",
      tokenizer: {
        root: [
          [/::.*$/, "comment"],
          [/rem\b.*$/i, "comment"],
          [/".*?"/, "string"],
          [/'.*?'/, "string"],
          [/\b(echo|if|else|for|do|in|set|call|goto|exit|pause|shift|title|color|mode|chcp)\b/i, "keyword"],
          [/\b(not|exist|defined|errorlevel|cmdextversion)\b/i, "keyword"],
          [/\b(setlocal|endlocal|enabledelayedexpansion)\b/i, "keyword"],
          [/%.*?%/, "variable"],
          [/%%[a-zA-Z]/, "variable"],
          [/\b[0-9]+\b/, "number"],
        ],
      },
    })

    monaco.editor.defineTheme("bat-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
        { token: "comment", foreground: "6a9955", fontStyle: "italic" },
        { token: "string", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "variable", foreground: "9cdcfe" },
      ],
      colors: { "editor.background": "#1e1e1e", "editor.foreground": "#d4d4d4" },
    })

    await nextTick()
    await nextTick()

    if (editorContainer.value) {
      editor = monaco.editor.create(editorContainer.value, {
        value: store.generatedCode,
        language: "bat",
        theme: "bat-theme",
        fontSize: 13,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: !store.isManualMode,
        lineNumbers: "on",
        tabSize: 2,
        wordWrap: "on",
      })
      editor.onDidChangeModelContent(() => {
        if (store.isManualMode) store.setManualCode(editor.getValue() || "")
      })
    }
  } catch (e: any) {
    useFallback.value = true
    displayCode.value = store.generatedCode
    store.addLog("代码编辑器使用回退模式", "warning")
  }
})

onBeforeUnmount(() => {
  if (editor) { editor.dispose(); editor = null }
})

watch(() => store.generatedCode, () => {
  if (editor && !store.isManualMode) {
    const pos = editor.getPosition()
    editor.setValue(store.generatedCode)
    if (pos) editor.setPosition(pos)
  }
  if (useFallback.value) {
    displayCode.value = store.generatedCode
  }
})

watch(() => store.isManualMode, (n) => {
  if (editor) {
    editor.updateOptions({ readOnly: !n })
    editor.setValue(n ? (store.manualCode || store.generatedCode) : store.generatedCode)
  }
})

function checkSyntax() {
  const errors: string[] = []
  store.generatedCode.split("\n").forEach((line, i) => {
    const t = line.trim()
    if (!t || t.startsWith("::") || t.startsWith("rem ")) return
    if ((t.match(/\(/g) || []).length !== (t.match(/\)/g) || []).length)
      errors.push("第 " + (i + 1) + " 行: 括号不匹配")
    if ((t.match(/"/g) || []).length % 2 !== 0)
      errors.push("第 " + (i + 1) + " 行: 引号未闭合")
  })
  if (errors.length === 0) {
    store.addLog("语法检查通过", "success")
    ElMessage.success("语法检查通过")
  } else {
    errors.forEach((err) => store.addLog("  " + err, "warning"))
    ElMessage.warning("发现 " + errors.length + " 个语法问题")
  }
}

function formatCode() {
  const formatted = store.generatedCode.split("\n").map((l) => l.trim()).filter((l) => l).join("\r\n")
  if (store.isManualMode) store.setManualCode(formatted)
  if (editor) editor.setValue(formatted)
  store.addLog("代码已格式化", "success")
}
</script>

<template>
  <div class="preview-panel">
    <div class="preview-header">
      <span>
        <el-icon style="vertical-align:-2px"><Code /></el-icon>
        BAT 源码预览
        <el-tag v-if="store.isManualMode" size="small" type="warning" style="margin-left:6px;">手动编辑</el-tag>
        <el-tag v-else size="small" type="info" style="margin-left:6px;">自动生成</el-tag>
      </span>
      <div style="display:flex;gap:4px;">
        <el-button size="small" text style="color:#ccc;" @click="checkSyntax"><el-icon><Select /></el-icon> 检查</el-button>
        <el-button size="small" text style="color:#ccc;" @click="formatCode"><el-icon><Sort /></el-icon> 格式化</el-button>
        <el-button size="small" text style="color:#ccc;" @click="() => { navigator.clipboard?.writeText(store.generatedCode); store.addLog('已复制', 'success') }">
          <el-icon><CopyDocument /></el-icon> 复制
        </el-button>
      </div>
    </div>
    <div class="preview-body" ref="editorContainer">
      <textarea
        v-if="useFallback"
        :value="displayCode"
        readonly
        style="width:100%;height:100%;background:#1e1e1e;color:#d4d4d4;border:none;padding:10px;font-family:Consolas,monospace;font-size:13px;resize:none;outline:none;"
      ></textarea>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue"
import { useScriptStore } from "../stores/scriptStore"
import { commandModules } from "../data/templates"
import { ElMessageBox } from "element-plus"
import type { ParamDef } from "../types"

const store = useScriptStore()
const dialogVisible = ref(false)
const editingUid = ref("")
const editingParams = ref<Record<string, string>>({})
const editingModule = ref<{ name: string; params: ParamDef[] } | null>(null)

function onDrop(e: DragEvent) {
  const moduleId = e.dataTransfer?.getData("text/plain")
  if (moduleId) {
    store.addCommand(moduleId)
    const mod = commandModules.find((m) => m.id === moduleId)
    store.addLog("已添加指令: " + (mod?.name || moduleId), "success")
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function openParamDialog(uid: string) {
  const cmd = store.placedCommands.find((c) => c.uid === uid)
  if (!cmd) return
  const mod = commandModules.find((m) => m.id === cmd.moduleId)
  if (!mod) return

  editingUid.value = uid
  editingParams.value = { ...cmd.params }
  editingModule.value = { name: mod.name, params: mod.params }
  dialogVisible.value = true
}

function saveParams() {
  if (!editingUid.value) return
  for (const [key, value] of Object.entries(editingParams.value)) {
    store.updateParams(editingUid.value, key, value)
  }
  dialogVisible.value = false
  store.addLog("参数已更新", "info")
}

async function confirmRemove(uid: string, name: string) {
  try {
    await ElMessageBox.confirm("删除指令 \"" + name + "\"?", "确认", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    })
    store.removeCommand(uid)
    store.addLog("已移除指令: " + name, "warning")
  } catch {
    /* cancelled */
  }
}

function getModuleInfo(moduleId: string) {
  return commandModules.find((m) => m.id === moduleId)
}

let dragIndex = -1
function onDragStart(index: number) {
  dragIndex = index
}

function onDragOverItem(e: DragEvent, index: number) {
  e.preventDefault()
  if (dragIndex !== -1 && dragIndex !== index) {
    store.moveCommand(dragIndex, index)
    dragIndex = index
  }
}

function onDragEnd() {
  dragIndex = -1
}
</script>

<template>
  <div class="canvas-area">
    <div class="canvas-toolbar">
      <el-icon><Document /></el-icon>
      <span class="script-name">{{ store.currentFileName }}</span>
      <span style="font-size:12px;color:#909399;margin-left:8px;">
        ({{ store.placedCommands.length }} 条指令)
      </span>
      <el-button
        v-if="store.placedCommands.length > 0"
        size="small"
        text
        type="danger"
        style="margin-left:auto;"
        @click="store.clearCanvas(); store.addLog('已清空画布', 'warning')"
      >
        <el-icon><Delete /></el-icon> 清空
      </el-button>
    </div>

    <div
      class="canvas-content"
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <div v-if="store.placedCommands.length === 0" class="canvas-empty">
        <el-icon><Plus /></el-icon>
        <p>从左侧指令库拖拽或双击指令添加</p>
        <p style="font-size:12px;color:#dcdfe6;">支持拖拽排序、双击编辑参数</p>
      </div>

      <div v-for="(cmd, index) in store.placedCommands" :key="cmd.uid">
        <div
          class="command-card"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover="onDragOverItem($event, index)"
          @dragend="onDragEnd"
        >
          <div class="command-card-header">
            <el-icon class="drag-handle"><Rank /></el-icon>
            <el-icon style="color:#409eff">
              <component :is="getModuleInfo(cmd.moduleId)?.icon || 'Tools'" />
            </el-icon>
            <span class="cmd-label">
              #{{ index + 1 }} {{ getModuleInfo(cmd.moduleId)?.name || cmd.moduleId }}
            </span>
            <el-button size="small" text type="primary" @click="openParamDialog(cmd.uid)">
              <el-icon><Setting /></el-icon> 参数
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="confirmRemove(cmd.uid, getModuleInfo(cmd.moduleId)?.name || '')"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div class="command-card-body">
            <el-input
              type="textarea"
              :model-value="cmd.generatedCode"
              rows="2"
              readonly
              style="font-family:Consolas,monospace;font-size:12px;"
            />
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="'参数配置 - ' + (editingModule?.name || '')"
      width="450px"
      :close-on-click-modal="false"
    >
      <div class="param-dialog">
        <div v-for="param in editingModule?.params" :key="param.key" class="param-form-item">
          <label style="font-size:13px;color:#606266;display:block;margin-bottom:4px;">
            {{ param.label }}
            <span v-if="param.required" style="color:#f56c6c;">*</span>
          </label>

          <el-input
            v-if="param.type === 'text' || param.type === 'number'"
            v-model="editingParams[param.key]"
            :type="param.type === 'number' ? 'number' : 'text'"
            :placeholder="param.placeholder"
            size="small"
          />

          <el-select
            v-else-if="param.type === 'select'"
            v-model="editingParams[param.key]"
            size="small"
            style="width:100%"
          >
            <el-option
              v-for="opt in param.options ?? []"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <el-input
            v-else
            v-model="editingParams[param.key]"
            :placeholder="param.placeholder || '输入路径'"
            size="small"
          >
            <template #append>
              <el-button size="small">
                <el-icon><FolderOpened /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveParams">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
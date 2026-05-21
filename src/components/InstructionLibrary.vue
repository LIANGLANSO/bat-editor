<script setup lang="ts">
import { ref, computed } from "vue"
import { categories, commandModules } from "../data/templates"
import { useScriptStore } from "../stores/scriptStore"
import { ElMessage, ElMessageBox } from "element-plus"
import type { CommandModule, ParamDef } from "../types"

const store = useScriptStore()
const searchQuery = ref("")
const activeCategory = ref("all")

// 自定义命令分类
const customCat = { id: "custom", name: "自定义", icon: "Plus" }
const allCategories = computed(() => [...categories, customCat])

// 合并的自定义命令
const customCommands = computed(() => store.customCommands)

const filteredModules = computed(() => {
  const source = activeCategory.value === "custom"
    ? customCommands.value
    : store.allCommands

  let list = source
  if (activeCategory.value !== "all" && activeCategory.value !== "custom") {
    list = list.filter((m) => m.category === activeCategory.value)
  } else if (activeCategory.value === "custom") {
    list = customCommands.value
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    )
  }
  return list
})

function addToCanvas(moduleId: string) {
  store.addCommand(moduleId)
  const mod = [...commandModules, ...customCommands.value].find((m) => m.id === moduleId)
  store.addLog("已添加指令: " + (mod?.name || moduleId), "success")
}

// === 自定义命令编辑 ===
const showCustomDialog = ref(false)
const editingCustom = ref<{ id: string; name: string; template: string; description: string; params: ParamDef[] }>({
  id: "", name: "", template: "", description: "", params: [],
})
const isEditing = ref(false)

function openNewCustom() {
  isEditing.value = false
  editingCustom.value = {
    id: "custom_" + Date.now(),
    name: "",
    template: "",
    description: "",
    params: [],
  }
  showCustomDialog.value = true
}

function openEditCustom(cmd: CommandModule) {
  isEditing.value = true
  editingCustom.value = {
    id: cmd.id,
    name: cmd.name,
    template: cmd.template,
    description: cmd.description,
    params: JSON.parse(JSON.stringify(cmd.params)),
  }
  showCustomDialog.value = true
}

function addParam() {
  editingCustom.value.params.push({
    key: "param" + (editingCustom.value.params.length + 1),
    label: "参数" + (editingCustom.value.params.length + 1),
    type: "text",
    default: "",
  })
}

function removeParam(index: number) {
  editingCustom.value.params.splice(index, 1)
}

function saveCustomCommand() {
  const cmd = editingCustom.value
  if (!cmd.name.trim() || !cmd.template.trim()) {
    ElMessage.warning("名称和模板不能为空")
    return
  }
  const module: CommandModule = {
    id: cmd.id,
    name: cmd.name,
    icon: "Plus",
    category: "custom",
    description: cmd.description || cmd.name,
    template: cmd.template,
    params: cmd.params || [],
  }

  if (isEditing.value) {
    store.updateCustomCommand(cmd.id, module)
    store.addLog("已更新自定义指令: " + cmd.name, "success")
  } else {
    store.addCustomCommand(module)
    store.addLog("已添加自定义指令: " + cmd.name, "success")
    showCustomDialog.value = false
  }
  showCustomDialog.value = false
}

async function deleteCustom(cmdId: string, cmdName: string) {
  try {
    await ElMessageBox.confirm("删除自定义指令 \"" + cmdName + "\"?", "确认", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    })
    store.removeCustomCommand(cmdId)
    store.addLog("已删除自定义指令: " + cmdName, "warning")
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span><el-icon style="vertical-align:-2px"><Menu /></el-icon> 指令库</span>
      <div style="display:flex;gap:4px;">
        <el-input
          v-model="searchQuery"
          size="small"
          placeholder="搜索指令..."
          clearable
          style="width:100px"
          :prefix-icon="'Search'"
        />
        <el-button size="small" type="primary" text @click="openNewCustom">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- 分类标签 -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
        <el-tag
          :type="activeCategory === 'all' ? 'primary' : 'info'"
          size="small"
          style="cursor:pointer"
          @click="activeCategory = 'all'"
        >
          全部
        </el-tag>
        <el-tag
          v-for="cat in allCategories"
          :key="cat.id"
          :type="activeCategory === cat.id ? 'primary' : 'info'"
          size="small"
          style="cursor:pointer"
          @click="activeCategory = cat.id"
        >
          {{ cat.name }}
        </el-tag>
      </div>

      <!-- 指令列表 -->
      <div v-if="filteredModules.length === 0" style="text-align:center;color:#c0c4cc;padding:20px;font-size:13px;">
        未找到匹配指令
        <div v-if="activeCategory === 'custom'" style="margin-top:8px;">
          <el-button size="small" type="primary" @click="openNewCustom">创建自定义指令</el-button>
        </div>
      </div>

      <div
        v-for="mod in filteredModules"
        :key="mod.id"
        class="command-item"
        @dblclick="addToCanvas(mod.id)"
        draggable="true"
        @dragstart="(e: DragEvent) => {
          e.dataTransfer?.setData('text/plain', mod.id)
        }"
      >
        <el-icon class="cmd-icon"
          ><component :is="mod.icon"
        /></el-icon>
        <span class="cmd-name">{{ mod.name }}</span>
        <span style="font-size:11px;color:#c0c4cc;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ mod.description }}</span>
        <el-button size="small" text type="primary" @click="addToCanvas(mod.id)" style="flex-shrink:0;padding:0 4px;">
          添加
        </el-button>
        <!-- 自定义指令的编辑/删除按钮 -->
        <template v-if="mod.category === 'custom'">
          <el-button size="small" text @click="openEditCustom(mod)" style="padding:0 2px;">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" text type="danger" @click="deleteCustom(mod.id, mod.name)" style="padding:0 2px;">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
      </div>
    </div>

    <!-- 自定义命令编辑弹窗 -->
    <el-dialog
      v-model="showCustomDialog"
      :title="isEditing ? '编辑自定义指令' : '新建自定义指令'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px" label-position="top">
        <el-form-item label="指令名称">
          <el-input v-model="editingCustom.name" placeholder="如: 启动项目" size="small" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editingCustom.description" placeholder="简要说明" size="small" />
        </el-form-item>
        <el-form-item label="BAT 模板">
          <el-input
            v-model="editingCustom.template"
            type="textarea"
            :rows="3"
            placeholder="使用 {{paramName}} 作为参数占位符&#10;如: conda activate {{env_name}}"
            size="small"
          />
          <div style="font-size:11px;color:#909399;margin-top:4px;">
            使用 <code>{`{{参数名}}`}</code> 作为参数占位符
          </div>
        </el-form-item>

        <el-form-item label="参数配置">
          <div v-for="(param, idx) in editingCustom.params" :key="idx" style="display:flex;gap:6px;margin-bottom:6px;width:100%;align-items:center;">
            <el-input v-model="param.key" placeholder="参数名" size="small" style="width:100px;" />
            <el-input v-model="param.label" placeholder="显示标签" size="small" style="width:110px;" />
            <el-select v-model="param.type" size="small" style="width:90px;">
              <el-option label="文本" value="text" />
              <el-option label="数字" value="number" />
              <el-option label="选择" value="select" />
            </el-select>
            <el-input v-model="param.default" placeholder="默认值" size="small" style="width:90px;" />
            <el-button size="small" text type="danger" @click="removeParam(idx)">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <el-button size="small" @click="addParam"><el-icon><Plus /></el-icon> 添加参数</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCustomDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCustomCommand">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
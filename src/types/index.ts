// 指令模块类型
export interface ParamDef {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'file' | 'path' | 'folder'
  default?: string
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
}

export interface CommandModule {
  id: string
  name: string
  icon: string
  category: string
  description: string
  template: string
  params: ParamDef[]
}

export interface Category {
  id: string
  name: string
  icon: string
}

export interface PlacedCommand {
  uid: string
  moduleId: string
  params: Record<string, string>
  generatedCode: string
}

export interface ScriptFile {
  name: string
  path: string
  content: string
}

export interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'error' | 'success' | 'warning'
}

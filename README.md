# BAT 可视化编辑器

🔧 一款基于 Tauri + Vue 3 的桌面端 BAT 脚本可视化编辑器。拖拽指令模块即可生成标准 BAT 代码，无需记忆命令行语法。

## 截图

> （待补充截图）

## 功能特性

### 🎨 可视化编辑
- **拖拽组装**：从左侧指令库拖拽指令到画布，自动拼接生成 BAT 代码
- **参数配置**：弹窗填写参数，支持文本、数字、下拉选择、文件路径
- **拖拽排序**：画布内指令卡片可拖拽调整执行顺序
- **实时预览**：右侧 Monaco Editor 同步显示源码，支持 BAT 语法高亮

### ▶️ 脚本执行
- **一键运行**：直接执行脚本，实时输出 CMD 日志
- **无需保存**：预览模式写入临时文件运行，不污染磁盘
- **保存并运行**：保存到指定路径再执行

### 📦 指令模板库（40+ 内置指令）

| 分类 | 指令示例 |
|------|---------|
| 系统操作 | 关机、重启、休眠、注销、清理临时文件 |
| 文件管理 | 复制、移动、删除、重命名、批量改名 |
| 网络工具 | Ping、IPConfig、DNS 刷新、路由追踪 |
| 进程管理 | 结束进程、进程列表、启动程序 |
| 批量处理 | 批量改名、批量删除、FOR 循环 |
| 磁盘操作 | 磁盘检查、碎片整理、查看空间 |
| 开发者工具 | `conda activate`、`pip install`、`npm run`、`git clone`、`docker ps` |
| 自定义 | 用户可自由创建自己的指令模板 |

### ✏️ 手动编辑
- 支持切换手动编辑模式，直接在源码编辑器中修改
- 语法检查（括号匹配、引号闭合）
- 代码格式化、一键复制

### 🪟 可调整布局
- 左右面板和底部控制台均可拖拽调整大小

## 技术栈

| 模块 | 技术 |
|------|------|
| 桌面外壳 | Tauri 2.0 |
| 界面框架 | Vue 3 + TypeScript |
| UI 组件 | Element Plus |
| 代码编辑器 | Monaco Editor |
| 状态管理 | Pinia |
| 构建工具 | Vite 8 |
| 系统交互 | Rust（CMD 执行、文件读写） |

## 快速开始

### 环境要求

- Node.js 20+
- Rust 1.77+
- Windows（BAT 脚本运行环境）

### 开发运行

```bash
# 克隆项目
git clone https://github.com/LIANGLANSO/bat-editor.git
cd bat-editor

# 安装前端依赖
npm install

# 开发模式（带 Tauri 窗口）
npm run tauri dev

# 仅前端开发（浏览器中预览）
npm run dev
```

### 构建 exe

```bash
npm run tauri build
```

构建产物在 `src-tauri/target/release/bundle/` 目录下。

## 项目结构

```
bat-builder/
├── src/                          # Vue 3 前端
│   ├── components/               # 组件
│   │   ├── MenuBar.vue           # 顶部菜单栏
│   │   ├── InstructionLibrary.vue # 左侧指令库
│   │   ├── EditCanvas.vue        # 中间编辑画布
│   │   ├── CodePreview.vue       # 右侧代码预览
│   │   └── LogConsole.vue        # 底部日志控制台
│   ├── stores/scriptStore.ts     # Pinia 状态管理
│   ├── data/templates.ts         # 指令模板数据
│   ├── types/index.ts            # TypeScript 类型定义
│   ├── App.vue                   # 主布局
│   ├── main.ts                   # 入口文件
│   └── style.css                 # 全局样式
├── src-tauri/                    # Rust 后端
│   ├── src/lib.rs                # Tauri 命令
│   ├── src/main.rs               # 入口
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
└── package.json                  # 前端依赖
```

## 使用说明

1. **创建脚本**：点击「新建」或直接拖拽指令到画布
2. **配置参数**：双击指令卡片或点击「参数」按钮填写参数
3. **调整顺序**：拖拽指令卡片上下移动
4. **预览代码**：右侧实时显示生成的 BAT 源码
5. **运行脚本**：点击「运行」直接执行，日志显示在底部控制台
6. **保存脚本**：点击「保存」或「另存为」持久化到文件
7. **自定义指令**：在指令库左上角点击 ⊕ 创建自己的指令模板

## License

MIT
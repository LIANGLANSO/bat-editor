import { createApp } from "vue"
import { createPinia } from "pinia"
import ElementPlus from "element-plus"
import "element-plus/dist/index.css"
import "element-plus/theme-chalk/display.css"
import * as ElementPlusIconsVue from "@element-plus/icons-vue"
import App from "./App.vue"
import "./style.css"

// 全局错误处理
window.onerror = function (msg, url, line, col, error) {
  console.error("全局错误:", msg, error)
  const el = document.getElementById("app")
  if (el) {
    el.innerHTML = `
      <div style="padding:40px;text-align:center;color:#f56c6c;font-family:sans-serif;">
        <h2>应用出错了</h2>
        <p style="margin-top:12px;font-size:14px;color:#666;">${msg}</p>
        <pre style="margin-top:12px;padding:12px;background:#f5f5f5;border-radius:4px;text-align:left;font-size:12px;max-width:600px;margin:12px auto;overflow:auto;">${error?.stack || ""}</pre>
      </div>`
  }
  return true
}

window.addEventListener("unhandledrejection", (e) => {
  console.error("未处理的 Promise 拒绝:", e.reason)
})

const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(ElementPlus, { size: "small" })
app.mount("#app")
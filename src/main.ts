import { createApp } from "vue"
import { createPinia } from "pinia"
import ElementPlus from "element-plus"
import "element-plus/dist/index.css"
import "element-plus/theme-chalk/display.css"
import * as ElementPlusIconsVue from "@element-plus/icons-vue"
import App from "./App.vue"
import "./style.css"

// 全局错误处理 - 只记录，不覆盖页面
window.onerror = function (msg, url, line, col, error) {
  console.error("全局错误:", msg, typeof msg === "string" ? msg : "资源加载失败")
  return true
}

window.addEventListener("unhandledrejection", (e) => {
  console.error("未处理的 Promise 拒绝:", e.reason)
  e.preventDefault()
})

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(ElementPlus, { size: "small" })
app.mount("#app")
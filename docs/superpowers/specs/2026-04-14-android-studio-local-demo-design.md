# 吃了么 Android Studio 本地联调设计说明

## 目标

在现有 `Vite + React + Capacitor + Fastify` 项目基础上，补齐一套面向课设演示的 Android 本地联调方案，满足以下目标：

- 可以在 `Android Studio` 中直接打开 `android/` 工程并运行 App
- App 在模拟器中能正常访问本机电脑启动的后端接口
- 默认优先支持 `Android Studio` 官方模拟器
- 在需要时可切换为 `雷电模拟器` 一类第三方安卓环境
- 演示前只需要少量固定命令，不要求手动改源码

本设计只覆盖 `Android Studio 运行配置 / Android 联调配置 / 本地地址注入 / 演示文档流程`。  
不重做页面功能，不改后端业务逻辑，不引入新的原生页面。

## 直接采用的默认假设

基于本轮确认，直接采用以下假设：

1. 课设演示主要在本机电脑上完成，不做云端部署
2. 演示以 `Android Studio` 模拟器为主，`雷电模拟器` 作为可选兜底环境
3. 可以接受演示前先手动启动前端构建流程和后端开发服务
4. 目标是“稳定跑起来”，不是优先追求前端热更新体验
5. 后端继续使用当前 `Fastify` 服务，监听 `0.0.0.0:8787`

## 当前项目现状

当前仓库已经具备联调基础：

- 根目录已有 `capacitor.config.ts`
- 已存在完整 `android/` 工程
- `server/src/server.ts` 已将后端监听在 `0.0.0.0`
- 前端 `src/lib/api.ts` 已支持优先读取运行时变量 `globalThis.__CHI_LE_ME_API_BASE_URL__`
- 前端 `src/lib/realtime.ts` 也复用了同一套 API base URL

当前真正缺的不是 Android 容器本身，而是“面向本地演示的稳定配置层”：

- 没有统一的 Android 演示准备命令
- 没有把模拟器访问本机服务的地址策略沉淀成固定流程
- Android 侧没有显式声明本地 `http` 联调的安全配置
- README 中 Android 说明更偏通用包装流程，缺少课设演示指引

## 方案比较

### 方案 A：只保留打包模式

做法：

- 每次 `npm run build`
- 执行 `npx cap sync android`
- Android App 加载 `dist` 静态资源
- 接口地址写死或通过环境变量固定到一个地址

优点：

- 运行最稳
- 对 Android Studio 友好
- 不依赖前端开发服务器

缺点：

- 模拟器类型变化时，地址切换不方便
- 联调准备步骤分散
- 不利于后续继续开发和复用

### 方案 B：只做实时本地开发模式

做法：

- 让 Capacitor Android 直接连本机 Vite dev server
- 后端也连本机开发服务

优点：

- 改前端后反馈快
- 接近纯前端开发体验

缺点：

- 对模拟器网络、明文 `http`、宿主机地址非常敏感
- `雷电模拟器` 兼容性不稳定
- 课设演示时容易因为环境差异翻车

### 方案 C：双模式，默认稳定演示，可选本地联调

做法：

- 默认采用“打包前端资源 + 本机后端接口”的稳定模式
- 同时补一套可切换的地址注入和准备脚本
- Android Studio 官方模拟器默认使用 `10.0.2.2`
- 第三方模拟器需要时切换为电脑局域网 IP

优点：

- 课设演示稳定
- 仍保留后续开发扩展空间
- 地址切换通过命令完成，不必手改源码

缺点：

- 需要补少量脚本和配置文件
- 文档需要更明确地约束使用流程

## 推荐方案

采用 `方案 C：双模式，默认稳定演示，可选本地联调`。

原因：

- 当前核心目标是“在 Android Studio 里稳定跑起来并连上本机后端”
- Android 官方模拟器和雷电模拟器的宿主机访问地址并不完全一致，必须避免把某一个地址写死到业务代码
- 现有前端已经支持运行时 API 地址注入，只要补齐生成脚本和 Android 安全配置，就能低成本达成目标

## 总体设计

### 运行模式

默认运行模式为：

1. 本机后端单独启动
2. 前端先构建出 `dist`
3. `Capacitor` 将静态资源同步到 `android/app/src/main/assets/public`
4. Android App 从本地静态资源启动
5. App 再通过运行时配置访问本机后端接口

这种方式不依赖 App 内再加载外部前端开发站点，因此比 Live Reload 稳定得多。

### 地址策略

地址不写死在源码业务逻辑中，而是通过运行时配置注入。

默认规则：

- Android Studio 官方模拟器使用 `http://10.0.2.2:8787`
- 雷电或其他第三方模拟器如果 `10.0.2.2` 不通，则切到 `http://<电脑局域网IP>:8787`

前端代码继续通过已有的 `globalThis.__CHI_LE_ME_API_BASE_URL__` 读取地址，不需要重写 `fetch` 或 `socket.io` 封装。

## 配置拆分

### 1. 运行时配置文件

新增 `public/runtime-config.js`。

职责：

- 在构建前写入当前 Android 演示环境所需的 `API base URL`
- 挂载到 `globalThis.__CHI_LE_ME_API_BASE_URL__`
- 被 `index.html` 在主脚本前加载

这样 Android 包内拿到的是“构建时生成的运行时配置”，而不是硬编码在源文件中的单一地址。

### 2. Android 准备脚本

新增 `scripts/prepare-android.mjs`。

职责：

1. 根据传入模式决定 API 地址
2. 生成 `public/runtime-config.js`
3. 执行前端构建
4. 执行 `npx cap sync android`

该脚本不负责启动后端，也不负责自动打开 Android Studio，保持职责单一。

### 3. npm scripts

在 `package.json` 中补充固定入口：

- `android:prepare:emulator`
  - 写入 `http://10.0.2.2:8787`
- `android:prepare:lan`
  - 写入 `http://<用户指定IP>:8787`
- `android:open`
  - 执行 `npx cap open android`

其中：

- `android:prepare:emulator` 是课设默认入口
- `android:prepare:lan` 是雷电兼容兜底入口

### 4. Android 明文网络配置

补充 Android 本地联调所需配置：

- 在 `android/app/src/main/AndroidManifest.xml` 中声明 `usesCleartextTraffic`
- 为应用绑定 `networkSecurityConfig`
- 新增 `android/app/src/main/res/xml/network_security_config.xml`

配置目标是允许本地开发阶段访问明文 `http` 地址，而不是无条件扩大全局网络权限边界。

### 5. README 演示文档

README 的 Android 部分改成“课设演示流程优先”，明确写出：

1. 启动后端
2. 执行 Android 资源准备命令
3. Android Studio 打开并运行
4. 如果模拟器访问失败，如何切到局域网 IP 模式

## 组件边界

### `public/runtime-config.js`

负责：

- 提供 Android 演示环境的运行时接口地址

不负责：

- 推导业务逻辑
- 保存用户本地数据

### `scripts/prepare-android.mjs`

负责：

- 生成运行时配置
- 串联构建和同步

不负责：

- 启动 Fastify 服务
- 修改 Android Java 代码

### `index.html`

负责：

- 在前端入口前加载运行时配置文件

不负责：

- 决定地址策略

### `android/app/src/main/AndroidManifest.xml`

负责：

- 允许开发联调所需的明文网络访问
- 声明网络安全配置入口

不负责：

- 写死具体后端地址

### `android/app/src/main/res/xml/network_security_config.xml`

负责：

- 约束 Android 允许的本地联调域名/IP 范围

不负责：

- 控制前端是否启用远程模式

## 运行流程

### 默认演示流程

1. 在项目根目录运行 `npm run server:dev`
2. 在另一终端运行 `npm run android:prepare:emulator`
3. 使用 Android Studio 打开 `android/`
4. 在模拟器中点击运行
5. App 加载本地打包页面，并向 `10.0.2.2:8787` 发请求

### 雷电兜底流程

当第三方模拟器无法访问 `10.0.2.2` 时：

1. 查询电脑局域网 IP
2. 运行 `npm run android:prepare:lan -- --host=<局域网IP>:8787`
3. 重新同步并运行 Android 工程

这样不需要修改业务代码，只替换配置注入值。

## 错误处理与诊断

### 模拟器无法连接后端

判定方式：

- App 页面打开但接口报错
- 后端终端没有收到任何请求

处理顺序：

1. 确认后端是否启动在 `0.0.0.0:8787`
2. 确认 Android 准备脚本写入的是正确地址
3. Android Studio 模拟器先试 `10.0.2.2`
4. 第三方模拟器切换为局域网 IP

### 接口请求到达但页面仍异常

判定方式：

- 后端有请求日志
- App 仍显示错误或数据空白

处理顺序：

1. 检查接口返回状态码
2. 检查前端运行时是否拿到了 `VITE` 或运行时覆盖地址
3. 检查会话初始化接口 `/api/sessions/identify` 是否成功
4. 检查 socket 连接是否复用了同一 base URL

## 测试与验收

### 功能验收

- `npm run android:prepare:emulator` 能成功完成构建和 `cap sync`
- Android Studio 可以成功编译并安装 App
- App 在官方模拟器中能打开首页
- App 能成功调用本机后端的 `identify`、`bootstrap` 等接口
- 实时功能继续通过现有 `socket.io` base URL 接入

### 回归检查

- Web 端 `npm run build` 仍能通过
- Android 原有启动流程不回归
- 未配置远程地址时，Web 端现有默认行为不被破坏

## 非目标

- 本次不改为纯原生 Android 页面开发
- 本次不实现一键启动 Android Studio + 后端 + 模拟器的全自动脚本
- 本次不引入 APK 签名、正式发布渠道或商店上架配置
- 本次不把前端默认模式切成强依赖 Vite 开发服务器

## 最终结论

本项目的 Android 课设演示方案将采用：

- 前端：继续使用 `Vite + React`
- 容器：继续使用 `Capacitor Android`
- 后端：继续使用本机 `Fastify`
- 演示模式：默认“打包前端资源 + 本机后端接口”
- 地址策略：官方模拟器走 `10.0.2.2`，第三方模拟器可切换为局域网 IP
- 配置方式：通过运行时配置文件、Android 准备脚本和 Android 网络安全配置组合完成

这样既能保证你在 `Android Studio` 里稳定运行课设项目，也能兼顾后续继续开发时的环境切换效率。

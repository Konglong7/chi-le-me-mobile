# 吃了么

手机端优先的 Web + Android 小应用，基于 React、Tailwind 和 Capacitor 实现，页面按 `eat what 原型图.html` 还原并补齐了真实交互。

当前已经补上：

- Web 前端
- Android 包装工程
- Fastify 后端
- Drizzle schema / 配置文件
- 多人共享提案 / 投票 / 组队 / 聊天 / 分享 / 历史 API
- Socket.IO lobby / proposal room 广播
- 通过 `VITE_API_BASE_URL` 接入远程多人模式

如果没有配置 `DATABASE_URL`，后端会退回进程内共享存储。  
配置了 `DATABASE_URL` 后，会切到 PostgreSQL 关系型持久化模式。

## 开发

```bash
npm install
npm run dev
```

## 后端开发

```bash
cp .env.example .env
npm run server:dev
```

默认后端监听 `http://localhost:8787`。

## 多人模式联调

1. 启动 PostgreSQL，并创建数据库 `chi_le_me`
2. 配置 `.env` 中的 `DATABASE_URL`
3. 启动后端：`npm run server:dev`
4. 启动前端：`npm run dev`
5. 确认前端环境里有 `VITE_API_BASE_URL=http://localhost:8787`

Vite 本地开发时可直接在启动命令前注入：

```bash
$env:VITE_API_BASE_URL='http://localhost:8787'
npm run dev
```

## 测试

```bash
npm run test:run
```

## Web 构建

```bash
npm run build
```

## 服务端检查

```bash
npm run server:check
```

## PostgreSQL 集成测试

需要真实 PostgreSQL 环境时再跑：

```bash
$env:RUN_PG_INTEGRATION='1'
npm run test:run -- server/src/postgres-repository.test.ts
```

## Android 课设演示

先在项目根目录准备后端环境：

```powershell
Copy-Item .env.example .env -Force
npm run server:dev
```

在另一个终端构建并同步 Android 资源：

```powershell
$env:VITE_API_BASE_URL='http://10.0.2.2:8787'
npm run cap:sync
npx cap open android
```

Android Studio 打开 `android/` 工程后，直接运行默认模拟器即可。
官方模拟器会通过 `http://10.0.2.2:8787` 访问本机后端。

如果使用雷电模拟器，且 `10.0.2.2` 无法访问本机后端，先查询当前电脑局域网 IP：

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress
```

然后改用局域网地址重新构建 Android 资源：

```powershell
$env:VITE_API_BASE_URL='http://192.168.1.23:8787'
npm run cap:sync
npx cap open android
```

如果 App 能进入昵称页，并在提交昵称后正常进入首页，说明 Android Studio 本地联调已经打通。

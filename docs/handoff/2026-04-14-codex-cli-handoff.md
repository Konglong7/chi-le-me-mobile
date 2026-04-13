# 吃了么 Codex CLI 交接文档

## 1. 项目概况

当前项目名：`吃了么`

定位：

- 手机端优先的 Web 小应用
- 保留 Android Studio 可运行的 Android 包装工程
- 核心场景是宿舍 / 朋友小圈子一起决定吃什么
- 主要功能：昵称进入、发起提案、投票、组队、聊天、分享、历史、转盘

当前技术栈：

- 前端：`Vite + React + TypeScript + Tailwind`
- Android：`Capacitor Android`
- 后端：`Fastify`
- 实时：`Socket.IO`
- 数据库：`PostgreSQL + Drizzle ORM`
- 持久化模式：
  - 未配置 `DATABASE_URL`：后端退回进程内共享存储
  - 配置 `DATABASE_URL`：后端启用 PostgreSQL 关系型持久化仓库

## 2. 当前状态总结

### 已完成

1. 原型图对应的 8 个手机端页面已经实现为可交互的前端
2. Web 构建可通过
3. Android Capacitor 工程已生成，应用名已设置为 `吃了么`
4. 前端已支持两种模式：
   - 本地演示模式
   - 远程多人模式
5. 后端已支持：
   - session identify
   - bootstrap
   - 创建提案
   - 查询提案详情
   - 投票
   - 组队加入/退出
   - 提案聊天消息
   - 分享美食
   - 历史查询
6. 后端已支持 Socket.IO 广播：
   - `proposal:upsert`
   - `share:created`
   - 房间：
     - `lobby`
     - `proposal:{id}`
7. 前端远程模式已接入：
   - `identifySession`
   - `bootstrap`
   - proposal / vote / participation / message / share mutation
   - socket 实时接收 proposal/share 更新
8. 已补充：
   - `drizzle.config.ts`
   - Socket.IO 自动化测试
   - 远程 mutation 自动化测试
   - 一轮 UI 精修

### 已验证

以下命令在本地已经跑过并通过：

```powershell
npm run test:run
npm run server:check
npm run build
npx cap sync android
```

### 未完成 / 未完全落地

1. PostgreSQL 集成测试依赖真实数据库环境，默认不会在本地 test 套件里自动跑
2. 前端还没有完整的 loading / error / reconnect UI
3. UI 已做一轮精修，但还没有逐屏逐像素人工验收
4. 没有重新验证 Android 真机构建或 `assembleDebug`
5. 没有部署脚本、反向代理、生产环境配置

## 3. 关键设计文档

### 已有设计 / 计划文件

- `docs/superpowers/specs/2026-04-13-eat-what-design.md`
  - 最初的页面与产品设计

- `docs/superpowers/specs/2026-04-14-multiplayer-backend-design.md`
  - 多人后端总体设计
  - 注意：这份文档里的目标架构比当前实际实现更“理想态”
  - 当前实现只完成了其中的一部分

- `docs/superpowers/plans/2026-04-14-multiplayer-backend-implementation.md`
  - 多人后端实施计划
  - 注意：计划里写了 `Drizzle / schema / modules / route split`
  - 当前实际代码还没有完全按这份计划重构到那个粒度

## 4. 当前代码真实实现情况

这部分比 spec / plan 更可信，Codex CLI 接手时应优先看这里。

### 前端入口

- `src/main.tsx`
- `src/app/App.tsx`

### 前端全局状态

- `src/app/store.tsx`

说明：

- 当前 store 仍然是系统核心
- 但现在它已经不是“纯本地状态”
- 它会根据是否配置远程 API 自动决定：
  - 走本地 reducer fallback
  - 或走后端 API + realtime

### 前端类型与种子数据

- `src/app/types.ts`
- `src/app/seed.ts`

### 前端 API / 远程相关

- `src/lib/api.ts`
- `src/lib/device.ts`
- `src/lib/realtime.ts`
- `src/lib/storage.ts`

说明：

- `src/lib/api.ts`
  - 定义远程 API 调用
  - `VITE_API_BASE_URL` 存在时启用远程模式

- `src/lib/device.ts`
  - 生成 / 复用本地 `deviceId`

- `src/lib/realtime.ts`
  - 使用 `socket.io-client`
  - 在非 test 环境下建立连接

- `src/lib/storage.ts`
  - 仍保存本地缓存
  - 现在还会保存：
    - `sessionToken`
    - `deviceId`

### 页面

- `src/screens/welcome-screen.tsx`
- `src/screens/home-screen.tsx`
- `src/screens/create-proposal-screen.tsx`
- `src/screens/proposal-detail-screen.tsx`
- `src/screens/wheel-screen.tsx`
- `src/screens/share-screen.tsx`
- `src/screens/history-screen.tsx`
- `src/screens/settings-screen.tsx`

### 公共 UI

- `src/components/layout.tsx`
- `src/components/ui.tsx`

### 后端入口

- `server/src/server.ts`
- `server/src/app.ts`

说明：

- `server/src/server.ts` 会自动读取 `.env`
- `server/src/app.ts` 里目前把路由、认证、socket 广播都写在一个文件里
- 这是后续最值得拆分的地方之一

### 后端仓库层

- `server/src/repository.ts`
  - 内存仓库
  - 测试主要跑的是这条路径

- `server/src/postgres-repository.ts`
  - PostgreSQL 关系型持久化仓库
  - 已改成真实表：
    - `users`
    - `sessions`
    - `proposals`
    - `proposal_options`
    - `proposal_votes`
    - `proposal_participants`
    - `proposal_messages`
    - `food_shares`

- `server/src/db/schema.ts`
- `server/src/db/client.ts`
- `server/src/db/bootstrap.ts`

### 后端环境

- `server/src/env.ts`

## 5. 当前后端行为

### 身份模型

当前采用：

- `nickname + deviceId + sessionToken`

流程：

1. 前端生成 / 复用 `deviceId`
2. 调用 `POST /api/sessions/identify`
3. 后端返回：
   - `currentUser`
   - `sessionToken`
4. 前端调用 `GET /api/bootstrap`
5. 后续 HTTP / Socket.IO 都带 token

### API 路由

当前在 `server/src/app.ts` 中实现的路由：

- `POST /api/sessions/identify`
- `GET /api/bootstrap`
- `POST /api/proposals`
- `GET /api/proposals/:proposalId`
- `POST /api/proposals/:proposalId/vote`
- `POST /api/proposals/:proposalId/participation/toggle`
- `POST /api/proposals/:proposalId/messages`
- `POST /api/shares`
- `GET /api/history`

### 实时事件

当前服务端会广播：

- `proposal:upsert`
- `share:created`

房间：

- 所有人连接后默认进入 `lobby`
- 提案详情页会加入 `proposal:{proposalId}`

### 现状评价

这已经足够用于“小圈子多人共享 + 自动推送”的第一版。  
但它仍然偏 MVP，不是最终生产级后端实现。

## 6. 当前数据库实现的真实情况

这一段非常重要，避免 Codex CLI 误以为项目已经完成了“标准关系型建模”。

### 当前是怎样做的

当配置 `DATABASE_URL` 时，会创建这些表：

- `chi_le_me_users`
- `chi_le_me_sessions`
- `chi_le_me_proposals`
- `chi_le_me_proposal_options`
- `chi_le_me_proposal_votes`
- `chi_le_me_proposal_participants`
- `chi_le_me_proposal_messages`
- `chi_le_me_food_shares`

### 这意味着什么

优点：

- 已经是标准关系模型
- 后续继续拆 module / route / service 会更顺
- 投票唯一性、消息分页、参与状态和历史查询都更容易继续扩展

当前缺点：

- 集成测试默认不自动跑真实 PostgreSQL
- 还没有 Drizzle migration 文件产物，只是 schema + runtime ensure

### Codex CLI 接手后的建议

数据库规范化已经做完。  
Codex CLI 接手时，数据库方向的下一步应该是：

1. 增加 Drizzle migration 文件
2. 给 PostgreSQL 仓库补真实 integration test pipeline
3. 进一步把 repository 拆成更清晰的 domain module

## 7. 当前测试覆盖

### 后端测试

- `server/src/routes/session-routes.test.ts`
  - session identify
  - bootstrap

- `server/src/routes/proposal-routes.test.ts`
  - create proposal
  - load proposal detail

- `server/src/routes/realtime-domain.test.ts`
  - vote
  - participation toggle
  - message create
  - share create
  - history query

- `server/src/socket.test.ts`
  - lobby 广播
  - proposal room 广播

- `server/src/postgres-repository.test.ts`
  - 真实 PostgreSQL 环境下的集成测试入口
  - 默认跳过，需显式设置 `RUN_PG_INTEGRATION=1`

### 前端测试

- `src/test/app.test.tsx`
  - 欢迎页
  - 昵称进入
  - 本地恢复

- `src/lib/interactions.test.tsx`
  - 创建提案
  - 投票 / 组队 / 聊天
  - 分享与历史

- `src/lib/remote-store.test.tsx`
  - 远程 identify + bootstrap

- `src/lib/multiplayer-actions.test.tsx`
  - 远程创建提案 mutation

### 当前测试空白

1. PostgreSQL 仓库的真实 integration test 默认跳过，依赖本地数据库环境
2. 前端 remote vote / remote chat / remote share 还没有逐项单独 mock 测试
3. Android 原生层没有测试

## 8. 当前运行方式

### 前端本地模式

```powershell
npm run dev
```

不配置 `VITE_API_BASE_URL` 时，前端继续使用本地 fallback。

### 前端远程多人模式

PowerShell：

```powershell
$env:VITE_API_BASE_URL='http://localhost:8787'
npm run dev
```

### 后端运行

```powershell
npm run server:dev
```

### PostgreSQL 模式

1. 复制环境文件

```powershell
Copy-Item .env.example .env
```

2. 在 `.env` 中配置：

- `PORT`
- `CORS_ORIGIN`
- `DATABASE_URL`
- `VITE_API_BASE_URL`

3. 启动后端

```powershell
npm run server:dev
```

### Android

```powershell
npm run build
npx cap sync android
npx cap open android
```

## 9. 目前最需要继续做的事项

按优先级排序：

### P1：把 `server/src/app.ts` 拆分

当前这个文件承担了：

- 路由
- token 鉴权
- socket 初始化
- 业务调用
- 广播

建议拆成：

- `server/src/routes/*.ts`
- `server/src/modules/*.ts`
- `server/src/socket.ts`
- `server/src/auth.ts`

### P2：补前端状态细节

当前远程模式缺：

- loading
- 请求失败提示
- reconnect 提示
- mutation 失败回滚

### P3：继续 UI 1:1 精修

当前页面已经做过一轮精修，但还没有做逐屏人工比对。  
这是原用户明确还想继续做的第二子项目。

## 10. 不要被旧计划误导的地方

以下内容在设计 / 计划里写了，但当前代码还没有完全实现：

1. Drizzle 已接入，但 migration 产物未完善
2. route / module 目录级拆分还未完成
3. 前端完整错误态 / 重连态还未完成
4. Android 真机构建仍未复验

因此 Codex CLI 接手时不要默认：

- “后端已经按 modules 拆完了”
- “前端远程态已经完全完善了”
- “Android 真机构建已经验证了”

要以当前代码实际状态为准。

## 11. 推荐的接手顺序

建议在 Codex CLI 里按这个顺序推进：

1. 先读：
   - `docs/superpowers/specs/2026-04-14-multiplayer-backend-design.md`
   - `docs/superpowers/plans/2026-04-14-multiplayer-backend-implementation.md`
   - 当前交接文档

2. 再读核心实现：
   - `server/src/app.ts`
   - `server/src/repository.ts`
   - `server/src/postgres-repository.ts`
   - `src/app/store.tsx`
   - `src/lib/api.ts`
   - `src/lib/realtime.ts`

3. 第一阶段目标：
   - 拆分 `server/src/app.ts`

4. 第二阶段目标：
   - 完善前端远程 loading / error / reconnect

5. 第三阶段目标：
   - 继续做 UI 1:1 精修

## 12. 建议给 Codex CLI 的起始提示词

可以直接把下面这段作为起始提示：

```text
你现在接手项目“吃了么”，项目根目录已经包含前端、Capacitor Android 包装层、Fastify 后端和多人模式接线。

请先阅读以下文件：
1. docs/handoff/2026-04-14-codex-cli-handoff.md
2. docs/superpowers/specs/2026-04-14-multiplayer-backend-design.md
3. docs/superpowers/plans/2026-04-14-multiplayer-backend-implementation.md
4. server/src/app.ts
5. server/src/postgres-repository.ts
6. server/src/db/schema.ts
7. src/app/store.tsx

当前实际状态是：
- 多人 API 已可用
- Socket.IO 广播已接入，并有自动化测试
- 前端远程模式已能走后端
- PostgreSQL 已改成 Drizzle + 关系型表
- `server/src/app.ts` 仍然偏大，前端远程错误态还不完整

请不要重复已经完成的工作。
你的第一目标是把 `server/src/app.ts` 拆成更清晰的 route / auth / socket / module 结构，并保持现有前端功能不回退。

在动手前，请先输出：
1. 你对当前状态的理解
2. 你准备改动的文件列表
3. 最小安全实施顺序
```

## 13. 额外注意事项

1. 当前仓库不是一个成熟的 git 工作流项目环境，交接时不要假设有干净分支策略
2. Android 真机构建没有重新验证
3. 当前实时客户端在 test 环境下会自动禁用连接，这是故意的，避免测试进程挂住
4. 当前本地 fallback 模式仍然保留，不要轻易删掉，除非同时补齐新的测试与开发替代方案
5. `server/src/postgres-repository.test.ts` 默认跳过，只有在真实 PostgreSQL 环境下才建议跑

## 14. 交接结论

这次交接后的真实状态可以概括为：

- 产品前端已成型
- 多人后端已经可用
- 数据库已经规范化到关系表层级
- 实时同步已经接上，并补了 socket 自动化测试
- 最值得 Codex CLI 继续推进的是：
  - `服务端结构拆分`
  - `前端远程状态完善`
  - `UI 1:1 精修`

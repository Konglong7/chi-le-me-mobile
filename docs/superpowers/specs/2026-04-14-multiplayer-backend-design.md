# 吃了么多人后端设计说明

## 目标

在现有 `Vite + React + Capacitor` 前端基础上，把当前仅本地持久化的单机版本升级为真正多人可用的版本：

- 多人同时进入同一个网站可见同一份提案、投票、组队、聊天、历史与分享数据
- 支持实时更新，而不是刷新页面后才看到变化
- 继续保持轻量使用方式，不引入账号密码体系
- Android 包装版继续复用同一套前端页面

本设计只覆盖 `多人后端 / 数据库 / 实时同步`。  
`UI 1:1 精修` 作为下一子项目单独处理。

## 直接采用的默认假设

用户明确要求“按照推荐做，不再追问”，因此本设计直接采用以下默认假设：

1. 产品仍然面向 `宿舍 / 朋友小圈子`
2. 不做正式注册登录
3. 使用 `昵称 + 本地设备唯一 ID + 服务端 session token`
4. 先做 `一个共享圈子`，不做多宿舍 / 多组织切换
5. 聊天以 `提案独立聊天区` 为主，不做私聊
6. 转盘仍然主要是 `个人决策工具`，多人版本里优先同步提案、聊天、投票、组队、分享、历史

## 方案比较

### 方案 A：Supabase 全托管

组成：

- Supabase Postgres
- Supabase Realtime
- Supabase Storage
- 前端直接调用 Supabase SDK

优点：

- 启动快
- 数据库和实时能力现成
- 服务器代码最少

缺点：

- 轻量匿名身份和“昵称 + 设备 ID”模型要额外绕一层
- 业务规则分散在前端、数据库策略、Edge Functions 之间
- 提案房间、投票唯一性、组队切换、聊天广播这类强业务状态不够集中

适合：

- 更偏原型或快速验证

### 方案 B：自建 JS 后端

组成：

- `Fastify` API 服务
- `Socket.IO` 实时通道
- `PostgreSQL` 数据库
- `Drizzle ORM` 做 schema 和 SQL 映射

优点：

- 身份、提案、投票、组队、聊天、广播规则都集中在一处
- 非常适合当前这种“轻登录 + 强状态同步”的小圈子协作产品
- 后续做部署、日志、管理后台、风控、迁移都更稳

缺点：

- 后端代码量比 BaaS 更大
- 需要自己维护 API、数据库迁移和实时事件

适合：

- 要做成真正可长期用的产品

### 方案 C：Firebase / Firestore

组成：

- Firestore
- Firebase Auth
- Firebase Realtime listener

优点：

- 实时监听成熟
- 原型速度快

缺点：

- 文档型数据对投票、组队、历史查询、提案聚合不够自然
- 关系型统计和历史沉淀会越来越别扭
- 对当前产品的数据结构不是最顺手

适合：

- 更偏文档流或消息流产品

## 推荐方案

采用 `方案 B：Fastify + Socket.IO + PostgreSQL + Drizzle ORM`。

这是当前最稳的中线方案：

- 比 Supabase 更可控
- 比 Firebase 更贴合提案/投票/组队/历史这类关系型数据
- 对现有 React 前端改造成本可控
- 后面 UI 精修时不会再因为数据层和实时机制变化大改页面逻辑

## 总体架构

### 前端

保留现有：

- `Vite`
- `React`
- `Tailwind`
- `Capacitor Android`

新增：

- `API Client` 负责 HTTP 请求
- `Realtime Client` 负责 Socket.IO 订阅
- 当前本地 reducer 改造成 `前端缓存层`，不再作为最终数据来源

### 后端

新增一个独立的 `server` 目录，提供：

- REST API
- Socket.IO 实时事件
- 数据库存取
- session 鉴权
- 业务规则校验

### 数据库

使用 `PostgreSQL`，原因：

- 提案、投票、组队、消息、历史都明显是关系型数据
- 唯一投票、幂等加入/退出、历史查询、排序分页都更自然
- 后面要做运营或后台统计也更顺

## 身份模型

不做注册登录，采用轻量身份：

1. 前端首次打开时生成 `device_id`
2. 用户输入昵称进入
3. 前端调用 `POST /sessions/identify`
4. 服务端根据 `device_id` 查找或创建用户
5. 服务端返回：
   - `user_id`
   - `nickname`
   - `session_token`
6. 后续请求与 socket 连接都带上 `session_token`

### 这样做的意义

- 用户仍然感觉是“只输昵称就能用”
- 服务端可以稳定识别“同一个人”
- 可以严格实现“每人一次投票”
- 昵称可改，但投票和聊天归属不会乱

## 数据模型

### users

- `id`
- `device_id`，唯一
- `nickname`
- `avatar_seed`
- `created_at`
- `updated_at`
- `last_active_at`

### sessions

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`
- `last_used_at`

### proposals

- `id`
- `title`
- `proposal_type`
- `target_name`
- `address`
- `event_time`
- `expected_people`
- `remark`
- `status`
- `creator_user_id`
- `vote_mode`
- `max_people`
- `created_at`
- `updated_at`
- `closed_at`
- `final_option_id`

### proposal_options

- `id`
- `proposal_id`
- `name`
- `sort_order`
- `created_at`

### proposal_votes

- `id`
- `proposal_id`
- `option_id`
- `user_id`
- `created_at`

唯一约束：

- `proposal_id + user_id`

用于保证每个提案每人只能保留一份投票记录。

### proposal_participants

- `id`
- `proposal_id`
- `user_id`
- `joined_at`
- `left_at`
- `is_active`

唯一约束：

- `proposal_id + user_id`

### proposal_messages

- `id`
- `proposal_id`
- `user_id`
- `content`
- `created_at`

### food_shares

- `id`
- `user_id`
- `food_name`
- `shop_name`
- `price`
- `address`
- `rating`
- `comment`
- `created_at`

### optional: wheel_presets

首版多人化不强制做服务端转盘预设表。  
转盘自定义选项先允许继续保留前端本地存储，但“历史导入”和“分享导入”来自服务端真实数据。

## 业务规则

### 提案

- 提案创建后默认进入 `投票中` 或 `组队中`
- 如果有多个候选项，优先视为 `投票中`
- 如果候选项只有一个，直接进入 `组队中`
- 满人后自动切为 `已成团`
- 发起人可手动结束提案

### 投票

- 一个提案每个用户只保留一份投票
- 单选模式下重新投票会覆盖旧票
- 多选模式如果后续要加，可以扩成 `proposal_vote_items`
- 投票写库成功后，再通过 socket 广播最新票数

### 组队

- “我要去” 是幂等操作
- 已加入的人再次点击就是退出
- 若提案已满人，普通用户不能再加入
- 满人后自动广播 `proposal_grouped`

### 聊天

- 每个提案一个独立房间
- 消息先持久化，再广播
- 聊天历史按时间排序拉取

### 分享与历史

- 分享内容直接入库
- 历史页聚合：
  - 历史提案
  - 分享记录
- 历史查询走服务端，不再依赖本地 reducer

## 实时同步设计

### 连接方式

使用 `Socket.IO`，原因：

- 浏览器和 Android WebView 都好接
- 自动重连成熟
- room 模型适合“大厅 + 提案房间”
- 比原生 WebSocket 少很多基础胶水代码

### 房间划分

- `lobby`
  - 首页提案列表更新
  - 新提案创建
  - 提案状态变化
  - 最近分享更新

- `proposal:{id}`
  - 投票变化
  - 参与人数变化
  - 新聊天消息
  - 成团 / 结束事件

### 事件设计

客户端发：

- `proposal:join-room`
- `proposal:leave-room`

服务端推：

- `proposal:created`
- `proposal:updated`
- `proposal:votes-updated`
- `proposal:participants-updated`
- `proposal:message-created`
- `proposal:status-changed`
- `share:created`

### 一致性原则

所有关键操作遵循：

1. HTTP 请求提交业务动作
2. 服务端写数据库
3. 服务端推送 socket 广播
4. 前端用广播结果修正本地缓存

这样可以避免“本地看起来成功，实际上服务端失败”的假同步问题。

## API 设计

### session

- `POST /sessions/identify`
- `POST /sessions/logout`
- `GET /me`

### bootstrap

- `GET /bootstrap`

返回首页首屏所需：

- 当前用户
- 进行中提案
- 最近分享
- 历史摘要

### proposals

- `GET /proposals`
- `POST /proposals`
- `GET /proposals/:id`
- `POST /proposals/:id/vote`
- `POST /proposals/:id/participation/toggle`
- `POST /proposals/:id/messages`
- `POST /proposals/:id/close`

### shares

- `GET /shares`
- `POST /shares`

### history

- `GET /history`

## 前端改造方式

### 当前问题

现有前端状态全在 `src/app/store.tsx` 里，直接保存到 `localStorage`。  
这对单机演示没问题，但多人版会有三个问题：

1. 多人之间数据完全不同步
2. 刷新和重连后没有服务端真相源
3. 很难做实时聊天和投票广播

### 改造策略

不直接推翻现有页面，而是分两层改：

1. 保留现有 screen 组件结构
2. 把 store 从“本地真数据”改成“服务端缓存 + UI 状态”

具体拆分：

- `app/store.tsx`
  - 仅保留 UI 级状态：当前页面、弹层、草稿输入、当前选中的提案

- 新增 `app/query` 或 `lib/api`
  - 负责 HTTP 请求

- 新增 `lib/realtime`
  - 负责 socket 连接、订阅、重连

- 新增 `server-shape -> ui-shape mapper`
  - 把服务端数据映射成现有页面消费结构

## 错误处理

### 用户侧

- 会话失效：重新走昵称进入，但尽量自动恢复
- 投票失败：toast 提示并回滚按钮状态
- 加入队伍失败：提示“人数已满”
- 聊天发送失败：消息标记失败态，可重发

### 服务端

- 所有写操作返回明确错误码
- socket 重连后客户端主动重新拉取当前提案详情
- 对投票、组队等关键动作做幂等控制

## 测试策略

### 后端

- 单元测试：
  - session 识别逻辑
  - 投票唯一性
  - 组队人数上限
  - 提案状态切换

- 集成测试：
  - API + PostgreSQL
  - socket 广播流程

### 前端

- 保留现有 UI 测试
- 新增：
  - bootstrap 加载测试
  - 提案详情实时更新测试
  - 聊天消息广播测试
  - 断线重连后重新同步测试

## 部署建议

### 推荐部署结构

- 前端静态站点：Vercel / Netlify / Nginx
- 后端：Railway / Render / Fly.io / 自己云服务器
- 数据库：托管 PostgreSQL

### 环境变量

- `DATABASE_URL`
- `SESSION_SECRET`
- `CORS_ORIGIN`
- `SOCKET_CORS_ORIGIN`

## 实施顺序

### Phase 1：后端骨架

- 建立 Fastify 服务
- 接入 PostgreSQL
- 建表与迁移
- session 识别接口

### Phase 2：提案与分享 API

- 提案 CRUD 基础接口
- 分享接口
- 历史接口

### Phase 3：前端接 API

- 首页改为服务端拉取
- 详情页改为服务端拉取
- 分享和发起提案走真实提交

### Phase 4：实时同步

- lobby 广播
- proposal 房间广播
- 投票 / 组队 / 聊天实时更新

### Phase 5：稳定性补充

- 错误态
- 重连机制
- 乐观更新与回滚

## 与 UI 1:1 精修的边界

这一子项目只做最少必要 UI 变动：

- loading / empty / error / syncing 状态
- 多人实时状态提示
- 连接状态标识

不在这一阶段深抠：

- 间距 1:1
- 阴影细节
- 色阶微调
- 原型像素级对齐

这些都放到下一子项目单独做。

## 最终结论

多人版采用：

- 前端：继续用当前 React + Tailwind + Capacitor
- 后端：Fastify
- 数据库：PostgreSQL
- ORM：Drizzle
- 实时：Socket.IO
- 身份：昵称 + 设备 ID + session token

这是当前最适合“宿舍/朋友小圈子实时干饭协作”的长期方案。

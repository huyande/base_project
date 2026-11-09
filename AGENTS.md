# AGENTS.md

本文件是仓库根目录的 AI 协作入口，覆盖 `server/` 与 `mini/` 两个子项目。

- `server/`：NestJS 11 + TypeORM + MySQL 后端。
- `mini/`：原生微信小程序前端（JavaScript + WXML/WXSS，无跨端框架）。

> 就近的 `server/AGENTS.md`、`server/CLAUDE.md` 是更早的脚手架说明，其中 `family` / `child` / `course` / `lesson-log` / `notification` 模块、`BaseEntity` 等已不存在。**冲突时以本文件与实际代码为准**；修改后端时不要照抄那两个文件。

> 开始任务前先读 `docs/README.md`；方案、决策、变更（含移除项）必须按该目录规范落盘。详见第 10 节。

---

## 1. 当前真实功能边界

这不是完整业务系统，而是可运行的双端脚手架：

| 能力 | 状态 |
|---|---|
| 微信静默登录（`wx.login` → `code2Session` → 自动注册） | 已实现 |
| JWT 双令牌（access + refresh）与自动续期 | 已实现 |
| 全局 JWT 守卫、`@Public()` 白名单 | 已实现 |
| 腾讯云 COS STS 临时上传凭证 | 已实现 |
| 统一成功/失败响应信封 | 已实现 |
| 小程序启动鉴权、登录页、首页空壳 | 已实现 |
| COS 小程序端上传封装 | 已实现 |
| 云托管通道请求 | 已实现（上传未实现） |
| Redis / 订阅消息 / 家庭组 / 课程等业务 | **未实现**；`ioredis`、`moment` 仅为预留依赖 |

新增业务前先确认是否真的需要扩展脚手架，不要假设已有模块。

---

## 2. 仓库结构

```text
.
├── AGENTS.md                  # 本文件
├── server/                    # 后端
│   ├── src/
│   │   ├── main.ts            # 启动、日志级别、ValidationPipe、Swagger
│   │   ├── app.module.ts      # 根模块 + 全局 Guard/Interceptor/Filter
│   │   ├── config/            # env 加载、TypeORM 配置
│   │   ├── database/          # 数据库连接 + 实体注册表
│   │   ├── common/
│   │   │   ├── dao/base.dao.ts
│   │   │   ├── decorators/public.decorator.ts
│   │   │   ├── response/      # Result 信封、错误码、全局异常过滤器
│   │   │   └── utils/
│   │   └── modules/
│   │       ├── auth/          # 登录/刷新/登出 + JWT 守卫 + 微信 client
│   │       └── cos/           # COS STS 临时密钥
│   ├── build.sh               # 服务器 Docker 构建/部署脚本
│   ├── Dockerfile
│   └── .env / .env.development / .env.production
├── mini/                      # 小程序
│   ├── app.js / app.json / app.wxss
│   ├── config/env.js          # 唯一环境配置入口
│   ├── pages/
│   │   ├── launch/            # 首屏：静默登录后分流
│   │   ├── index/             # 首页空壳
│   │   └── wellcome/          # 登录失败/手动登录入口
│   ├── services/auth.js       # 登录态、refresh 单例、本地持久化
│   ├── utils/
│   │   ├── request.js         # 双通道请求客户端
│   │   ├── api.js             # API_PATHS + 语义化 api 封装
│   │   ├── storage.js
│   │   ├── font-size.js
│   │   ├── nav-bar.js
│   │   ├── cos-uploader.js
│   │   └── ...
│   ├── components/            # page-header / navigation-bar / privacy-popup 等
│   ├── styles/                # CSS 变量与可复用样式类
│   └── ...                    # images / miniprogram_npm 等
└── docs/                      # 项目上下文与文档（入口 docs/README.md）
    ├── decisions/             # ADR 长期决策
    ├── designs/               # 方案/技术设计（实现前）
    ├── changes/               # 变更记录（实现后，含移除清单）
    ├── ops/                   # 部署/环境/排障
    ├── archive/               # 已废弃/已移除文档
    └── templates/             # 文档模板
```

根目录**没有** `package.json`，也不要尝试在根目录安装依赖或运行脚本；所有命令进入子目录执行。

---

## 3. 常用命令

### 后端（必须在 `server/` 下）

包管理器是 **pnpm**，不要用 npm / yarn。

```bash
pnpm install
pnpm start:dev        # NODE_ENV=development，watch 模式
pnpm build            # nest build → dist/
pnpm start:prod       # NODE_ENV=production node dist/main
pnpm lint             # eslint --fix，会直接改文件
pnpm format           # prettier 写入
pnpm test             # 当前仅 string.util.spec.ts
pnpm test:cov
```

新增模块：

```bash
pnpm exec nest g resource modules/<name>
```

### 小程序（必须在 `mini/` 下或用微信开发者工具）

```bash
pnpm install
pnpm dev:wxss         # postcss watch 输出到 dist/，仅样式预处理
pnpm build:wxss       # postcss 一次性构建到 dist/
```

日常开发直接导入 `mini/` 到微信开发者工具（AppID 已配置在 `project.config.json`，基础库 3.11.3）。`mini/package.json` 的 `test` 脚本会直接失败，项目没有自动化测试。

---

## 4. 前后端契约（改任何一端都要同步另一端）

### 4.1 地址与端口

- 后端默认端口 `3000`，由 `APP_PORT` 或 `PORT` 覆盖。
- **没有全局路由前缀**，接口就是 `/auth/login`、`/wx/cos/sts`。
- Swagger：`http://localhost:3000/api-docs`；`SWAGGER_ENABLED=false` 时关闭。
- 小程序地址全部在 `mini/config/env.js`：
  - `channel` 当前为 `'http_prod'`，使用 `http_prod.baseURL = https://mylabx.top/wx-course`。
  - `'http'` 指向 `http://47.117.123.109:3000`（开发服务器）。
  - `'cloud'` 使用 `wx.cloud.callContainer`，需要 `cloud.env` / `cloud.service`。
  - 通道与 dev/pro 解耦；不要再用旧的 `setEnvironment('pro')` 语义（它会映射到 cloud）。

### 4.2 统一响应信封

成功：

```json
{ "code": 0, "data": {}, "timestamp": "2026-11-09T12:00:00.000Z" }
```

分页成功额外带 `meta`：

```json
{ "code": 0, "data": [], "meta": {}, "timestamp": "..." }
```

失败（HTTP 状态码同时设置）：

```json
{
  "code": 400,
  "data": null,
  "error": "人类可读信息",
  "errorCode": "BAD_REQUEST",
  "timestamp": "..."
}
```

- `code === 0` 才算成功；失败时 `code` 是 HTTP 状态码。
- `errorCode` 取值：`BAD_REQUEST` / `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` / `CONFLICT` / `INTERNAL_ERROR`；其他 `HttpException` 为 `HTTP_<status>`。
- 后端**没有全局 TransformInterceptor**：controller 必须显式 `Result.success(...)` / `Result.successPaginated(...)`。抛 `HttpException` 由 `AllExceptionsFilter` 统一转失败信封。
- 小程序 `request.js` 会自动解包：普通接口返回 `data`，分页返回 `{ data, meta }`；调用方不要自己再取 `.data`。

### 4.3 认证与令牌

流程：

1. 小程序 `wx.login()` 拿 `code`。
2. `POST /auth/login { code }`（`@Public`）→ 后端 `code2Session` 换 `openId`，不存在则建 `user`，返回 `{ accessToken, refreshToken, user }`。
3. 业务请求带 `Authorization: Bearer <accessToken>`。
4. access 过期 → `POST /auth/refresh { refreshToken }`（`@Public`）→ 返回新令牌对。
5. `POST /auth/logout`（需 JWT）→ 清空数据库中的 `refreshToken` / `tokenExpiresAt`。

关键约束：

- `AppModule` 注册了全局 `JwtAuthGuard`；**所有接口默认鉴权**，只有显式 `@Public()` 才免鉴权。根路由 `GET /` 也需要 Token。
- `JwtStrategy.validate()` 每次请求都会查库确认用户存在，返回**完整 `User` 实体**到 `req.user`。
- access token payload 为 `{ user: LoginUserDto }`；refresh token payload 为 `{ sub, openId, type: 'refresh' }`，并使用独立的 `JWT_REFRESH_SECRET`。
- 用户表只保存**一个** refreshToken；有效期内重复登录复用旧 refreshToken（多设备共存），刷新时轮换。
- 小程序端：
  - `accessToken` 直接写在 `wx` storage 的 `app_token`（`config.storagePrefix + 'token'`）。
  - `refreshToken` / `userInfo` 走 `storageManager`，键为 `app_refreshToken` / `app_userInfo`。
  - 401 会自动单例刷新并重放一次原请求；刷新失败则清登录态并 `reLaunch` 到 `/pages/launch/launch`。
  - 登录/刷新接口在 401 白名单内，不会触发自动刷新。

### 4.4 COS 上传

- 后端：`GET /wx/cos/sts?bucket=<bucket-appid>&region=<region>`（需 JWT），返回 `{ tmpSecretId, tmpSecretKey, sessionToken, expiredTime }`。
- 权限限定为 `COS_ALLOW_PREFIX`（默认 `uploads/*`）下的 `PutObject` / `PostObject`。
- 小程序端 `utils/cos-uploader.js` 通过 `api.file.getSTS()` 获取凭证，交给 `cos-wx-sdk-v5`。
- 云托管通道的 `request.upload()` 目前**未实现**，会直接 reject；需要上传时走 COS 或补协议。

---

## 5. 后端规范（`server/`）

### 5.1 模块结构

每个业务模块按功能独立目录：

```text
src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── dao/            # 可选，继承 BaseDao
├── dto/
├── entities/
└── guards/         # 可选
```

新增模块必须：

1. 在 `src/app.module.ts` 的 `imports` 注册。
2. 若有实体，在 `src/database/entities/index.ts` 的 `ALL_ENTITIES` 注册；TypeORM **没有** 开启 `autoLoadEntities`，漏注册则表不生效。
3. controller 返回值包 `Result.success()`；需要分页用 `Result.successPaginated()`。

### 5.2 响应与异常

- 成功只能通过 `Result.success(data)`（`src/common/response/result.ts`）。
- 失败抛 Nest 内置异常（`BadRequestException`、`UnauthorizedException`、`NotFoundException`、`ConflictException`、`ForbiddenException`），不要手写 `res.json`。
- 未知异常由过滤器统一脱敏为 `500 / INTERNAL_ERROR`，完整堆栈写日志。
- DTO 校验依赖 `class-validator`；全局 `ValidationPipe` 只开了 `transform` + `enableImplicitConversion`，**没有** `whitelist` / `forbidNonWhitelisted`，未知字段会被保留到 DTO 对象上。需要严格入参时自行加校验或显式开启，但会影响所有接口。

### 5.3 实体与 DAO

- `User` 实体：`id` 为 `bigint` 主键，TypeScript 与 API 层都按 **string** 处理；列名统一 snake_case，属性 camelCase。
- 时间列使用 `@CreateDateColumn` / `@UpdateDateColumn`（`datetime`）。
- `BaseDao<T>` 提供 `create/findOne/findMany/update/delete/softDelete/paginate`；`paginate` 使用 `nestjs-paginate`，默认按 `id DESC`，可排序列为 `id/createdAt/updatedAt`。
- 分页参数格式由 `nestjs-paginate` 决定（`page`、`limit`、`sortBy`、`filter` 等），不要另造一套。

### 5.4 配置与环境变量

- `main.ts` 启动时先 `loadEnvFiles()`，再创建 Nest。
- 优先级：**平台注入的非空环境变量 > `.env.<NODE_ENV>` > `.env`**；`.env.development` / `.env.production` 覆盖 `.env`。
- `.env.example` 是模板；`start:dev` 固定 `NODE_ENV=development`，Docker 固定 `NODE_ENV=production`。
- `DB_SYNCHRONIZE=true` 会由 TypeORM 自动改表结构（当前开发环境如此）；没有 migration 体系，生产改表要谨慎。
- 时区：应用 `TZ=Asia/Shanghai`，MySQL 连接默认 `+08:00`。
- Redis 变量和 `ioredis` 依赖已预留，但代码中未使用；不要声称已有 Redis 能力。

### 5.5 代码风格与工具

- 路径别名 `@/*` → `src/*`，新代码优先使用。
- Prettier：单引号、尾逗号 all。
- ESLint 配置在 `eslint.config.mjs`；`pnpm lint` 会 `--fix`。
- `strictNullChecks`、`noImplicitAny` 均关闭，不要依赖严格空值检查兜底。
- 请求未启用 CORS；小程序原生请求不受影响，浏览器/H5 直连需自行开启。

### 5.6 部署

- `Dockerfile`：Node 22 + pnpm 9，构建镜像前要求 `.env.production` 存在。
- `build.sh`：`git pull` → 构建带日期标签镜像 → 替换容器 `wx-nest` → 用 `.env.production` 启动；保留 3 个历史镜像。
- `rollback.sh`：回滚容器镜像。

---

## 6. 小程序规范（`mini/`）

### 6.1 技术约定

- 原生小程序，CommonJS（`require` / `module.exports`）；不要引入 ES Module 语法或跨端框架。
- 页面/组件目录 kebab-case，工具文件 camelCase。
- `utils/`、`components/` 保持零业务耦合；业务逻辑放 `pages/` 或新增 `services/`。
- 新增页面必须在 `app.json` 的 `pages` 注册；`pages/launch/launch` 必须保持第一项作为入口。

### 6.2 请求层

入口：`utils/request.js`，业务侧优先用 `utils/api.js`：

```js
const { get, post, api } = require('../../utils/api.js')
const data = await get('/some/list')
const res = await api.auth.login({ code })
```

- 双通道：`http` / `http_prod` 用 `wx.request`；`cloud` 用 `wx.cloud.callContainer`。
- 拦截器统一加 `Content-Type`、`Authorization`；`http` + `debug` 时会注入 `X-WX-OPENID`（`devOpenId`），生产必须留空且 `debug=false`。
- 自动解包响应信封；业务错误/HTTP 错误会 Toast 并抛带 `type` 的 Error，调用方只需处理 `catch`。
- 仅内部流程（如 `refreshAuth`）使用 `apiClient.rawRequest()`，它会跳过 401 自动刷新。
- 新增接口：在 `utils/api.js` 的 `API_PATHS` 声明路径，再在 `api.*` 中加语义化方法。

### 6.3 登录态与启动流程

- `app.js`：启动时按需 `wx.cloud.init`，清理过期存储。
- `pages/launch/launch` 调 `services/auth.js` 的 `silentLogin()`：
  - 成功 → `wx.reLaunch` 到首页。
  - 失败/无 token → `wx.redirectTo` 到 `pages/wellcome/wellcome`。
- `silentLogin` 与 `refreshAuth` 都是**单例 Promise**，防并发重复登录/令牌轮换冲突。
- 登录态键：`app_token`（直接 storage）、`app_refreshToken`、`app_userInfo`（`storageManager`）。
- 更改存储键时，必须同时改 `utils/request.js`（`TOKEN_KEY`）、`services/auth.js`（`TOKEN_KEY`）和 `utils/constants.js`，否则会出现“登录成功但请求不带 token”。

### 6.4 存储

- 统一用 `utils/storage.js` 的 `storageManager`：自动加 `config.storagePrefix`（当前 `app_`）。
- 以 `cache_` 开头或显式传 `{ expire }` 的键会带过期时间；`get` 同步，`getAsync` 异步。
- `storageManager` 不管理 `app_token`，它由 `services/auth.js` 直接读写。

### 6.5 UI / 样式

- 全局 `navigationStyle: "custom"`，页面统一用全局组件 `<page-header title="..." />`（`app.json` 已全局注册 `page-header`），不要重复注册。
- 其他组件 `navigation-bar`、`back-button`、`home-button`、`privacy-popup` 按需在页面 JSON 中局部注册。
- 样式令牌在 `styles/variables.wxss`：优先使用 M3 语义变量（`--color-*`、`--bg-*`、`--text-*`、`--spacing-*`、`--font-size-*`、`--border-radius-*`、`--shadow-*`）；旧别名（`--primary-color` 等）仅兼容存量代码。
- 可复用类在 `styles/mixins.wxss`（`card-mixin`、`button-*`、`flex-*`、`tag-*`、`chip-*` 等）。
- 字号缩放：页面 `onLoad` 调 `fontSize.bindPage(this)`、`onUnload` 调 `unbindPage(this)`，WXML 顶层放
  `<page-meta page-style="--font-scale: {{fontScale}};"></page-meta>`；组件用 `fontScaleBehavior`。所有字号使用 `var(--font-size-*)` 才会跟随。
- 尺寸用 `rpx`；安全区用 `env(safe-area-inset-*)`；自定义导航栏高度用 `utils/nav-bar.js` 的 `getNavBarMetrics()` 动态计算。
- `app.json` 已开启 `__usePrivacyCheck__`；涉及隐私接口的页面需自行注册 `privacy-popup` 组件。

### 6.6 敏感配置

- `config/env.js` 是唯一环境配置入口，**不要**把 baseURL / 云环境 / bucket 散落到页面。
- 该文件当前包含 `devOpenId`、云环境 ID 等信息；新增密钥时不要把私钥写入仓库，生产值走构建注入或 `.gitignore`。
- `.env.development` / `.env.production` 含真实数据库连接信息，不要读取后在回答中输出明文，不要提交新的密钥。

---

## 7. 常见任务工作流

### 新增后端接口

1. 在 `src/modules/<module>/` 加 controller/service/dto。
2. 实体注册到 `ALL_ENTITIES`。
3. 模块接入 `AppModule`。
4. controller 返回 `Result.success(...)`；需要公开则加 `@Public()`。
5. 在 `mini/utils/api.js` 加路径与语义化方法。
6. `pnpm build` + `pnpm lint`；启动服务后用 curl/Swagger 验证真实响应。

### 新增小程序页面

1. 建 `pages/<name>/`（`.js/.json/.wxml/.wxss`）。
2. 在 `app.json.pages` 注册。
3. 使用 `<page-header>`、`storageManager`、`api`。
4. 需要字号缩放时接入 `bindPage/unbindPage` + `page-meta`。
5. 微信开发者工具编译，走通真实交互。

### 修改鉴权/令牌

同时检查：

- `server/src/modules/auth/`（签发、校验、刷新、登出）
- `server/src/common/response/`（错误信封）
- `mini/services/auth.js`（持久化、单例、刷新）
- `mini/utils/request.js`（401 重放、白名单、`TOKEN_KEY`）
- `mini/utils/constants.js`（存储键）

任何一端单独改都会破坏契约。

方案、决策与变更按第 10 节落盘；先写 `docs/designs/`，实现后补 `docs/changes/`。

---

## 8. 验证要求

- 后端：至少 `pnpm build`；涉及规则变更运行 `pnpm test`（目前覆盖很少，别把“测试通过”当成行为已覆盖）。
- 后端运行依赖 MySQL；`.env.development` 指向远程开发库，**不要**在该库上做破坏性操作或批量写数据。
- 小程序：没有自动化测试，必须在微信开发者工具中编译并操作真实页面；改请求层时同时验证登录、401 刷新、业务错误 Toast。
- 改接口后同时验证 Swagger 文档与实际返回信封是否一致。

---

## 9. 已知陷阱（高频）

1. **旧文档误导**：`server/AGENTS.md`、`server/CLAUDE.md`、`server/.cursor/skills/generate-api-doc/` 的内容基于已删除的业务模块，涉及 `FamilyMemberDto`、`groupId` 等描述均不成立。
2. **忘记 `Result.success`**：没有全局响应包装器，直接 `return data` 会让前端解包逻辑失效。
3. **忘记注册实体**：TypeORM 只认 `ALL_ENTITIES`，漏注册时接口运行期才报错。
4. **`@Public()` 滥用**：全局默认鉴权，公开接口必须是有意为之。
5. **`mini/config/env.js` 当前指向生产 HTTP 地址**：本地联调先确认 `channel` / `http*` 配置，避免误请求生产。
6. **`http_prod` 不是 `http`**：`setChannel('http_prod')` 才走生产地址；`setChannel('http')` 走开发服务器。
7. **`setEnvironment()` 是旧兼容 API**：`pro → cloud`，新代码不要使用。
8. **云托管上传未实现**：`request.upload()` 在 `cloud` 通道直接 reject，统一走 COS。
9. **没有全局前缀 / CORS / migration**：不要假设 `/api` 前缀、浏览器跨域可用或存在迁移脚本。
10. **ID 是 bigint 字符串**：不要用 `Number` 处理 `user.id`，会丢精度。
11. **不要重复造请求/存储/Toast**：已有 `api`、`storageManager`、`showToast`，保持单一实现。

---

## 10. 文档与上下文维护（强制）

所有讨论过的方案、做出的决策、实际改动、移除内容都必须落到 `docs/`，不能只存在于对话或 commit message。

### 10.1 入口与检索顺序

1. 根 `AGENTS.md`
2. `docs/README.md`（规范 + 唯一索引）
3. `docs/decisions/` → `docs/designs/` → `docs/changes/` → `docs/ops/` → `docs/archive/`
4. 源码

### 10.2 写什么、放哪里

| 场景 | 目录 | 命名 |
|---|---|---|
| 影响后续实现的决策 | `docs/decisions/` | `ADR-0001-<slug>.md` |
| 实现前方案/接口设计/取舍 | `docs/designs/` | `YYYY-MM-DD-<slug>.md` |
| 实现后的改动（含移除） | `docs/changes/` | `YYYY-MM-DD-<slug>.md` |
| 部署/环境/排障 | `docs/ops/` | `<topic>.md` |
| 废弃/已移除文档 | `docs/archive/` | 保留原文件名 |

模板在 `docs/templates/`。

### 10.3 硬性规则

- 所有文档带 YAML front matter：`type/id/status/date/updated/tags/related`，格式见 `docs/README.md`。
- 文件名 ASCII kebab-case + 日期；一个文件一个主题。
- 实现前先写设计（`draft`），评审后 `approved`；实现后改 `implemented` 并补变更记录。
- 变更记录必须有 `## 移除清单`：删除的文件/模块/接口/表/配置逐项写路径、原因、替代、迁移影响；没有写“无”。
- 新增/改状态/归档文档后，同步更新 `docs/README.md` 索引表。
- 废弃文档移入 `docs/archive/` 并标 `archived`，不要直接删除。
- 文档只写结论、契约、取舍、验证；不要整段复制源码。
- 讨论中的备选方案写进设计文档“备选方案与取舍”，不要只留在聊天记录。
- 纯机械改动可省略设计文档，但变更记录不能省。

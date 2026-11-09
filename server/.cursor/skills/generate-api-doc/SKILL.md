---
name: generate-api-doc
description: >-
  为 wx-nest 项目的 NestJS 业务模块生成接口调用说明文档（Markdown）。
  保存到 .plans/api/ 目录，含入参、响应、错误码、curl 示例。
  当用户要求生成接口文档、API 调用说明、接口使用说明，或 @src/modules/<name> 并要求写文档时使用。
---

# 生成模块接口调用文档

为 `wx-nest` 项目的 NestJS 模块生成**面向调用方**的接口文档，输出到 `.plans/api/`。

**参考样例：** [.plans/api/child模块接口调用说明.md](../../../.plans/api/child模块接口调用说明.md)

**文档模板：** [template.md](template.md)

---

## 执行流程

按顺序完成，生成前**必须先读代码**，禁止凭猜测写文档。

```
任务进度：
- [ ] 1. 定位模块源码
- [ ] 2. 收集接口与数据模型信息
- [ ] 3. 收集项目通用约定
- [ ] 4. 按模板撰写文档
- [ ] 5. 自检质量
```

### Step 1：定位模块

用户通常通过 `@src/modules/<module>` 指定模块。确认以下文件：

| 优先级 | 路径 | 用途 |
|---|---|---|
| 必须 | `src/modules/<module>/*.controller.ts` | 路由、HTTP 方法、Swagger 注解 |
| 必须 | `src/modules/<module>/dto/*.ts` | 入参/出参字段、校验规则、`@ApiProperty` |
| 必须 | `src/modules/<module>/services/*.service.ts` | 业务逻辑、权限、异常、默认值 |
| 可选 | `src/modules/<module>/entities/*.ts` | 字段含义、关联关系 |
| 可选 | `.plans/specs/SPEC-*-<module>模块*.md` | 设计意图、边界说明 |

### Step 2：收集接口信息

从 Controller 提取每个端点：

- HTTP 方法 + 路径（`@Controller` 前缀 + 方法路由）
- `@ApiOperation` summary → 接口中文名
- `@ApiTags` → Swagger Tag
- `@Public()` 是否存在 → 是否免鉴权
- `@ApiBearerAuth()` → 是否需要 JWT
- 入参：`@Body` DTO、`@Param`、`@Query`、`@Req` 使用的 `req.user` 字段
- 返回类型：`Promise<SuccessResult<T>>` 中的 `T`（或分页 `PaginatedResult`）

从 Service 补充**代码里才有**的信息：

- 权限校验逻辑（403/404 触发条件）
- 默认值（如 `dto.xxx ?? 'default'`）
- 事务/副作用（自动建组、软删除等）
- 抛出的异常类型与 message

从 DTO 提取每个字段：

- 类型、是否必填（`@IsOptional` / `@IsNotEmpty`）
- 校验（`@MaxLength`、`@IsEnum` 等）
- `@ApiProperty` 的 description、example、nullable

### Step 3：收集项目通用约定

**首次生成或通用章节缺失时**，读取以下文件（后续模块可复用同一套描述）：

| 文件 | 内容 |
|---|---|
| `src/common/response/result.ts` | 成功/失败响应信封结构 |
| `src/common/response/error-code.util.ts` | `errorCode` 枚举 |
| `src/common/response/all-exceptions.filter.ts` | 异常如何映射为失败响应 |
| `src/main.ts` | 端口、Swagger 路径（`/api-docs`）、是否有全局前缀 |
| `src/modules/auth/` | 登录接口、Token 获取方式、`req.user` 结构 |

通用约定章节在各模块文档中**保持一致**；若 `.plans/api/` 下已有其他模块文档，优先对齐已有写法。

### Step 4：撰写文档

**输出路径：** `.plans/api/<module>模块接口调用说明.md`

- `<module>` 使用模块目录名（如 `child`、`course`、`family`）
- 若目录不存在，先 `mkdir -p .plans/api`
- 使用 [template.md](template.md) 作为结构骨架，用实际内容替换占位符
- 文档语言：**中文**
- 每个接口必须包含：请求头、路径/查询/Body 参数表、成功响应 JSON 示例、业务说明、错误表、curl 示例

### Step 5：自检

生成后逐项核对：

- [ ] 接口数量与 Controller 一致，无遗漏、无臆造路由
- [ ] 每个 DTO 字段的类型、必填、校验与代码一致
- [ ] 成功响应套在 `{ code: 0, data, timestamp }` 信封内
- [ ] 错误码与 `ErrorCode` 枚举一致
- [ ] 权限/鉴权描述与 Service 实际逻辑一致
- [ ] curl 示例路径、方法、Header 正确
- [ ] 概述中的核心业务行为来自 Service，非泛泛而谈

---

## 章节编写要点

### 概述（第 1 节）

- 1～2 句话说明模块职责
- 列出**调用方需要知道的**核心行为（自动建组、软删除、越权规则等）
- 不写实现细节（如用了哪个 Dao）

### 通用约定（第 2 节）

各模块文档结构相同，包含：

1. **基础地址** — 端口、`Content-Type`、路径前缀
2. **鉴权** — `Authorization: Bearer <accessToken>`；说明 `req.user` 与本模块相关的字段
3. **统一响应格式** — 成功体、失败体、常见 `errorCode` 表

若该模块有 `@Public()` 接口，在鉴权小节单独说明。

### 数据模型（第 3 节）

为模块涉及的每个 DTO 建一个小节：

- 响应 DTO（如 `XxxDto`）
- 创建请求 DTO（如 `CreateXxxDto`）
- 更新请求 DTO（如 `UpdateXxxDto`，注明 `PartialType` 关系）
- 其他 Query DTO

每个字段用表格：字段名 | 类型 | 必填 | 校验规则 | 说明

### 接口详情（第 4 节）

每个端点一个 `### 4.x` 小节，**固定子结构**：

```
#### 基本信息表（方法/路径/鉴权）
#### 请求头
#### 路径参数（无则写「无」）
#### 查询参数（无则写「无」）
#### 请求体 + 字段表 + JSON 示例
#### 成功响应（HTTP Status、data 类型、JSON 示例）
#### 业务说明（来自 Service 逻辑）
#### 可能的错误（HTTP Status | errorCode | error 示例 | 触发场景）
#### 调用示例（curl）
```

### 典型调用流程（第 5 节）

- 用 mermaid `sequenceDiagram` 描述主要业务路径
- 仅画**调用方视角**的交互，不涉及内部类名

### 注意事项（第 6 节）

- ID 为 bigint 字符串
- 不可由客户端指定的字段
- 软删除/级联等业务约束
- 关联模块的影响

### 版本信息（第 7 节）

| 版本 | 日期 | 说明 |
|---|---|---|
| 1.0 | YYYY-MM-DD | 初始版本，基于 `src/modules/<module>` 当前实现生成 |

---

## 项目特有约定（wx-nest）

生成文档时必须体现：

1. **响应信封**：成功 `code === 0`；失败 `code` 为 HTTP 状态码，`data` 恒为 `null`
2. **鉴权默认开启**：`AppModule` 全局 `JwtAuthGuard`；仅 `@Public()` 接口免鉴权
3. **当前用户**：`req.user` 为 `FamilyMemberDto`（经 `JwtStrategy.validate` 查库返回），常用 `id`、`groupId`
4. **ID 类型**：数据库 `bigint`，API 以 `string` 传输
5. **Swagger**：在线文档 `/api-docs`，注明对应 `@ApiTags`
6. **包管理器**：pnpm（文档中不涉及安装，但不要在文档里写 npm）

---

## 触发示例

用户说：

> `@src/modules/course` 生成接口调用文档，保存到 `.plans/api`

执行：

1. 读取 `src/modules/course/` 下 controller、service、dto
2. 读取 `src/common/response/` 通用约定
3. 查找 `.plans/specs/SPEC-005-course模块接口设计.md`（若存在）
4. 生成 `.plans/api/course模块接口调用说明.md`
5. 对照 Controller 路由数量做自检

---

## 不要做的事

- 不要只抄 Swagger 注解而不读 Service（会漏掉权限、默认值、副作用）
- 不要编造不存在的接口或字段
- 不要把开发计划（IMPL/SPEC）整篇复制进 API 文档
- 不要在 API 文档里写 commit、部署、数据库迁移步骤
- 不要为用户未要求的其他模块批量生成文档（除非用户明确要求）

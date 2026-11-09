# 项目文档与上下文

本目录保存项目的**决策、方案、变更、运维知识**，目标只有一个：让人或 AI 在固定路径下快速找回“为什么这样做、做了什么、删了什么、怎么验证”。

代码回答“现在是什么”，本目录回答“为什么变成这样、过程中放弃了什么”。

---

## 1. 检索顺序

处理任何任务前，按以下顺序读：

1. 根 `AGENTS.md`（项目边界、命令、硬性约定）
2. 本文件 `docs/README.md`（唯一索引）
3. `docs/decisions/`（长期决策，ADR）
4. `docs/designs/`（方案、技术设计、实施拆分）
5. `docs/changes/`（实际改动、移除清单、验证结果）
6. `docs/ops/`（部署、环境、排障）
7. `docs/archive/`（已废弃/已移除的历史文档）
8. 源码

只按目录找还不够时，用 front matter 检索：

```bash
# 找所有未实现的设计
grep -rl "status: approved" docs/designs

# 找某主题的全部文档
grep -rl "tags:.*auth" docs

# 找“移除”记录
grep -rn "## .*移除" docs/changes
```

---

## 2. 目录结构

```text
docs/
├── README.md                 # 本文件：规范 + 索引（唯一入口）
├── decisions/                # ADR：长期有效的架构/技术决策
├── designs/                  # 方案设计：实现前讨论、接口设计、取舍
├── changes/                  # 变更记录：实现后落盘，含新增/修改/移除/验证
├── ops/                      # 运维：部署、环境变量、排障、回滚
├── archive/                  # 已废弃或已移除功能的文档
└── templates/                # 三类文档模板
```

---

## 3. 文档类型与命名

| 类型 | 目录 | 命名 | 何时写 | 典型内容 |
|---|---|---|---|---|
| ADR | `docs/decisions/` | `ADR-0001-<slug>.md` | 做出会影响后续实现的决策时 | 背景、决策、备选方案、后果 |
| 设计 | `docs/designs/` | `YYYY-MM-DD-<slug>.md` | 实现前讨论方案时 | 目标、方案、接口/表变更、风险、验证计划 |
| 变更 | `docs/changes/` | `YYYY-MM-DD-<slug>.md` | 代码合并/交付后 | 做了什么、改了什么、**移除了什么**、验证结果 |
| 运维 | `docs/ops/` | `<topic>.md` | 部署/环境/排障流程变化时 | 命令、配置、故障处理、回滚 |

命名规则：

- 文件名使用 **ASCII kebab-case**，不写中文、空格、大写。
- 设计/变更使用日期前缀 `YYYY-MM-DD`（按 `Asia/Shanghai`）。
- 一个文件只讲一个主题；不要把多个不相关改动塞进 `misc.md`。
- 同一方案迭代时**更新原设计文档**并改 `updated`，不要生成 `v2`；只有被新方案取代时才新建文档，并把旧文档标为 `superseded`。

---

## 4. Front matter（必填）

所有文档开头必须有 YAML front matter，便于 AI 精确检索：

```yaml
---
type: design          # adr | design | change | ops | reference
id: DESIGN-20261109-example
status: draft         # 见下方状态表
date: 2026-11-09
updated: 2026-11-09
tags: [auth, api]
related: []
---
```

- `id`：`<TYPE>-<YYYYMMDD>-<slug>`；ADR 使用 `ADR-0001` 顺序编号。
- `related`：相关文档的相对路径，例如 `[decisions/ADR-0001-docs-context-structure.md]`。
- `tags`：小写英文关键词，2～5 个，便于 grep。

状态取值：

| 类型 | 可用状态 |
|---|---|
| `adr` | `proposed` → `accepted` / `rejected`；失效时 `superseded` |
| `design` | `draft` → `approved` → `implemented`；被取代时 `superseded`；废弃时 `archived` |
| `change` | `implemented` / `rolled-back` |
| `ops` / `reference` | `active` / `archived` |

---

## 5. 生命周期

```text
讨论方案 → docs/designs/（draft）
        → 评审通过（approved）
        → 实施
        → docs/changes/（implemented）+ 设计文档改 implemented
        → 索引表更新

长期决策 → docs/decisions/（accepted）
        → 新决策取代时，旧 ADR 改 superseded，新 ADR 的 related 指向旧文

功能移除 → change 文档写明移除清单
        → 原设计/运维文档移到 docs/archive/，status 改 archived
```

硬性规则：

1. **先有方案文档，再进入实现**；纯机械改动（改名、格式化）可省略设计文档，但仍要写变更记录。
2. **实现完成后必须补变更记录**，不能只靠 commit message。
3. 变更记录必须有 `## 移除清单`；没有移除就明确写“无”。
4. 删除或废弃文档时先移到 `archive/`，不要直接删；`docs/README.md` 索引同步更新。
5. 文档只写结论、契约、取舍、验证；不要整段复制源码。
6. 讨论中出现的备选方案写进设计文档的“备选方案与取舍”，不要只留在对话里。

---

## 6. “移除”必须记录什么

任何被删除或替换的内容，都要在对应变更文档中逐项写清：

| 字段 | 说明 |
|---|---|
| 路径/标识 | 文件、模块、接口、数据表、配置项、页面 |
| 原用途 | 它之前负责什么 |
| 移除原因 | 为什么不再需要 |
| 替代方案 | 新实现/新接口/新配置；没有则写“无替代” |
| 迁移影响 | 调用方、数据、部署、兼容性需要做什么 |
| 验证方式 | 如何确认移除后没有残留引用 |

示例：

```markdown
### 移除
| 路径/标识 | 原用途 | 原因 | 替代 | 迁移影响 |
|---|---|---|---|---|
| `src/modules/family/` | 家庭组管理 | 当前脚手架无此业务 | 无 | 无调用方 |
```

---

## 7. 索引

新增、改状态、归档文档后，必须同步更新下表。

### 7.1 决策（ADR）

| 编号 | 标题 | 状态 | 日期 |
|---|---|---|---|
| [ADR-0001](decisions/ADR-0001-docs-context-structure.md) | 建立 `docs/` 分层文档与上下文体系 | accepted | 2026-11-09 |

### 7.2 设计

| 日期 | 文档 | 状态 | 摘要 |
|---|---|---|---|
| - | 暂无 | - | 实现前新增到 `docs/designs/` |

### 7.3 变更

| 日期 | 文档 | 状态 | 摘要 |
|---|---|---|---|
| 2026-11-09 | [建立文档与上下文基线](changes/2026-11-09-docs-context-baseline.md) | implemented | 新增 `docs/`、模板、ADR 与根 `AGENTS.md`；标记旧后端文档过时；无代码改动 |

### 7.4 运维 / 归档

| 类型 | 文档 | 状态 | 摘要 |
|---|---|---|---|
| ops | 暂无 | - | 部署/环境/排障文档放 `docs/ops/` |
| archive | 暂无 | - | 废弃文档放 `docs/archive/` |

---

## 8. 模板

- [设计文档模板](templates/design.md)
- [变更记录模板](templates/change-log.md)
- [ADR 模板](templates/adr.md)

复制模板后修改 front matter 的 `id`、`date`、`updated`、`tags`、`related`。

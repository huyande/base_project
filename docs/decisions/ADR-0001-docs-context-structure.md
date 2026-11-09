---
type: adr
id: ADR-0001
status: accepted
date: 2026-11-09
updated: 2026-11-09
tags: [docs, context, process]
related:
  - ../changes/2026-11-09-docs-context-baseline.md
---

# ADR-0001: 建立 `docs/` 分层文档与上下文体系

## 状态

`accepted`

## 背景

项目由 `server/`（NestJS）与 `mini/`（微信小程序）组成，当前没有统一的需求/方案/变更记录位置。已有文档存在两类问题：

- 根目录只有 `AGENTS.md`，只描述现状，无法保留“为什么这样设计、放弃了哪些方案”。
- `server/AGENTS.md`、`server/CLAUDE.md`、`server/.cursor/skills/` 描述的是已删除的业务模块，容易误导后续 AI。

后续会产生方案讨论、接口设计、实现记录、移除说明，需要固定目录和模板，便于人和 AI 检索。

## 决策

在根目录建立 `docs/`，按文档生命周期分层：

```text
docs/
├── README.md       # 规范 + 唯一索引
├── decisions/      # ADR：长期决策
├── designs/        # 方案/技术设计（实现前）
├── changes/        # 变更记录（实现后，含移除清单）
├── ops/            # 部署/环境/排障
├── archive/        # 已废弃/已移除文档
└── templates/      # 模板
```

约束：

1. 所有文档带 YAML front matter（`type/id/status/date/tags/related`）。
2. 设计文档在实现前创建，状态从 `draft` 到 `approved` 到 `implemented`。
3. 实现后必须在 `changes/` 写变更记录，并包含“移除清单”。
4. `docs/README.md` 是唯一索引，新增/改状态/归档文档时同步更新。
5. 根 `AGENTS.md` 负责指向本目录并规定维护义务。

## 备选方案

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| A. 只维护根 `AGENTS.md` | 文件少、入口直接 | 无法保留历史与备选方案；越写越长；变更和现状混在一起 | 放弃 |
| B. 外部 Wiki / 在线文档 | 富文本、易分享 | 与代码分离，AI 无法保证检索到；容易过期 | 放弃 |
| C. `server/`、`mini/` 各自建 docs | 就近 | 跨端契约（登录、响应信封、存储键）无处放；索引分裂 | 放弃 |
| D. 根目录 `docs/` 分层 + 单一索引 | 与代码同仓、可 grep、生命周期清晰、跨端契约集中 | 每次变更多写一份记录 | 采用 |

## 后果

### 正面

- AI 可按固定顺序检索，不依赖对话记忆。
- 方案取舍、移除原因、验证结果可追溯。
- 跨端契约有明确存放位置。

### 负面 / 代价

- 每个非机械改动需要额外维护设计/变更文档。
- 索引需要人工同步，存在短期不一致风险；因此把“更新索引”写成硬性规则。

### 后续约束

- 新文档必须从 `docs/templates/` 复制。
- 废弃文档移入 `archive/`，不直接删除。
- 变更记录没有“移除清单”视为未完成。

## 关联

- 根 `AGENTS.md` 第 10 节
- `docs/README.md`
- `docs/changes/2026-11-09-docs-context-baseline.md`

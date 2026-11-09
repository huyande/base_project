---
type: change
id: CHANGE-20261109-docs-context-baseline
status: implemented
date: 2026-11-09
updated: 2026-11-09
tags: [docs, context, agents]
related:
  - ../decisions/ADR-0001-docs-context-structure.md
---

# 建立文档与上下文基线

## 1. 背景与目标

- 对应设计文档：无（基础设施改动，决策见 ADR-0001）
- 要解决的问题：方案讨论、实现记录、移除说明没有固定落盘位置；旧后端文档与实际代码不一致。
- 本次范围：新增根 `docs/` 文档体系、模板、索引；更新根 `AGENTS.md` 并加入文档维护义务。**不修改业务代码。**

## 2. 结论

采用 `docs/` 分层结构保存 ADR、设计、变更、运维与归档文档；根 `AGENTS.md` 作为 AI 首要入口并强制要求方案/变更落盘。旧 `server/AGENTS.md`、`server/CLAUDE.md`、`server/.cursor/skills/generate-api-doc/` 被标记为过时，但本轮未删除。

## 3. 变更清单

### 3.1 新增

| 路径/标识 | 说明 |
|---|---|
| `docs/README.md` | 文档规范、检索顺序、命名、front matter、生命周期、索引 |
| `docs/templates/design.md` | 设计文档模板 |
| `docs/templates/change-log.md` | 变更记录模板（含移除清单） |
| `docs/templates/adr.md` | ADR 模板 |
| `docs/decisions/ADR-0001-docs-context-structure.md` | 采用 `docs/` 分层结构的决策 |
| `docs/changes/2026-11-09-docs-context-baseline.md` | 本文件 |
| `docs/designs/.gitkeep`、`docs/ops/.gitkeep`、`docs/archive/.gitkeep` | 占位，保证空目录可被版本控制保留 |

### 3.2 修改

| 路径/标识 | 原行为 | 新行为 |
|---|---|---|
| `AGENTS.md` | 仅覆盖 `server/` / `mini/` 现状与规范 | 增加 `docs/` 目录结构、文档维护流程与第 10 节强制规则 |

### 3.3 移除

**无。** 本轮未删除任何代码、配置或文档。

说明：根 `AGENTS.md` 将以下内容标记为“已过时、与代码冲突时以根文件为准”，但不是物理删除：

- `server/AGENTS.md`
- `server/CLAUDE.md`
- `server/.cursor/skills/generate-api-doc/` 中基于已删除业务模块的约定

### 3.4 修复

| 问题 | 根因 | 修复 |
|---|---|---|
| 旧文档把 `family` / `child` / `course` / `BaseEntity` 描述为现有能力 | 脚手架裁剪后文档未同步 | 根 `AGENTS.md` 明确标注过时，并写清当前真实功能边界 |

## 4. 影响面

- **API**：无。
- **数据库**：无。
- **配置/环境变量**：无。
- **小程序**：无。
- **部署**：无。

## 5. 验证

| 检查 | 命令/操作 | 结果 |
|---|---|---|
| 文档事实核对 | 对照 `server/src`、`mini/` 实际代码与配置 | 通过 |
| 目录与索引 | 核对 `docs/README.md` 中的相对链接 | 通过 |
| 构建/测试 | 未运行 | 仅文档变更，不涉及运行时 |

未覆盖/未验证：无（本轮没有行为变更）。

## 6. 回滚

- 代码回滚：删除新增的 `AGENTS.md` 与 `docs/` 即可。
- 数据回滚：无。
- 配置回滚：无。

## 7. 相关文档

- ADR：`docs/decisions/ADR-0001-docs-context-structure.md`
- 索引：`docs/README.md`

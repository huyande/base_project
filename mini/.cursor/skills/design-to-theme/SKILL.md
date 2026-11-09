---
name: design-to-theme
description: >-
  Apply a design.md (design-token spec) to the project's global theme in
  styles/. Use when the user provides a design.md / design token file / 主题
  spec (frontmatter with colors / typography / rounded / spacing + prose
  sections) and asks to change / apply / 变更 / 应用 the theme, brand colors,
  or design tokens. Runs a two-phase flow: first a read-only mapping report
  (token map, px->rpx conversion table, typography bucketing, diff preview)
  for the user to confirm, then rewrites styles/variables.wxss and adjusts
  styles/mixins.wxss while preserving the adjustable font-size
  (--font-scale + calc) mechanism and rpx units.
---

# design.md → 全局主题（变更 styles/）

把一份 `design.md`（设计令牌规范）落到本项目全局主题：**重写 `styles/variables.wxss`（令牌层）** 并 **按需调整 `styles/mixins.wxss`（可复用类）**。本项目是脚手架，令牌命名与 mixin 可以**重新设计**，但两条红线必须守住：

1. **字号可调机制不变**：字号仍是 6 档 `--font-size-*`，且每档必须为 `calc(基准rpx * var(--font-scale))`，`--font-scale` 默认 1（详见 `utils/font-size.js` + 页面 `page-meta`）。
2. **尺寸单位用 rpx**：不做多端设备适配，靠 rpx + flex 自适应。

## 两阶段流程（强制）

```
- [ ] 阶段一：只读解析 design.md + 现有 styles → 产出映射报告（写成文件）→ 停下等确认
- [ ] 阶段二：用户确认后 → 重写 variables.wxss + 调整 mixins.wxss
```

**阶段一只读**：只解析 `design.md`、读现有 `styles/`、产出报告，**不写主题文件**（只写报告文件）。必须等用户确认令牌映射与字号分档，才进入阶段二。

---

## design.md 的结构

YAML frontmatter + 说明性正文：

- **frontmatter**：
  - `colors`：M3 风格命名（`surface` / `on-surface` / `primary` / `primary-container` / `outline` / `error` …），值为 hex。
  - `typography`：语义字级（`display-lg` / `headline-lg` / `headline-md` / `body-lg` / `body-md` / `label-md` / `label-sm` …），含 `fontSize`(px) / `fontWeight` / `lineHeight` / `fontFamily` / `letterSpacing`。
  - `rounded`：圆角（rem / px / `full`）。
  - `spacing`：间距（px，含 `base/xs/sm/md/lg/xl/gutter/margin-*`）。
- **正文**：Brand & Style / Colors / Typography / Layout / Elevation / Shapes / Components 等，含**组件级规范**（按钮 pill、卡片 16px 圆角、chip、input、progress、阴影层级等）——阶段二调 `mixins.wxss` 时以此为准。

---

## 阶段一：解析与映射

### 1. 解析 design.md

读取 frontmatter 四组令牌 + 正文的组件/阴影规范。正文里的具体数值（如阴影 `0px 4px 20px rgba(0,0,0,0.04)`、按钮 pill 半径、card padding）也要提取，供 mixins 阶段使用。

### 2. 读现有 styles（对比基线）

- `styles/variables.wxss`：现有令牌分类（颜色 / 背景 / 文本 / 边框 / 间距 / 字号+font-scale / 圆角 / 阴影 / 过渡 / z-index）。
- `styles/mixins.wxss`：现有可复用类（`.card-mixin` / `.button-*` / `.tag-*` / `.input-mixin` / `.flex-*` / `.text-ellipsis*` 等）。
- 扫描令牌**消费方**：`components/`、`pages/`、`app.wxss` 里 `var(--xxx)` 的使用，评估改名影响面（决定是否保留兼容别名）。

### 3. 单位换算规则（固定）

- **px → rpx：×2**（750 设计宽基准）。例：`16px → 32rpx`。
- **rem → rpx：×16×2 = ×32**（rem 以 16px 为基）。例：`1rem → 32rpx`，`0.25rem → 8rpx`，`1.5rem → 48rpx`。
- `full: 9999px` → `9999rpx`。
- **颜色**：hex 原样保留，不换算。
- **字体族（fontFamily）**：**忽略**（小程序不打包自定义字体，不设 `--font-family` 令牌，也不生成 loadFontFace）。`fontWeight` / `lineHeight` 可保留为令牌或就地用。

### 4. 颜色令牌映射（M3 → 项目）

把 design.md 的 M3 色映射为项目令牌。因是脚手架，**可重新设计命名**——推荐直接采用 M3 语义命名作为新的规范令牌集，保留项目机制令牌（间距/圆角/阴影/字号/过渡/z-index）。参考映射：

| design.md (M3) | 建议项目令牌 | 说明 |
|---|---|---|
| `primary` | `--primary-color` | 主色/主行动/进度 |
| `primary-container` | `--primary-container` | 主色容器 |
| `on-primary` | `--on-primary` | 主色上文本 |
| `secondary` / `tertiary` | `--secondary-color` / `--tertiary-color` | 次/第三色（tertiary 多为新增）|
| `error` / `error-container` | `--error-color` / `--error-container` | 错误 |
| `background` / `surface` | `--bg-page` / `--bg-primary` | 页面底 / 卡片面 |
| `surface-container-*` | `--bg-*`（低→高分层）| 容器分层 |
| `on-surface` | `--text-primary` | 主文本 |
| `on-surface-variant` | `--text-secondary` | 次文本/元信息 |
| `outline` / `outline-variant` | `--border-color` / `--border-light` | 边框 |
| `inverse-surface` / `inverse-on-surface` | `--bg-inverse` / `--text-inverse` | 反色 |

> `surface-container-*`、`*-fixed`、`inverse-*` 等冷门 M3 令牌：**确属会被用到**才纳入；纯凑数的删掉，避免令牌爆炸（在报告"待确认"里列出）。

### 5. 字号映射（保留可调机制，收敛到 6 档）

- design.md 的多个语义字级（8+ 个）→ **就近归并到 6 档** `--font-size-*`（xs / sm / md / lg / xl / xxl）。
- **基准值来自 design.md**（px×2），**不是**沿用旧的小基准。去重后按从小到大取 6 档；相近的合并（在报告里列清哪几个合到同一档）。
- 每档写成 `calc(基准rpx * var(--font-scale))`，保留 `--font-scale: 1;` 兜底。
- `--font-size-md` 作为正文默认（对应 design.md 的 `body-md`/`body-lg`），`app.wxss` 里 `page { font-size: var(--font-size-md) }` 不动。
- `fontWeight` → 保留/更新 `--font-weight-*`（normal/medium/bold）。`lineHeight` 可选设 `--line-height-*` 或就地用。

示例（用本 design.md：11/13/15/17/20/24/32/40px → ×2 → 22/26/30/34/40/48/64/80rpx，收敛 6 档）：

| 档位 | 语义来源 | 基准 rpx |
|---|---|---|
| xs | label-sm 11px | 22rpx |
| sm | label-md 13px | 26rpx |
| md | body-md 15px（正文默认）| 30rpx |
| lg | body-lg 17px / headline-md 20px | 34rpx |
| xl | headline-lg-mobile 24px | 48rpx |
| xxl | headline-lg 32px / display-lg 40px | 64rpx |

> 具体合档由报告列出、用户确认（如 lg 到底取 34 还是 40）。

### 6. 间距 / 圆角 / 阴影映射

- **间距**：design.md `spacing`(px) ×2 → rpx，落到 `--spacing-*`。本 design.md：base4→8rpx, xs8→16, sm12→24, md16→32, lg24→48, xl32→64；`gutter/margin-*` 如通用则加令牌，否则略。
- **圆角**：`rounded`(rem/px) 换算 → `--border-radius-*`（sm/md/lg/xl + round/full）。本 design.md：sm0.25rem→8rpx, DEFAULT0.5rem→16rpx, md0.75rem→24rpx, lg1rem→32rpx, xl1.5rem→48rpx, full→9999rpx。
- **阴影**：从正文 Elevation 提取 → `--shadow-*`。px×2 换 rpx。本 design.md：Level1 `0 8rpx 40rpx rgba(0,0,0,0.04)`、Level2 `0 24rpx 64rpx rgba(0,0,0,0.08)`。

### 7. 产出映射报告（写成文件，然后停下）

写入 `docs/design-sync/theme-<name>.md`（取 frontmatter `name`，目录不存在则建），并在对话给出摘要 + 文件路径。报告须含下列表格 + 末尾"待确认"，等用户确认后再进阶段二。

报告模板：

```markdown
## 主题变更映射：<name>

### 颜色令牌映射
| design.md | 值 | 项目令牌 | 处理(复用/新增/删) |
|---|---|---|---|
| primary | #2b6c00 | --primary-color | 改值 |
| tertiary | #005bc1 | --tertiary-color | 新增 |

### 字号分档（保留 calc(*var(--font-scale))）
| 档位 | 语义来源 | px | 基准rpx |
|---|---|---|---|
| md | body-md | 15 | 30 |

### 间距 / 圆角 / 阴影
| 类别 | design.md | 换算 | 令牌 |
|---|---|---|---|
| spacing.md | 16px | 32rpx | --spacing-md |
| rounded.lg | 1rem | 32rpx | --border-radius-lg |
| Level1 阴影 | 0 4px 20px .04 | 0 8rpx 40rpx | --shadow-sm |

### mixins 调整清单
| 类 | 变更 | 依据(design.md 正文) |
|---|---|---|
| .button-primary | 改 pill 圆角 + 2px 底部 offset | Buttons: Pill-shaped, tactile |
| .card-mixin | 圆角 32rpx, 去边框, 用 Level1 阴影 | Cards: 16px radius, no border |
| .chip / .tag-* | 圆角 16rpx, 10% 底色 | Chips/Tags |

### 影响面（消费方）
- 改名令牌 X 被 components/navigation-bar 使用 N 处 → 建议保留别名 / 或同步改。

### 待确认
1. 是否采用 M3 全量命名，还是仅映射到现有名？
2. lg 档基准取 34rpx 还是 40rpx？
3. 是否纳入 surface-container-* / *-fixed 等 M3 令牌？
4. 改名令牌是否保留兼容别名（避免改 components/pages）？
```

---

## 阶段二：应用（用户确认后）

### 落地顺序

```
- [ ] 1. 重写 styles/variables.wxss（按确认的令牌集；保留 --font-scale 机制与分类结构）
- [ ] 2. 调整 styles/mixins.wxss（按 design.md 组件规范：按钮/卡片/输入/chip/进度条等）
- [ ] 3. 若改了令牌名：更新消费方 或 在 variables.wxss 末尾加兼容别名块
- [ ] 4. 自检清单逐项核对
```

### variables.wxss 规范

- 仍写在 `page { ... }` 下，分类注释保留（颜色 / 背景 / 文本 / 边框 / 间距 / 字号 / 圆角 / 阴影 / 过渡 / z-index）。
- **字号块必须**：先 `--font-scale: 1;`，再 6 档 `--font-size-*: calc(基准rpx * var(--font-scale));`。
- 尺寸一律 rpx；颜色 hex。
- 过渡 `--transition-*`、`--z-*` 若 design.md 未涉及则原样保留。
- 若保留旧名兼容：文件末尾加一段别名，如 `--bg-secondary: var(--bg-page);`，并注释"兼容别名，逐步迁移"。

### mixins.wxss 规范（按 design.md 正文）

依据本 design.md 的 Components/Shapes/Elevation 规范：

- **按钮**：pill 圆角（用 `--border-radius-full` 或 24px→48rpx）；primary 用 `--primary-color` + `--on-primary`，可加 2rpx 底部深色 offset（tactile）；secondary 白底 + Level1 阴影。触摸态用 `:active`（不用 `:hover`）。
- **卡片 `.card-mixin`**：`--bg-primary` 白面、`--border-radius-lg`(32rpx)、**去 1px 边框**、用 `--shadow-sm`(Level1)、padding `--spacing-md`。
- **输入 `.input-mixin`**：圆角 24rpx（12px×2），`--bg-primary`，2rpx `--bg-page` 描边或 inset 阴影；label 用 `--font-size-sm` + `--text-secondary`。
- **chip / tag**：圆角 16rpx（8px×2），浅色底（分类色 10% 透明）+ 饱和文字。
- **进度条**：轨道 pill 圆角 + `--bg-page`，指示 `--primary-color`，高 ≥24rpx。
- 分隔：白底上需要分隔时用 1rpx `--bg-page` 描边，不用中性灰。

只改与 design.md 规范相关的类；布局类（`.flex-*`）、`.text-ellipsis*` 等无需动。

## 完成自检

```
- [ ] 字号：6 档 --font-size-* 均为 calc(基准rpx * var(--font-scale))，--font-scale 兜底存在
- [ ] 单位：新增/改动尺寸全用 rpx（px×2 / rem×32）
- [ ] 颜色：design.md 色已落地，无遗漏的关键语义色
- [ ] 令牌未爆炸：冷门 M3 令牌仅按需纳入
- [ ] 改名令牌：消费方已同步 或 已加兼容别名，不破坏现有 components/pages
- [ ] mixins：按钮 pill / 卡片圆角去边 / chip 圆角 等已按 design.md 调整
- [ ] app.wxss 的 page 默认 font-size 仍指向 --font-size-md
- [ ] 忽略自定义字体，未引入 font-family 打包/加载
```

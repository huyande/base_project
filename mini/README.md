# 微信小程序初始化脚手架

一个通用的微信小程序基础框架，内置双通道请求、本地存储、用户字号调整与样式令牌，供后续各类小程序在其上快速开发。

## 特性

- **双通道请求**：`http`（`wx.request`）与 `cloud`（`wx.cloud.callContainer`）两种通道，adapter 化设计，可运行时切换，通道与环境解耦。
- **统一配置**：所有环境/通道/COS/存储前缀集中在 `config/env.js`。
- **本地存储**：统一前缀、过期缓存管理，同步 `get` 与异步 `getAsync`。
- **字号调整**：用户可调字号（小/标准/大/特大），通过 `page-meta` 全局生效，默认档位在 `config/env.js` 配置。
- **样式系统**：CSS 变量令牌 + 样式混入（可复用类），尺寸用 rpx 自适应。
- **可开关日志**：`utils/logger.js` 由 `config/env.js` 的 `debug` 控制。

## 目录结构

```
├── config/
│   └── env.js            # 统一配置（通道/HTTP/云托管/COS/存储前缀/调试开关）
├── components/
│   └── navigation-bar/   # 通用自定义导航栏
├── pages/
│   ├── launch/            # 启动页（静默登录 + 路由分发）
│   ├── index/             # 首页（占位）
│   └── wellcome/          # 欢迎页（登录入口）
├── styles/
│   ├── variables.wxss    # CSS 变量令牌（含 --font-scale）
│   └── mixins.wxss       # 样式混入（按钮/卡片/flex/标签等可复用类）
├── utils/
│   ├── request.js        # 请求客户端（双通道 + 拦截器 + 重试 + 统一错误）
│   ├── api.js            # 接口路径声明与薄封装
│   ├── storage.js        # 本地存储
│   ├── font-size.js      # 用户字号管理（管理器 + 页面 mixin + 组件 Behavior）
│   ├── constants.js      # 通用常量
│   ├── logger.js         # 可开关日志
│   ├── util.js           # 通用工具函数
│   ├── cos-config.js     # COS 配置
│   └── cos-uploader.js   # COS 上传
├── app.js / app.json / app.wxss
```

## 快速开始

### 1. 环境准备
- 微信开发者工具
- 小程序基础库版本 >= 3.0.0

### 2. 配置 `config/env.js`
```javascript
module.exports = {
  channel: 'http',   // 'http' 用 wx.request；'cloud' 用 wx.cloud.callContainer
  debug: true,       // 生产环境置 false
  timeout: 10000,
  retryTimes: 3,
  retryDelay: 1000,
  http: { baseURL: 'http://127.0.0.1', basePath: '' },
  cloud: { env: '', service: '', basePath: '' },
  devOpenId: '',
  storagePrefix: 'app_',
  cos: { bucket: '', region: '', basePath: 'uploads/' },
}
```
> 通道与环境解耦：生产也可用 http（真实域名），开发也可连云托管。
> 云环境 ID、bucket、openid 等敏感值建议加入 `.gitignore`，并用 `env.example.js` 作为模板。

## 核心用法

### 请求
```javascript
const { get, post, setChannel } = require('./utils/api.js')

const data = await get('/some/list')
const result = await post('/some/action', { id: 1 })

setChannel('cloud') // 运行时切换到云托管通道
```

### 存储
```javascript
const { storageManager } = require('./utils/storage.js')

storageManager.set('userInfo', { name: '张三' })
const userInfo = storageManager.get('userInfo')
const async = await storageManager.getAsync('userInfo')

// 带过期时间的缓存（键以 cache_ 开头或显式传 expire）
storageManager.set('cache_list', listData, { expire: 24 * 60 * 60 * 1000 })
```

### 字号调整（用户可调，全局生效）
原理：字号 token 定义为 `calc(基准 * var(--font-scale))`。运行时用 `page-meta` 把 `--font-scale`
设到页面 `page` 节点上，整页所有使用 `var(--font-size-*)` 的文本自动继承缩放——**无需给每个 view 加 class**。
默认档位在 `config/env.js` 的 `fontScale` 配置，用户调整后覆盖并持久化。

页面接入（在自己的 onLoad/onUnload 各调一行，不覆盖你的生命周期）：
```javascript
const fontSize = require('../../utils/font-size.js')
Page({
  data: {},
  onLoad() { fontSize.bindPage(this) },   // 注册监听 + 写入 data.fontScale
  onUnload() { fontSize.unbindPage(this) },
})
```
```xml
<!-- 页面顶层，仅此一行；整页自动跟随 -->
<page-meta page-style="--font-scale: {{fontScale}};"></page-meta>
```

组件里如需读取当前缩放，也可用 Behavior：
```javascript
const { fontScaleBehavior } = require('../../utils/font-size.js')
Component({ behaviors: [fontScaleBehavior] }) // 提供 data.fontScale
```

设置字号（如设置页）：
```javascript
const fontSize = require('../../utils/font-size.js')
fontSize.getAvailable()      // [{ key, name, value, current }]
fontSize.setScale('large')   // 'small' | 'normal' | 'large' | 'xlarge'
```

### 样式令牌
```css
.my-card {
  color: var(--text-primary);
  background: var(--bg-primary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-md); /* 自动随用户字号缩放 */
}
```

## 扩展开发

1. 新增页面：在 `pages/` 下创建目录，并在 `app.json` 的 `pages` 注册。
2. 新增组件：在 `components/` 下创建，使用 `properties` 定义属性、`triggerEvent` 触发事件。
3. 新增接口：在 `utils/api.js` 的 `API_PATHS` 声明路径，用便捷方法或语义化 `api.*` 调用。
4. 扩展工具：在 `utils/` 下按单一职责添加，保持通用、无业务耦合。

## 约定

- 命名：页面/组件用 kebab-case，工具用 camelCase。
- 模块：`utils/` 统一 CommonJS（`require` / `module.exports`）。
- 配置：一切环境/密钥走 `config/env.js`，不散落、不硬编码入库。
- 框架层保持零业务：`utils`、`components` 不出现具体业务词。

## 许可证

MIT

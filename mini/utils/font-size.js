/**
 * 用户字号管理
 * 负责字号档位的读取/设置/持久化/广播，并提供页面 mixin 与组件 Behavior。
 *
 * 推荐用法（全局生效，无需给每个 view 加 class）：
 *   在页面顶层放一个 page-meta，把 --font-scale 设到 page 节点上，整页自动继承。
 *
 *   // page.js —— 在你自己的 onLoad/onUnload 里各调一行，不覆盖你的生命周期
 *   const fontSize = require('../../utils/font-size.js')
 *   Page({
 *     onLoad() { fontSize.bindPage(this) }, // 你的逻辑
 *     onUnload() { fontSize.unbindPage(this) },
 *   })
 *
 *   // page.wxml（页面顶层，仅此一行）
 *   <page-meta page-style="--font-scale: {{fontScale}};"></page-meta>
 *
 * 组件用 behaviors: [fontScaleBehavior]（behaviors 生命周期是合并调用，不会冲突）。
 * 默认档位来自 config/env.js 的 fontScale，用户调整后覆盖并持久化。
 */

const config = require('../config/env.js')
const { storageManager } = require('./storage.js')
const { STORAGE_KEYS } = require('./constants.js')

// 字号档位（value 为缩放系数）
const FONT_SCALES = {
  small: { value: 0.9, name: '小' },
  normal: { value: 1, name: '标准' },
  large: { value: 1.15, name: '大' },
  xlarge: { value: 1.3, name: '特大' },
}

const STORAGE_KEY = STORAGE_KEYS.FONT_SCALE
const DEFAULT_SCALE = FONT_SCALES[config.fontScale] ? config.fontScale : 'normal'

let currentScale = null
const listeners = []

function getScale() {
  if (currentScale) return currentScale
  const stored = storageManager.get(STORAGE_KEY, DEFAULT_SCALE)
  currentScale = FONT_SCALES[stored] ? stored : DEFAULT_SCALE
  return currentScale
}

// 供 page-meta page-style 使用的数值（如 1.15）
function getScaleValue(scale = getScale()) {
  return (FONT_SCALES[scale] || FONT_SCALES.normal).value
}

function setScale(scale) {
  if (!FONT_SCALES[scale]) return false
  currentScale = scale
  storageManager.set(STORAGE_KEY, scale)
  listeners.forEach((fn) => {
    try {
      fn(scale)
    } catch (e) {
      // 忽略单个监听器错误
    }
  })
  return true
}

function addListener(fn) {
  if (typeof fn === 'function') listeners.push(fn)
}

function removeListener(fn) {
  const i = listeners.indexOf(fn)
  if (i > -1) listeners.splice(i, 1)
}

// 可用档位列表（用于设置页渲染）
function getAvailable() {
  const cur = getScale()
  return Object.keys(FONT_SCALES).map((key) => ({
    key,
    value: FONT_SCALES[key].value,
    name: FONT_SCALES[key].name,
    current: key === cur,
  }))
}

// 页面接入：在页面 onLoad 里调用，注册监听并写入 data.fontScale（数值）。
// 用显式函数而非对象混入，避免与页面自己的 onLoad 相互覆盖。
function bindPage(page) {
  page._fontScaleListener = () => {
    page.setData({ fontScale: getScaleValue() })
  }
  addListener(page._fontScaleListener)
  page.setData({ fontScale: getScaleValue() })
}

// 页面 onUnload 里调用，移除监听，避免内存泄漏。
function unbindPage(page) {
  if (page._fontScaleListener) removeListener(page._fontScaleListener)
}

// 组件 Behavior：等价能力，供自定义组件使用
const fontScaleBehavior = Behavior({
  data: {
    fontScale: getScaleValue(),
  },
  lifetimes: {
    attached() {
      this._fontScaleListener = () => {
        this.setData({ fontScale: getScaleValue() })
      }
      addListener(this._fontScaleListener)
      this.setData({ fontScale: getScaleValue() })
    },
    detached() {
      if (this._fontScaleListener) removeListener(this._fontScaleListener)
    },
  },
})

module.exports = {
  FONT_SCALES,
  getScale,
  getScaleValue,
  setScale,
  getAvailable,
  addListener,
  removeListener,
  bindPage,
  unbindPage,
  fontScaleBehavior,
}

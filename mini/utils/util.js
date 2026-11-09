/**
 * 通用工具函数
 * 提供常用的工具方法
 */

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取数组中的唯一值
 * @param {Array} array 数组
 * @returns {Array} 去重后的数组
 */
export function getUniqueArray(array) {
  return [...new Set(array)]
}

/**
 * 按属性对数组进行分组
 * @param {Array} array 数组
 * @param {string} key 分组键
 * @returns {Object} 分组后的对象
 */
export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key]
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
    return groups
  }, {})
}

/**
 * 数组排序
 * @param {Array} array 数组
 * @param {string} key 排序键
 * @param {string} order 排序顺序 'asc' | 'desc'
 * @returns {Array} 排序后的数组
 */
export function sortArray(array, key, order = 'asc') {
  return array.sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) {
      return order === 'asc' ? -1 : 1
    }
    if (aVal > bVal) {
      return order === 'asc' ? 1 : -1
    }
    return 0
  })
}


/**
 * 安全的JSON解析
 * @param {string} jsonString JSON字符串
 * @param {any} defaultValue 默认值
 * @returns {any} 解析结果
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('JSON解析失败:', error)
    return defaultValue
  }
}

/**
 * 安全的JSON字符串化
 * @param {any} obj 要字符串化的对象
 * @param {string} defaultValue 默认值
 * @returns {string} JSON字符串
 */
export function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj)
  } catch (error) {
    console.error('JSON字符串化失败:', error)
    return defaultValue
  }
}

/**
 * 显示Toast消息
 * @param {string} title 消息内容
 * @param {string} icon 图标类型
 * @param {number} duration 显示时长
 */
export function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration
  })
}

/**
 * 显示加载提示
 * @param {string} title 提示内容
 */
export function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
export function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示确认对话框
 * @param {string} content 对话框内容
 * @param {string} title 对话框标题
 * @returns {Promise<boolean>} 用户选择结果
 */
export function showConfirm(content, title = '确认') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 页面跳转
 * @param {string} url 页面路径
 * @param {Object} params 参数对象
 */
export function navigateTo(url, params = {}) {
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const finalUrl = queryString ? `${url}?${queryString}` : url
  
  wx.navigateTo({
    url: finalUrl,
    fail: (error) => {
      console.error('页面跳转失败:', error)
      showToast('页面跳转失败')
    }
  })
}

/**
 * 页面重定向
 * @param {string} url 页面路径
 * @param {Object} params 参数对象
 */
export function redirectTo(url, params = {}) {
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const finalUrl = queryString ? `${url}?${queryString}` : url
  
  wx.redirectTo({
    url: finalUrl,
    fail: (error) => {
      console.error('页面重定向失败:', error)
      showToast('页面跳转失败')
    }
  })
}

/**
 * 返回上一页
 * @param {number} delta 返回层数
 */
export function navigateBack(delta = 1) {
  wx.navigateBack({
    delta,
    fail: (error) => {
      console.error('页面返回失败:', error)
    }
  })
}

/**
 * 切换 Tab 页
 * @param {string} url Tab 页面路径
 */
export function switchTab(url) {
  wx.switchTab({
    url,
    fail: (error) => {
      console.error('Tab 切换失败:', error)
      showToast('页面跳转失败')
    }
  })
}

const { WEEKDAY_OPTIONS } = require('./constants.js')

/**
 * UI weekday（美区 0=周日…6=周六）→ picker 下标（周一…周日）
 * @param {number} weekday
 * @returns {number}
 */
function weekdayToPickerIndex(weekday) {
  const day = Number(weekday)
  return day === 0 ? 6 : day - 1
}

/**
 * picker 下标（周一…周日）→ UI weekday（美区 0=周日…6=周六）
 * @param {number} index
 * @returns {number}
 */
function pickerIndexToWeekday(index) {
  return (Number(index) + 1) % 7
}

/**
 * 根据 UI weekday 取中文标签
 * @param {number} weekday
 * @returns {string}
 */
function getWeekdayLabel(weekday) {
  return WEEKDAY_OPTIONS[weekdayToPickerIndex(weekday)] || WEEKDAY_OPTIONS[5]
}

module.exports = {
  formatFileSize,
  getUniqueArray,
  groupBy,
  sortArray,
  safeJsonParse,
  safeJsonStringify,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  navigateTo,
  redirectTo,
  navigateBack,
  switchTab,
  weekdayToPickerIndex,
  pickerIndexToWeekday,
  getWeekdayLabel,
}
/**
 * 通用常量定义
 * 仅保留与具体业务无关的脚手架常量，业务枚举请在各自项目中另建文件。
 */

// 存储键名（通用）
const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_INFO: 'userInfo',
  FONT_SCALE: 'fontScale',
  LAST_LOGIN_TIME: 'lastLoginTime',
}

// 错误消息（通用 HTTP/网络）
const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  TIMEOUT_ERROR: '请求超时，请稍后重试',
  SERVER_ERROR: '服务器错误，请稍后重试',
  UNAUTHORIZED: '未授权访问，请重新登录',
  FORBIDDEN: '访问被拒绝，权限不足',
  NOT_FOUND: '请求的资源不存在',
  BUSINESS_ERROR: '操作失败，请稍后重试',
  UNKNOWN_ERROR: '未知错误，请稍后重试',
}

// 成功消息（通用）
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  LOGOUT_SUCCESS: '退出成功',
  DATA_SAVED: '数据保存成功',
  DATA_UPDATED: '数据更新成功',
}

// 分页设置
const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
}

// 常用正则
const REGEX_PATTERNS = {
  PHONE: /^1[3-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME: /^[\u4e00-\u9fa5a-zA-Z\s]{2,20}$/,
}

// 动画持续时间
const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
}

// 防抖延迟
const DEBOUNCE_DELAY = {
  SEARCH: 300,
  INPUT: 500,
  SCROLL: 100,
}

// 页面路由
const BUSINESS_ROUTES = {
  LAUNCH: '/pages/launch/launch',
  WELLCOME: '/pages/wellcome/wellcome',
  INDEX: '/pages/index/index',
}

module.exports = {
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
  REGEX_PATTERNS,
  ANIMATION_DURATION,
  DEBOUNCE_DELAY,
  BUSINESS_ROUTES,
}

/**
 * API 层
 * 统一管理接口路径，并对底层 request 客户端做薄封装。
 * 使用方式二选一：
 *   1) 直接用便捷方法：const { get, post } = require('./api.js')
 *   2) 用语义化接口：  const { api } = require('./api.js'); api.auth.login()
 */

const request = require('./request.js')
const { get, post, put, patch, upload } = request
const del = request.delete

/**
 * API 路径常量
 */
const API_PATHS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // 文件上传相关
  FILE: {
    STS: '/wx/cos/sts',
  },
}

/**
 * 语义化 API
 */
const api = {
  auth: {
    login: (data) => post(API_PATHS.AUTH.LOGIN, data || {}),
    refresh: (data) => post(API_PATHS.AUTH.REFRESH, data || {}),
    logout: () => post(API_PATHS.AUTH.LOGOUT),
  },
  file: {
    getSTS: (bucket, region) => get(`${API_PATHS.FILE.STS}?bucket=${bucket}&region=${region}`),
  },
}

module.exports = {
  API_PATHS,
  api,

  // 透传底层便捷方法与客户端，保证文档示例可直接使用
  get,
  post,
  put,
  patch,
  del,
  upload,
  apiClient: request.apiClient,
  setChannel: request.setChannel,
  getChannel: request.getChannel,
  setEnvironment: request.setEnvironment,
  getCurrentEnvironment: request.getCurrentEnvironment,
}

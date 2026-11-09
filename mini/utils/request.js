/**
 * 请求客户端
 * 双通道设计：
 *   - http  : wx.request（本地/真实域名）
 *   - cloud : wx.cloud.callContainer（微信云托管）
 *
 * 两种通道各自只负责“发送并归一化为 { statusCode, data }”（见 httpAdapter / cloudAdapter），
 * 拦截器、业务码判断、错误处理、重试、Toast 等共享逻辑只在主流程实现一次，避免重复与行为不一致。
 */

const config = require('../config/env.js')
const logger = require('./logger.js')

const STATUS_CODES = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NETWORK_ERROR: -1,
}

const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

function createError(type, message, data = null) {
  const error = new Error(message)
  error.type = type
  error.data = data
  return error
}

const TOKEN_KEY = config.storagePrefix + 'token'

class APIClient {
  constructor(options = {}) {
    this.config = {
      channel: config.channel,
      debug: config.debug,
      timeout: config.timeout,
      retryTimes: config.retryTimes,
      retryDelay: config.retryDelay,
      http: { ...config.http },
      http_prod: { ...(config.http_prod || {}) },
      cloud: { ...config.cloud },
      ...options,
    }
    this.requestInterceptors = []
    this.isRedirectingToLaunch = false
    this.setupDefaultInterceptors()
  }

  /**
   * 设置请求通道
   * @param {'http'|'cloud'} channel
   */
  setChannel(channel) {
    if (channel === 'http' ||channel === 'http_prod' || channel === 'cloud' ) {
      this.config.channel = channel
      logger.log('请求通道已切换为:', channel)
    } else {
      logger.error('无效的请求通道:', channel)
    }
  }

  getChannel() {
    return this.config.channel
  }

  // 向后兼容旧 API：dev -> http，pro -> cloud
  setEnvironment(env) {
    this.setChannel(env === 'pro' ? 'cloud' : 'http')
  }

  getCurrentEnvironment() {
    return this.config.channel === 'cloud' ? 'pro' : 'dev'
  }

  addRequestInterceptor(interceptor) {
    if (typeof interceptor === 'function') this.requestInterceptors.push(interceptor)
  }

  setupDefaultInterceptors() {
    this.addRequestInterceptor((cfg) => {
      cfg.header = { 'content-type': 'application/json', ...cfg.header }

      const token = wx.getStorageSync(TOKEN_KEY)
      if (token) cfg.header['Authorization'] = `Bearer ${token}`

      // 开发期（http 通道 + debug）注入测试 openid
      if (this.config.channel === 'http' && this.config.debug && this.config.devOpenId) {
        cfg.header['X-WX-OPENID'] = this.config.devOpenId
      }
      return cfg
    })
  }

  runRequestInterceptors(cfg) {
    return this.requestInterceptors.reduce((c, fn) => fn(c) || c, cfg)
  }

  /**
   * 业务错误判定 —— 后端统一信封 { code, data, timestamp }，code !== 0 为业务错误
   */
  isBusinessError(data) {
    return !!(data && typeof data.code === 'number' && data.code !== 0)
  }

  getBusinessMessage(data) {
    return (data && (data.error || data.message)) || '业务处理失败'
  }

  /**
   * 解包业务响应信封，无信封时原样返回。
   * 分页接口（含 meta）返回 { data, meta }，其余仍只返回 data。
   */
  unwrapResponse(data) {
    if (data && typeof data.code === 'number' && 'data' in data) {
      if (data.meta != null) {
        return { data: data.data, meta: data.meta }
      }
      return data.data
    }
    return data
  }

  // ---------- 通道适配器：只负责发送并归一化为 { statusCode, data } ----------

  httpAdapter(cfg) {
    const http = this.config.channel === 'http_prod' ? this.config.http_prod : this.config.http
    const { timeout } = this.config
    return new Promise((resolve, reject) => {
      wx.request({
        url: http.baseURL + http.basePath + cfg.url,
        method: cfg.method,
        data: cfg.data,
        header: cfg.header,
        timeout: cfg.timeout || timeout,
        success: (res) => resolve({ statusCode: Number(res.statusCode), data: res.data }),
        fail: reject,
      })
    })
  }

  async cloudAdapter(cfg) {
    const { cloud } = this.config
    const res = await wx.cloud.callContainer({
      config: { env: cloud.env },
      path: cloud.basePath + cfg.url,
      method: cfg.method,
      data: cfg.data,
      header: { 'X-WX-SERVICE': cloud.service, ...cfg.header },
    })
    // callContainer 在部分基础库下 statusCode 可能为字符串，统一成 number
    return {
      statusCode: Number(res.statusCode),
      data: res.data,
      errCode: res.errCode,
    }
  }

  getAdapter() {
    return this.config.channel === 'cloud'
      ? this.cloudAdapter.bind(this)
      : this.httpAdapter.bind(this)
  }

  // ---------- 主流程：共享逻辑只写一次 ----------

  async request(cfg) {
    const finalCfg = this.runRequestInterceptors({ method: 'GET', header: {}, data: {}, ...cfg })
    logger.log('API Request:', this.config.channel, finalCfg.method, finalCfg.url)

    const adapter = this.getAdapter()
    const res = await this.withRetry(() => adapter(finalCfg))
    return this.handleResult(res, finalCfg)
  }

  /**
   * 裸请求：走拦截器与业务信封，但跳过 401 自动刷新（供 refreshAuth 等内部调用）
   */
  async rawRequest(cfg) {
    const finalCfg = this.runRequestInterceptors({
      method: 'GET',
      header: {},
      data: {},
      skipAuthRefresh: true,
      ...cfg,
    })
    logger.log('API RawRequest:', this.config.channel, finalCfg.method, finalCfg.url)

    const adapter = this.getAdapter()
    const res = await this.withRetry(() => adapter(finalCfg))
    return this.handleResult(res, finalCfg)
  }

  async withRetry(sender, retryCount = 0) {
    try {
      return await sender()
    } catch (error) {
      if (retryCount < this.config.retryTimes && this.shouldRetry(error)) {
        logger.warn(`请求失败，${this.config.retryDelay}ms 后进行第 ${retryCount + 1} 次重试`)
        await this.delay(this.config.retryDelay)
        return this.withRetry(sender, retryCount + 1)
      }
      throw this.normalizeError(error)
    }
  }

  /**
   * 统一处理响应：网络层错误 -> HTTP 状态码 -> 业务码，Toast 只弹一次
   * @param {object} res
   * @param {object} [cfg] 原始请求配置（用于 401 刷新重放）
   */
  async handleResult(res, cfg = {}) {
    logger.log('API Response:', res && res.statusCode)

    // 云托管网络层错误
    if (res && res.errCode === -1) {
      wx.showToast({ title: '网络异常', icon: 'none' })
      throw createError(ERROR_TYPES.NETWORK_ERROR, '网络异常', res)
    }

    // HTTP 状态码错误（统一 Number，兼容 callContainer 返回字符串 statusCode）
    const statusCode = res && res.statusCode != null ? Number(res.statusCode) : 0
    if (statusCode && (statusCode < 200 || statusCode >= 300)) {
      return this.handleHttpStatus({ ...res, statusCode }, cfg)
    }

    const data = res ? res.data : null
    if (data && this.isBusinessError(data)) {
      const message = this.getBusinessMessage(data)
      wx.showToast({ title: message, icon: 'none' })
      throw createError(ERROR_TYPES.BUSINESS_ERROR, message, data)
    }

    return this.unwrapResponse(data)
  }

  isAuthWhitelistUrl(cfg = {}) {
    const url = cfg.url || ''
    return url.indexOf('/auth/login') !== -1 || url.indexOf('/auth/refresh') !== -1
  }

  canAttemptRefresh(cfg = {}) {
    if (cfg.skipAuthRefresh || cfg._retriedAfterRefresh) return false
    if (this.isAuthWhitelistUrl(cfg)) return false
    try {
      // 懒加载，避免 request → auth → api → request 循环依赖拿到空 exports
      const auth = require('../services/auth.js')
      return !!auth.getRefreshToken()
    } catch (e) {
      return false
    }
  }

  async refreshAndRetry(cfg) {
    const auth = require('../services/auth.js')
    try {
      await auth.refreshAuth()
    } catch (e) {
      const err = new Error('TOKEN_REFRESH_FAILED')
      err.isRefreshFailure = true
      err.cause = e
      throw err
    }

    const token = wx.getStorageSync(TOKEN_KEY)
    const retryCfg = {
      ...cfg,
      header: {
        ...(cfg.header || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      _retriedAfterRefresh: true,
    }

    logger.log('API Retry after refresh:', retryCfg.method, retryCfg.url)
    const adapter = this.getAdapter()
    const res = await this.withRetry(() => adapter(retryCfg))
    return this.handleResult(res, retryCfg)
  }

  /**
   * 鉴权失败收尾：清登录态 + reLaunch 启动页（防抖）
   */
  failAuth(res, message) {
    const auth = require('../services/auth.js')
    auth.clearAuth()

    const finalMessage = message || '登录已过期'
    if (!this.isRedirectingToLaunch) {
      this.isRedirectingToLaunch = true
      wx.showToast({ title: finalMessage, icon: 'none' })
      wx.reLaunch({ url: '/pages/launch/launch' })
      setTimeout(() => {
        this.isRedirectingToLaunch = false
      }, 2000)
    }

    throw createError(ERROR_TYPES.BUSINESS_ERROR, finalMessage, res)
  }

  async handleHttpStatus(res, cfg = {}) {
    const code = Number(res.statusCode)
    const body = res.data
    const bodyMessage = body && (body.error || body.message)
    let type = ERROR_TYPES.SERVER_ERROR
    let message = bodyMessage || '服务器错误'

    if (code === 401) {
      // 裸请求：直接抛错，不刷新、不跳转（由 refreshAuth 外层处理）
      if (cfg.skipAuthRefresh) {
        throw createError(ERROR_TYPES.BUSINESS_ERROR, bodyMessage || '未授权访问', res)
      }

      // 可刷新：单例刷新后重放原请求
      if (this.canAttemptRefresh(cfg)) {
        logger.log('API 401 → attempt token refresh:', cfg.method, cfg.url)
        try {
          return await this.refreshAndRetry(cfg)
        } catch (error) {
          if (error && error.isRefreshFailure) {
            return this.failAuth(res, bodyMessage || '登录已过期')
          }
          throw error
        }
      }

      // 已重试仍 401，或业务接口无 refresh → 收尾到 launch
      if (cfg._retriedAfterRefresh || !this.isAuthWhitelistUrl(cfg)) {
        return this.failAuth(res, bodyMessage || '登录已过期')
      }

      // 白名单 auth 接口（如 login）401：仅提示，不跳转
      type = ERROR_TYPES.BUSINESS_ERROR
      message = bodyMessage || '未授权访问'
      wx.showToast({ title: message, icon: 'none' })
      throw createError(type, message, res)
    } else if (code === 403) {
      type = ERROR_TYPES.BUSINESS_ERROR
      message = bodyMessage || '访问被拒绝'
    } else if (code === 404) {
      type = ERROR_TYPES.BUSINESS_ERROR
      message = bodyMessage || '请求的资源不存在'
    } else if (code === 409) {
      type = ERROR_TYPES.BUSINESS_ERROR
      message = bodyMessage || '资源冲突'
    } else if (code >= 500) {
      type = ERROR_TYPES.SERVER_ERROR
      message = bodyMessage || '服务器错误'
    }

    wx.showToast({ title: message, icon: 'none' })
    throw createError(type, message, res)
  }

  normalizeError(error) {
    // 已经是本客户端产生的错误则直接透传，避免二次包装/二次 Toast
    if (error && error.type) return error

    let type = ERROR_TYPES.UNKNOWN_ERROR
    let message = '未知错误'

    if (error && error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        type = ERROR_TYPES.TIMEOUT_ERROR
        message = '请求超时'
      } else if (error.errMsg.includes('fail')) {
        type = ERROR_TYPES.NETWORK_ERROR
        message = '网络连接失败'
      }
    }

    logger.error('API Error:', error)
    wx.showToast({ title: message, icon: 'none' })
    return createError(type, message, error)
  }

  shouldRetry(error) {
    return !!(error && error.errMsg && (error.errMsg.includes('timeout') || error.errMsg.includes('fail')))
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ---------- 便捷方法 ----------

  get(url, params = {}, config = {}) {
    return this.request({ url, method: 'GET', data: params, ...config })
  }

  post(url, data = {}, config = {}) {
    return this.request({ url, method: 'POST', data, ...config })
  }

  put(url, data = {}, config = {}) {
    return this.request({ url, method: 'PUT', data, ...config })
  }

  patch(url, data = {}, config = {}) {
    return this.request({ url, method: 'PATCH', data, ...config })
  }

  delete(url, config = {}) {
    return this.request({ url, method: 'DELETE', ...config })
  }

  // ---------- 上传：按通道分发 ----------

  upload(url, filePath, formData = {}, cfg = {}) {
    const finalCfg = this.runRequestInterceptors({ url, method: 'POST', header: {}, ...cfg })
    if (this.config.channel === 'cloud') {
      return this.cloudUpload(url, filePath, formData, finalCfg)
    }
    return this.httpUpload(url, filePath, formData, finalCfg)
  }

  httpUpload(url, filePath, formData, cfg) {
    const http = this.config.channel === 'http_prod' ? this.config.http_prod : this.config.http
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: http.baseURL + http.basePath + url,
        filePath,
        name: cfg.name || 'file',
        formData,
        header: cfg.header,
        success: (res) => {
          try {
            const data = res.data ? JSON.parse(res.data) : null
            resolve(this.handleResult({ statusCode: res.statusCode, data }, cfg))
          } catch (e) {
            reject(e && e.type ? e : createError(ERROR_TYPES.UNKNOWN_ERROR, '响应解析失败', e))
          }
        },
        fail: (error) => reject(this.normalizeError(error)),
      })
    })
  }

  // 云托管上传需按后端协议实现（callContainer 或云存储 wx.cloud.uploadFile），
  // 此处不再使用裸 wx.uploadFile（云托管无普通域名会失败）。
  cloudUpload(url, filePath, formData) {
    logger.warn('云托管通道的 upload 需按后端协议实现（callContainer 或 wx.cloud.uploadFile）')
    return Promise.reject(
      createError(ERROR_TYPES.UNKNOWN_ERROR, '云托管上传未实现，请按后端协议补充', { url, filePath, formData })
    )
  }
}

/**
 * 云函数调用
 * @param {string} name 云函数名称
 * @param {object} data 请求数据
 */
function callCloudFunction(name, data) {
  return wx.cloud.callFunction({ name, data }).then((res) => res.result)
}

const apiClient = new APIClient()

module.exports = {
  APIClient,
  apiClient,
  STATUS_CODES,
  ERROR_TYPES,

  // 便捷方法
  get: (url, params, config) => apiClient.get(url, params, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  patch: (url, data, config) => apiClient.patch(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
  upload: (url, filePath, formData, config) => apiClient.upload(url, filePath, formData, config),
  rawRequest: (cfg) => apiClient.rawRequest(cfg),

  // 云函数
  callCloudFunction,

  // 通道切换（推荐）
  setChannel: (channel) => apiClient.setChannel(channel),
  getChannel: () => apiClient.getChannel(),

  // 兼容旧命名
  setEnvironment: (env) => apiClient.setEnvironment(env),
  getCurrentEnvironment: () => apiClient.getCurrentEnvironment(),
}

/**
 * 静默登录与用户状态管理
 */

const config = require('../config/env.js')
const logger = require('../utils/logger.js')
const { api, API_PATHS } = require('../utils/api.js')
const { storageManager } = require('../utils/storage.js')
const { STORAGE_KEYS } = require('../utils/constants.js')

const TOKEN_KEY = config.storagePrefix + STORAGE_KEYS.TOKEN

let loginPromise = null
let refreshPromise = null

/**
 * 保存登录态
 * @param {{ accessToken?: string, refreshToken?: string, user?: object }} data
 */
function saveAuthData(data = {}) {
  if (data.accessToken) {
    wx.setStorageSync(TOKEN_KEY, data.accessToken)
  }

  if (data.refreshToken) {
    storageManager.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken)
  }

  const app = getApp()

  if (data.user) {
    storageManager.set(STORAGE_KEYS.USER_INFO, data.user)
    if (app) {
      app.globalData.userInfo = data.user
    }
  }
}

/**
 * 读取本地 refreshToken
 */
function getRefreshToken() {
  return storageManager.get(STORAGE_KEYS.REFRESH_TOKEN)
}

/**
 * 清除 access / refresh 登录态（不做页面跳转）
 */
function clearAuth() {
  try {
    wx.removeStorageSync(TOKEN_KEY)
  } catch (e) {
    // ignore
  }
  storageManager.remove(STORAGE_KEYS.REFRESH_TOKEN)
  storageManager.remove(STORAGE_KEYS.USER_INFO)
}

/**
 * 调用 wx.login 获取 code
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('wx.login 未返回 code'))
        }
      },
      fail: reject,
    })
  })
}

/**
 * 静默登录：wx.login + 后端登录接口
 */
async function silentLogin() {
  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    try {
      const code = await wxLogin()
      const res = await api.auth.login({ code })

      const authData = {
        accessToken: res?.accessToken,
        refreshToken: res?.refreshToken,
        user: res?.user,
      }
      if (authData.accessToken) {
        saveAuthData(authData)
      }
      return authData
    } catch (error) {
      logger.error('静默登录失败:', error)
      throw error
    } finally {
      loginPromise = null
    }
  })()

  return loginPromise
}

/**
 * 用 refreshToken 换取新的 accessToken + refreshToken（单例，防并发轮换冲突）
 * 使用裸请求，不走 401 自动刷新，避免死循环。
 */
async function refreshAuth() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new Error('缺少 refreshToken')
      }

      // 懒加载，避免与 request → auth 形成顶层循环依赖
      const { apiClient } = require('../utils/request.js')
      const data = await apiClient.rawRequest({
        url: API_PATHS.AUTH.REFRESH,
        method: 'POST',
        data: { refreshToken },
      })

      if (!data || !data.accessToken || !data.refreshToken) {
        throw new Error('刷新 Token 响应无效')
      }

      saveAuthData({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      return data
    } catch (error) {
      logger.error('刷新 Token 失败:', error)
      throw error
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

module.exports = {
  saveAuthData,
  clearAuth,
  getRefreshToken,
  silentLogin,
  refreshAuth,
}

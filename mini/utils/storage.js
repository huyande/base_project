/**
 * 本地存储工具
 * 统一前缀、支持过期缓存管理。
 * 注意：get 为同步接口；如需异步请使用 getAsync。
 */

const config = require('../config/env.js')
const logger = require('./logger.js')

const STORAGE_CONFIG = {
  prefix: config.storagePrefix, // 存储键前缀（来自统一配置）
  expireKeys: ['cache_'], // 以这些前缀开头的键自动带过期时间
  defaultExpire: 24 * 60 * 60 * 1000, // 默认过期时间 24 小时
}

class StorageManager {
  constructor(cfg = {}) {
    this.config = { ...STORAGE_CONFIG, ...cfg }
  }

  generateKey(key) {
    return this.config.prefix + key
  }

  shouldExpire(key) {
    return this.config.expireKeys.some((p) => key.startsWith(p))
  }

  createExpireData(data, expire = this.config.defaultExpire) {
    return { data, expire: Date.now() + expire, timestamp: Date.now() }
  }

  isExpired(expireData) {
    if (!expireData || typeof expireData !== 'object' || !expireData.expire) return false
    return Date.now() > expireData.expire
  }

  /**
   * 写入（同步）。容量不足时（小程序抛错）自动清理过期数据后重试一次。
   */
  set(key, value, options = {}) {
    const storageKey = this.generateKey(key)
    let finalValue = value

    if (this.shouldExpire(key) || options.expire) {
      finalValue = this.createExpireData(value, options.expire)
    }

    try {
      wx.setStorageSync(storageKey, finalValue)
      return true
    } catch (error) {
      logger.warn('存储失败，尝试清理过期数据后重试:', error)
      this.clearExpired()
      try {
        wx.setStorageSync(storageKey, finalValue)
        return true
      } catch (retryError) {
        logger.error('存储数据失败:', retryError)
        return false
      }
    }
  }

  /**
   * 读取（同步）
   */
  get(key, defaultValue = null) {
    try {
      const value = wx.getStorageSync(this.generateKey(key))
      return this.processGetValue(key, value, defaultValue)
    } catch (error) {
      logger.error('获取存储数据失败:', error)
      return defaultValue
    }
  }

  /**
   * 读取（异步），返回 Promise
   */
  getAsync(key, defaultValue = null) {
    return new Promise((resolve) => {
      wx.getStorage({
        key: this.generateKey(key),
        success: (res) => resolve(this.processGetValue(key, res.data, defaultValue)),
        fail: () => resolve(defaultValue),
      })
    })
  }

  processGetValue(key, value, defaultValue) {
    if (value === '' || value === null || value === undefined) return defaultValue

    if (this.shouldExpire(key) && typeof value === 'object' && value.expire) {
      if (this.isExpired(value)) {
        this.remove(key)
        return defaultValue
      }
      return value.data
    }
    return value
  }

  has(key) {
    return this.get(key, undefined) !== undefined
  }

  remove(key) {
    try {
      wx.removeStorageSync(this.generateKey(key))
      return true
    } catch (error) {
      logger.error('删除存储数据失败:', error)
      return false
    }
  }

  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      logger.error('清空存储数据失败:', error)
      return false
    }
  }

  getKeys() {
    try {
      const info = wx.getStorageInfoSync()
      return info.keys.filter((key) => key.startsWith(this.config.prefix))
    } catch (error) {
      logger.error('获取存储键失败:', error)
      return []
    }
  }

  getInfo() {
    try {
      const info = wx.getStorageInfoSync()
      const keys = info.keys.filter((key) => key.startsWith(this.config.prefix))
      return {
        keys,
        currentSize: info.currentSize, // 单位 KB（微信规范）
        limitSize: info.limitSize, // 单位 KB
        usageRate: info.limitSize
          ? ((info.currentSize / info.limitSize) * 100).toFixed(2) + '%'
          : '0%',
      }
    } catch (error) {
      logger.error('获取存储信息失败:', error)
      return { keys: [], currentSize: 0, limitSize: 0, usageRate: '0%' }
    }
  }

  clearExpired() {
    let clearedCount = 0
    this.getKeys().forEach((storageKey) => {
      const key = storageKey.replace(this.config.prefix, '')
      if (!this.shouldExpire(key)) return
      const value = wx.getStorageSync(storageKey)
      if (value && typeof value === 'object' && value.expire && this.isExpired(value)) {
        wx.removeStorageSync(storageKey)
        clearedCount++
      }
    })
    logger.log(`清理了 ${clearedCount} 条过期数据`)
    return clearedCount
  }

  clearCache() {
    let clearedCount = 0
    this.getKeys().forEach((storageKey) => {
      const key = storageKey.replace(this.config.prefix, '')
      if (key.startsWith('cache_')) {
        wx.removeStorageSync(storageKey)
        clearedCount++
      }
    })
    logger.log(`清理了 ${clearedCount} 条缓存数据`)
    return clearedCount
  }
}

const storageManager = new StorageManager()

module.exports = {
  StorageManager,
  storageManager,

  set: (key, value, options) => storageManager.set(key, value, options),
  get: (key, defaultValue) => storageManager.get(key, defaultValue),
  getAsync: (key, defaultValue) => storageManager.getAsync(key, defaultValue),
  has: (key) => storageManager.has(key),
  remove: (key) => storageManager.remove(key),
  clear: () => storageManager.clear(),
  getKeys: () => storageManager.getKeys(),
  getInfo: () => storageManager.getInfo(),
  clearExpired: () => storageManager.clearExpired(),
  clearCache: () => storageManager.clearCache(),
}

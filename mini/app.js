// app.js
const config = require('./config/env.js')
const logger = require('./utils/logger.js')
const { storageManager } = require('./utils/storage.js')

App({
  onLaunch() {
    logger.log('小程序启动')

    // 配置了云托管环境 ID 时初始化云能力（callContainer / uploadFile 前需 init 一次）
    if (config.cloud.env) {
      wx.cloud.init({ env: config.cloud.env })
    }

    this.initStorageManager()
  },

  /**
   * 静默登录，供启动页调用
   */
  initAuth() {
    const auth = require('./services/auth.js')
    return auth.silentLogin()
  },

  /**
   * 初始化存储管理器
   */
  initStorageManager() {
    try {
      const clearedCount = storageManager.clearExpired()
      logger.log(`清理了 ${clearedCount} 条过期数据`)

      const storageInfo = storageManager.getInfo()
      logger.log('存储信息:', storageInfo)

      if (parseFloat(storageInfo.usageRate) > 80) {
        const cacheCleared = storageManager.clearCache()
        logger.log(`存储使用率过高，清理了 ${cacheCleared} 条缓存数据`)
      }
    } catch (error) {
      logger.error('存储管理器初始化失败:', error)
    }
  },

  onShow() {
    logger.log('应用进入前台')
  },

  onHide() {
    logger.log('应用进入后台')
  },

  onError(error) {
    logger.error('应用发生错误:', error)
  },

  globalData: {
    userInfo: null,
    appVersion: '1.0.0',
  },
})

/**
 * 微信云托管对象存储上传工具
 * 基于 wx.cloud.uploadFile 封装，环境 ID 来自 config/env.js
 */

const envConfig = require('../config/env.js')
const logger = require('./logger')

let cloudReady = false

/**
 * 确保 wx.cloud 已初始化（防御性懒初始化）
 */
function ensureCloudReady(customEnv) {
  const env = customEnv || envConfig.cloud.env
  if (!env) {
    return Promise.reject(new Error('云托管环境 ID 未配置，请在 config/env.js 设置 cloud.env'))
  }
  if (cloudReady) {
    return Promise.resolve()
  }
  wx.cloud.init({ env })
  cloudReady = true
  return Promise.resolve()
}

/**
 * 规范化对象存储路径：去掉前导 /，合并多余斜杠
 * @param {string} path
 * @returns {string}
 */
function normalizeCloudPath(path) {
  return path
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

/**
 * 从本地路径提取文件名
 * @param {string} filePath
 * @returns {string}
 */
function extractFileName(filePath) {
  const segments = filePath.split('/')
  return segments[segments.length - 1] || 'file'
}

/**
 * 生成唯一文件名
 * @param {string} fileName
 * @returns {string}
 */
function generateUniqueFileName(fileName) {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substr(2, 9)
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex > 0) {
    const baseName = fileName.slice(0, dotIndex)
    const ext = fileName.slice(dotIndex + 1)
    return `${baseName}_${timestamp}_${randomStr}.${ext}`
  }
  return `${fileName}_${timestamp}_${randomStr}`
}

/**
 * 生成 cloudPath
 * @param {Object} options
 * @param {string} options.fileName
 * @param {string} [options.folder]
 * @param {string} [options.storageBasePath]
 * @returns {string}
 */
function buildCloudPath({ fileName, folder = '', storageBasePath = 'uploads/' }) {
  const basePath = normalizeCloudPath(storageBasePath)
  const uniqueName = generateUniqueFileName(fileName)
  const parts = []

  if (basePath) {
    parts.push(basePath)
  }
  if (folder) {
    parts.push(normalizeCloudPath(folder))
  }
  parts.push(uniqueName)

  return normalizeCloudPath(parts.join('/'))
}

/**
 * 格式化上传成功结果
 * @param {Object} res wx.cloud.uploadFile success 回调
 * @param {string} cloudPath
 * @returns {Object}
 */
function formatUploadResult(res, cloudPath) {
  return {
    fileID: res.fileID,
    cloudID: res.fileID,
    cloudPath,
    statusCode: res.statusCode,
  }
}

class CloudUploader {
  constructor(config = {}) {
    this.config = {
      env: envConfig.cloud.env,
      storageBasePath: envConfig.cloud.storageBasePath || 'uploads/',
      ...config,
    }
  }

  /**
   * 上传单个文件
   * @param {Object} options
   * @param {string} options.filePath 本地临时文件路径
   * @param {string} [options.cloudPath] 完整对象存储路径，不传则自动生成
   * @param {string} [options.folder] 业务子目录
   * @param {string} [options.fileName] 自定义文件名
   * @param {Function} [options.onProgress] 上传进度回调
   * @returns {Promise<Object>}
   */
  uploadFile(options = {}) {
    const {
      filePath,
      cloudPath: customCloudPath,
      folder = '',
      fileName = '',
      onProgress,
    } = options

    if (!filePath) {
      return Promise.reject(new Error('文件路径不能为空'))
    }

    const env = this.config.env
    if (!env) {
      return Promise.reject(new Error('云托管环境 ID 未配置，请在 config/env.js 设置 cloud.env'))
    }

    const actualFileName = fileName || extractFileName(filePath)
    const cloudPath = customCloudPath
      ? normalizeCloudPath(customCloudPath)
      : buildCloudPath({
          fileName: actualFileName,
          folder,
          storageBasePath: this.config.storageBasePath,
        })

    return ensureCloudReady(env).then(() => new Promise((resolve, reject) => {
      const uploadOptions = {
        cloudPath,
        filePath,
        config: { env },
        success: (res) => {
          const result = formatUploadResult(res, cloudPath)
          logger.log('云托管文件上传成功：', result)
          resolve(result)
        },
        fail: (err) => {
          logger.error('云托管文件上传失败：', err)
          const error = new Error(err.errMsg || '文件上传失败')
          error.raw = err
          reject(error)
        },
      }

      if (typeof onProgress === 'function') {
        uploadOptions.onUploadProgress = (progressEvent) => {
          const progress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: progressEvent.total
              ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
              : 0,
          }
          onProgress(progress)
        }
      }

      wx.cloud.uploadFile(uploadOptions)
    }))
  }

  /**
   * 选择并上传图片
   * @param {Object} options
   * @param {number} [options.count=1]
   * @param {string} [options.folder]
   * @param {Function} [options.onProgress]
   * @returns {Promise<Array>}
   */
  chooseAndUploadImage(options = {}) {
    const {
      count = 1,
      folder = '',
      onProgress,
    } = options

    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        count,
        mediaType: ['image'],
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const filePaths = res.tempFiles.map((file) => file.tempFilePath)
          this.uploadFiles(filePaths, { folder, onProgress })
            .then(resolve)
            .catch(reject)
        },
        fail: (err) => {
          logger.error('选择图片失败：', err)
          reject(err)
        },
      })
    })
  }

  /**
   * 选择并上传文件（聊天文件等）
   * @param {Object} options
   * @param {number} [options.count=1]
   * @param {string} [options.type='all'] 'all' | 'video' | 'image' | 'file'
   * @param {string} [options.folder]
   * @param {Function} [options.onProgress]
   * @returns {Promise<Array>}
   */
  chooseAndUploadFile(options = {}) {
    const {
      count = 1,
      type = 'all',
      folder = '',
      onProgress,
    } = options

    return new Promise((resolve, reject) => {
      wx.chooseMessageFile({
        count,
        type,
        success: (res) => {
          const filePaths = res.tempFiles.map((file) => file.path)
          this.uploadFiles(filePaths, { folder, onProgress })
            .then(resolve)
            .catch(reject)
        },
        fail: (err) => {
          logger.error('选择文件失败：', err)
          reject(err)
        },
      })
    })
  }

  /**
   * 批量上传文件
   * @param {Array<string>} filePaths
   * @param {Object} [options]
   * @param {string} [options.folder]
   * @param {Function} [options.onProgress]
   * @returns {Promise<Array>}
   */
  uploadFiles(filePaths = [], options = {}) {
    const { folder = '', onProgress } = options

    if (!filePaths.length) {
      return Promise.reject(new Error('文件列表不能为空'))
    }

    const uploadPromises = filePaths.map((filePath, index) =>
      this.uploadFile({
        filePath,
        folder,
        onProgress: onProgress
          ? (progress) => onProgress(progress, index)
          : undefined,
      })
    )

    return Promise.all(uploadPromises)
  }

  /**
   * 更新配置
   * @param {Object} config
   */
  setConfig(config) {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   * @returns {Object}
   */
  getConfig() {
    return { ...this.config }
  }
}

const defaultUploader = new CloudUploader()

function uploadFile(options) {
  return defaultUploader.uploadFile(options)
}

function chooseAndUploadImage(options) {
  return defaultUploader.chooseAndUploadImage(options)
}

function chooseAndUploadFile(options) {
  return defaultUploader.chooseAndUploadFile(options)
}

function uploadFiles(filePaths, options) {
  return defaultUploader.uploadFiles(filePaths, options)
}

function setConfig(config) {
  return defaultUploader.setConfig(config)
}

module.exports = {
  CloudUploader,
  uploadFile,
  chooseAndUploadImage,
  chooseAndUploadFile,
  uploadFiles,
  ensureCloudReady,
  setConfig,
  defaultUploader,
  buildCloudPath,
  normalizeCloudPath,
}

/**
 * 腾讯云 COS 文件上传工具
 * 支持微信小程序环境的文件上传功能
 * 
 * @author: AI Assistant
 * @description: 基于 cos-wx-sdk-v5 封装的文件上传工具，支持图片、音频、视频等多种文件类型
 */

const COS = require('cos-wx-sdk-v5');
const { api } = require('./api');
const { getMergedConfig } = require('./cos-config');
const logger = require('./logger');

/**
 * COS 默认配置
 * bucket/region/basePath 来自统一配置（config/env.js -> cos-config），
 * 保证 defaultUploader 开箱可用；文件类型可在此扩展。
 */
const COS_CONFIG = {
  ...getMergedConfig(),
  allowedTypes: {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    audio: ['mp3', 'wav', 'm4a', 'aac'],
    video: ['mp4', 'mov', 'avi', '3gp'],
    document: ['pdf', 'doc', 'docx', 'txt']
  }
};

/**
 * COS 上传器类
 */
class COSUploader {
  constructor(config = {}) {
    this.config = { ...COS_CONFIG, ...config };
    this.cosInstance = null;
    this.initCOS();
  }

  /**
   * 初始化 COS 实例
   */
  initCOS() {
    this.cosInstance = new COS({
      getAuthorization: (options, callback) => {
        this.getTemporaryCredentials(callback);
      }
    });
  }

  /**
   * 获取临时密钥
   * @param {Function} callback 回调函数
   */
  getTemporaryCredentials(callback) {
    api.file.getSTS(this.config.bucket, this.config.region)
      .then(res => {
        const data = res.data || res;
        callback({
          TmpSecretId: data.tmpSecretId,
          TmpSecretKey: data.tmpSecretKey,
          SecurityToken: data.sessionToken,
          StartTime: data.startTime,
          ExpiredTime: data.expiredTime
        });
      })
      .catch(err => {
        logger.error('获取 COS 临时密钥失败:', err);
        callback({ error: err });
      });
  }

  /**
   * 生成文件上传路径
   * @param {String} fileName 文件名
   * @param {String} fileType 文件类型
   * @returns {String} 上传路径
   */
  generateFilePath(fileName, fileType = 'other') {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const fileExt = fileName.split('.').pop().toLowerCase();
    const newFileName = `${timestamp}_${randomStr}.${fileExt}`;

    return `${this.config.basePath}${fileType}/${newFileName}`;
  }

  /**
   * 获取文件类型
   * @param {String} fileName 文件名
   * @returns {String} 文件类型
   */
  getFileType(fileName) {
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    for (const [type, extensions] of Object.entries(this.config.allowedTypes)) {
      if (extensions.includes(fileExt)) {
        return type;
      }
    }
    
    return 'other';
  }

  /**
   * 验证文件类型
   * @param {String} fileName 文件名
   * @returns {Boolean} 是否允许上传
   */
  validateFileType(fileName) {
    const fileType = this.getFileType(fileName);
    return fileType !== 'other';
  }

  /**
   * 上传单个文件
   * @param {Object} options 上传选项
   * @param {String} options.filePath 文件本地路径
   * @param {String} options.fileName 文件名（可选，默认从路径提取）
   * @param {String} options.folder 上传文件夹（可选）
   * @param {Function} options.onProgress 进度回调
   * @param {Function} options.onSuccess 成功回调
   * @param {Function} options.onError 错误回调
   */
  uploadFile(options) {
    const {
      filePath,
      fileName = '',
      folder = '',
      onProgress,
      onSuccess,
      onError
    } = options;

    // 参数验证
    if (!filePath) {
      const error = new Error('文件路径不能为空');
      onError && onError(error);
      return;
    }

    if (!this.config.bucket || !this.config.region) {
      const error = new Error('COS配置不完整，请检查bucket和region配置');
      onError && onError(error);
      return;
    }

    // 提取文件名
    const actualFileName = fileName || filePath.split('/').pop();
    
    // 验证文件类型
    if (!this.validateFileType(actualFileName)) {
      const error = new Error('不支持的文件类型');
      onError && onError(error);
      return;
    }

    // 获取文件类型和生成上传路径
    const fileType = this.getFileType(actualFileName);
    const uploadPath = folder 
      ? `${folder}/${this.generateFilePath(actualFileName, fileType).split('/').pop()}`
      : this.generateFilePath(actualFileName, fileType);

    // 开始上传
    this.cosInstance.postObject({
      Bucket: this.config.bucket,
      Region: this.config.region,
      Key: uploadPath,
      FilePath: filePath,
      onProgress: (progressData) => {
        const progress = {
          loaded: progressData.loaded,
          total: progressData.total,
          percent: Math.round(progressData.loaded / progressData.total * 100)
        };
        onProgress && onProgress(progress);
      }
    }, (err, data) => {
      if (err) {
        logger.error('文件上传失败：', err);
        onError && onError(err);
      } else {
        // 处理 URL 生成：检查 data.Location 是否已包含协议
        let fileUrl = data.Location;
        if (!fileUrl) {
          const error = new Error('上传成功但未返回文件地址');
          logger.error('上传失败：', error);
          onError && onError(error);
          return;
        }
        
        // 如果 Location 不包含协议，添加 https://
        // 腾讯云 COS 返回的 Location 通常是完整 URL，但为了兼容性做检查
        if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
          fileUrl = `https://${fileUrl}`;
        }
        
        const result = {
          url: fileUrl,
          key: data.Key,
          etag: data.ETag,
          location: data.Location
        };
        logger.log('文件上传成功：', result);
        onSuccess && onSuccess(result);
      }
    });
  }

  /**
   * 选择并上传图片
   * @param {Object} options 选项
   * @param {Number} options.count 选择图片数量，默认1
   * @param {String} options.folder 上传文件夹，可选
   * @param {Function} options.onProgress 进度回调
   * @param {Function} options.onSuccess 成功回调
   * @param {Function} options.onError 错误回调
   */
  chooseAndUploadImage(options = {}) {
    const {
      count = 1,
      folder = '',
      onProgress,
      onSuccess,
      onError
    } = options;

    wx.chooseMedia({
      count: count,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePaths = res.tempFiles.map((f) => f.tempFilePath);
        const uploadPromises = filePaths.map((filePath, index) => {
          return new Promise((resolve, reject) => {
            this.uploadFile({
              filePath,
              folder,
              onProgress: (progress) => {
                onProgress && onProgress(progress, index);
              },
              onSuccess: (result) => {
                resolve(result);
              },
              onError: (error) => {
                reject(error);
              }
            });
          });
        });

        Promise.all(uploadPromises)
          .then(results => {
            onSuccess && onSuccess(results);
          })
          .catch(error => {
            onError && onError(error);
          });
      },
      fail: (error) => {
        onError && onError(error);
      }
    });
  }

  /**
   * 选择并上传视频
   * @param {Object} options 选项
   * @param {String} options.folder 上传文件夹，可选
   * @param {Function} options.onProgress 进度回调
   * @param {Function} options.onSuccess 成功回调
   * @param {Function} options.onError 错误回调
   */
  chooseAndUploadVideo(options = {}) {
    const {
      folder = '',
      onProgress,
      onSuccess,
      onError
    } = options;

    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        this.uploadFile({
          filePath: res.tempFiles[0].tempFilePath,
          folder,
          onProgress,
          onSuccess,
          onError
        });
      },
      fail: (error) => {
        onError && onError(error);
      }
    });
  }

  /**
   * 批量上传文件
   * @param {Array} filePaths 文件路径数组
   * @param {Object} options 选项
   * @param {String} options.folder 上传文件夹，可选
   * @param {Function} options.onProgress 进度回调
   * @param {Function} options.onSuccess 成功回调
   * @param {Function} options.onError 错误回调
   */
  uploadFiles(filePaths, options = {}) {
    const {
      folder = '',
      onProgress,
      onSuccess,
      onError
    } = options;

    const uploadPromises = filePaths.map((filePath, index) => {
      return new Promise((resolve, reject) => {
        this.uploadFile({
          filePath,
          folder,
          onProgress: (progress) => {
            onProgress && onProgress(progress, index);
          },
          onSuccess: (result) => {
            resolve(result);
          },
          onError: (error) => {
            reject(error);
          }
        });
      });
    });

    Promise.all(uploadPromises)
      .then(results => {
        onSuccess && onSuccess(results);
      })
      .catch(error => {
        onError && onError(error);
      });
  }

  /**
   * 设置配置
   * @param {Object} config 配置对象
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
    this.initCOS(); // 重新初始化COS实例
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

// 创建默认实例
const defaultUploader = new COSUploader();

/**
 * 便捷方法：上传单个文件
 * @param {Object} options 上传选项
 */
function uploadFile(options) {
  return defaultUploader.uploadFile(options);
}

/**
 * 便捷方法：选择并上传图片
 * @param {Object} options 选项
 */
function chooseAndUploadImage(options) {
  return defaultUploader.chooseAndUploadImage(options);
}

/**
 * 便捷方法：选择并上传视频
 * @param {Object} options 选项
 */
function chooseAndUploadVideo(options) {
  return defaultUploader.chooseAndUploadVideo(options);
}

/**
 * 便捷方法：批量上传文件
 * @param {Array} filePaths 文件路径数组
 * @param {Object} options 选项
 */
function uploadFiles(filePaths, options) {
  return defaultUploader.uploadFiles(filePaths, options);
}

/**
 * 便捷方法：设置全局配置
 * @param {Object} config 配置对象
 */
function setConfig(config) {
  return defaultUploader.setConfig(config);
}

module.exports = {
  COSUploader,
  uploadFile,
  chooseAndUploadImage,
  chooseAndUploadVideo,
  uploadFiles,
  setConfig,
  defaultUploader
};

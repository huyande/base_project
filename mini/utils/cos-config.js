/**
 * 腾讯云 COS 配置
 * 存储桶/地域/上传路径统一来自 config/env.js，避免多处硬编码。
 */

const envConfig = require('../config/env.js')

/**
 * COS 基础配置
 * 敏感信息（bucket/region）集中在 config/env.js 管理。
 */
const COS_CONFIG = {
  bucket: envConfig.cos.bucket,
  region: envConfig.cos.region,
  basePath: envConfig.cos.basePath,
  
  // 文件大小限制（单位：字节）
  maxFileSize: {
    image: 5 * 1024 * 1024,     // 图片最大5MB
    audio: 20 * 1024 * 1024,    // 音频最大20MB
    video: 100 * 1024 * 1024,   // 视频最大100MB
    document: 10 * 1024 * 1024  // 文档最大10MB
  },
  
  // 允许的文件类型
  allowedTypes: {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
    video: ['mp4', 'mov', 'avi', '3gp', 'mkv', 'wmv'],
    document: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx']
  },
  
  // 上传配置
  uploadOptions: {
    // 分片上传阈值（单位：字节），大于此值将使用分片上传
    sliceSize: 8 * 1024 * 1024, // 8MB
    
    // 并发上传数量
    concurrency: 3,
    
    // 重试次数
    retryTimes: 3,
    
    // 超时时间（毫秒）
    timeout: 60000
  }
};

/**
 * 环境配置
 * bucket/region 统一来自 config/env.js；如需按环境区分 basePath 可在此覆盖。
 */
const { bucket, region } = envConfig.cos
const ENVIRONMENT_CONFIG = {
  development: {
    bucket,
    region,
    stsUrl: `/cos/sts?bucket=${bucket}&region=${region}`,
    basePath: 'uploads/',
  },
  production: {
    bucket,
    region,
    stsUrl: `/cos/sts?bucket=${bucket}&region=${region}`,
    basePath: envConfig.cos.basePath,
  },
};

/**
 * 获取当前环境的配置
 * @param {String} env 环境名称，默认为 'development'
 * @returns {Object} 环境配置
 */
function getEnvironmentConfig(env = 'production') {
  return ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
}

/**
 * 合并配置
 * @param {String} env 环境名称
 * @param {Object} customConfig 自定义配置
 * @returns {Object} 合并后的配置
 */
function getMergedConfig(env = 'production', customConfig = {}) {
  const envConfig = getEnvironmentConfig(env);
  return {
    ...COS_CONFIG,
    ...envConfig,
    ...customConfig
  };
}

/**
 * 验证配置是否完整
 * @param {Object} config 配置对象
 * @returns {Object} 验证结果
 */
function validateConfig(config) {
  const errors = [];
  
  if (!config.bucket) {
    errors.push('bucket 配置不能为空');
  }
  
  if (!config.region) {
    errors.push('region 配置不能为空');
  }
  
  if (!config.stsUrl) {
    errors.push('stsUrl 配置不能为空');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 获取文件类型配置
 * @param {String} fileType 文件类型
 * @returns {Object} 文件类型配置
 */
function getFileTypeConfig(fileType) {
  const config = {
    extensions: COS_CONFIG.allowedTypes[fileType] || [],
    maxSize: COS_CONFIG.maxFileSize[fileType] || 5 * 1024 * 1024
  };
  
  return config;
}

/**
 * 检查文件是否符合类型要求
 * @param {String} fileName 文件名
 * @param {String} expectedType 期望的文件类型
 * @returns {Boolean} 是否符合要求
 */
function checkFileType(fileName, expectedType) {
  const fileExt = fileName.split('.').pop().toLowerCase();
  const typeConfig = getFileTypeConfig(expectedType);
  
  return typeConfig.extensions.includes(fileExt);
}

/**
 * 获取文件大小限制
 * @param {String} fileType 文件类型
 * @returns {Number} 文件大小限制（字节）
 */
function getFileSizeLimit(fileType) {
  return COS_CONFIG.maxFileSize[fileType] || 5 * 1024 * 1024;
}

// 文件大小格式化统一使用 utils/util.js 的 formatFileSize，避免重复实现。

module.exports = {
  COS_CONFIG,
  ENVIRONMENT_CONFIG,
  getEnvironmentConfig,
  getMergedConfig,
  validateConfig,
  getFileTypeConfig,
  checkFileType,
  getFileSizeLimit,
};

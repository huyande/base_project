/**
 * 集中管理请求通道、环境地址、云托管、存储前缀等，避免散落硬编码。
 *
 * 注意：本文件可能包含云环境 ID、bucket、测试 openid 等敏感信息，
 * 正式项目建议将其加入 .gitignore，并提供 env.example.js 作为模板。
 */

// 请求通道：'http' 使用 wx.request；'cloud' 使用 wx.cloud.callContainer
// 通道与 dev/pro 解耦：生产也可用 http（真实域名），开发也可连云托管。
const CHANNEL = 'http_prod' // 'http' | 'cloud'

// 是否输出调试日志（生产环境请置为 false）
const DEBUG = true

const config = {
  channel: CHANNEL,
  debug: DEBUG,

  // 请求超时与重试（两种通道共用）
  timeout: 10000,
  retryTimes: 3,
  retryDelay: 1000,

  // HTTP 通道配置（wx.request）
  http: {
    baseURL: 'http://47.117.123.109:3000', // 本地开发服务器地址
    basePath: '', // 统一接口前缀，如 '/api'
  },

  http_prod: {
    baseURL: 'https://mylabx.top/wx-course', // 本地开发服务器地址
    basePath: '', // 统一接口前缀，如 '/api'
  },

  // 云托管通道配置（wx.cloud.callContainer / wx.cloud.uploadFile）
  cloud: {
    env: 'prod-d7gwcc04z0194f8e3', // 云托管环境 ID，如 'prod-xxxx'
    service: 'koa-wehn', // 云托管服务名
    basePath: '', // 统一接口前缀，如 '/api'
    storageBasePath: 'uploads/', // 对象存储上传路径前缀
  },

  // 开发期注入的测试 openid（仅 http 通道、debug 下生效；生产请留空）
  devOpenId: 'oytYwxsORA2MVwbr1lW2oyK_-Ous',

  // 本地存储键前缀（建议按项目命名，避免多小程序冲突）
  storagePrefix: 'app_',

  // 默认字号档位：'small' | 'normal' | 'large' | 'xlarge'
  // 用户在设置里调整后会覆盖此默认值并持久化到本地存储
  fontScale: 'normal',

  // 腾讯云 COS 配置
  cos: {
    bucket: '', // 存储桶名称，格式 bucket-appid
    region: '', // 存储桶地域，如 'ap-shanghai'
    basePath: 'uploads/', // 基础上传路径
  },
}

module.exports = config

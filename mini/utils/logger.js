/**
 * 统一日志工具
 * 通过 config.debug 控制输出，生产环境静默，避免满屏 console。
 */

const config = require('../config/env.js')

const logger = {
  log(...args) {
    if (config.debug) console.log(...args)
  },
  info(...args) {
    if (config.debug) console.info(...args)
  },
  warn(...args) {
    if (config.debug) console.warn(...args)
  },
  // 错误无论是否 debug 都输出，便于线上排查
  error(...args) {
    console.error(...args)
  },
}

module.exports = logger

// 首页：框架空壳，展示当前登录用户信息
const { storageManager } = require('../../utils/storage.js')
const { STORAGE_KEYS } = require('../../utils/constants.js')

Page({
  data: {
    userInfo: null,
  },

  onShow() {
    const userInfo = storageManager.get(STORAGE_KEYS.USER_INFO, null)
    this.setData({ userInfo })
  },
})

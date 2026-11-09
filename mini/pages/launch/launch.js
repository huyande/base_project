const { BUSINESS_ROUTES } = require('../../utils/constants.js')
const auth = require('../../services/auth.js')

Page({
  data: {
    loading: true,
  },

  onLoad() {
    this.checkAuthAndNavigate()
  },

  async checkAuthAndNavigate() {
    try {
      const result = await auth.silentLogin()
      if (result && result.accessToken) {
        wx.reLaunch({ url: BUSINESS_ROUTES.INDEX })
      } else {
        wx.redirectTo({ url: BUSINESS_ROUTES.WELLCOME })
      }
    } catch (error) {
      console.error('启动页鉴权失败:', error)
      wx.redirectTo({ url: BUSINESS_ROUTES.WELLCOME })
    }
  },
})

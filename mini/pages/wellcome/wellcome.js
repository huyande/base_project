const { BUSINESS_ROUTES } = require('../../utils/constants.js')

Page({
  onStart() {
    const auth = require('../../services/auth.js')
    auth
      .silentLogin()
      .then((result) => {
        if (result && result.accessToken) {
          wx.reLaunch({ url: BUSINESS_ROUTES.INDEX })
        } else {
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        }
      })
      .catch(() => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      })
  },
})

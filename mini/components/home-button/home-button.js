const { switchTab } = require('../../utils/util.js')
const { BUSINESS_ROUTES } = require('../../utils/constants.js')

Component({
  properties: {
    extClass: {
      type: String,
      value: '',
    },
    size: {
      type: Number,
      value: 72,
    },
    iconColor: {
      type: String,
      value: '',
    },
    top: {
      type: String,
      value: '',
    },
    left: {
      type: String,
      value: '',
    },
    url: {
      type: String,
      value: '',
    },
  },

  data: {
    buttonStyle: '',
    iconStyle: '',
  },

  lifetimes: {
    attached() {
      this.initStyles()
    },
  },

  observers: {
    'size, iconColor, top, left': function () {
      this.initStyles()
    },
  },

  methods: {
    initStyles() {
      const { size, iconColor, top, left } = this.properties
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const platform = wx.getDeviceInfo
        ? wx.getDeviceInfo().platform
        : wx.getSystemInfoSync().platform
      const isAndroid = platform === 'android'
      const isDevtools = platform === 'devtools'

      let topStyle = top
      if (!topStyle) {
        if (isDevtools || isAndroid) {
          const safeTop = windowInfo.safeArea ? windowInfo.safeArea.top : 0
          topStyle = `top: ${safeTop + 8}px`
        } else {
          topStyle = ''
        }
      } else if (!topStyle.includes(':')) {
        topStyle = `top: ${topStyle}`
      }

      const leftStyle = left ? (left.includes(':') ? left : `left: ${left}`) : ''

      const buttonStyle = [
        `width: ${size}rpx`,
        `height: ${size}rpx`,
        topStyle,
        leftStyle,
      ]
        .filter(Boolean)
        .join('; ')

      const iconStyle = iconColor ? `background-color: ${iconColor}` : ''

      this.setData({ buttonStyle, iconStyle })
    },

    onHome() {
      const target = this.properties.url || BUSINESS_ROUTES.INDEX
      switchTab(target)
      this.triggerEvent('home', { url: target })
    },
  },
})

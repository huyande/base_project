const { navigateBack } = require('../../utils/util.js')

Component({
  properties: {
    extClass: {
      type: String,
      value: '',
    },
    delta: {
      type: Number,
      value: 1,
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
    /**
     * 初始化定位与图标样式（安全区域适配）
     */
    initStyles() {
      const { size, iconColor, top, left } = this.properties
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const platform = wx.getDeviceInfo ? wx.getDeviceInfo().platform : wx.getSystemInfoSync().platform
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

      let leftStyle = left ? (left.includes(':') ? left : `left: ${left}`) : ''

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

    /**
     * 返回上一页
     */
    onBack() {
      const { delta } = this.data
      if (delta) {
        navigateBack(delta)
      }
      this.triggerEvent('back', { delta })
    },
  },
})

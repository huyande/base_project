Component({
  options: {
    multipleSlots: true, // 启用多 slot 支持
  },
  properties: {
    extClass: {
      type: String,
      value: '',
    },
    title: {
      type: String,
      value: '',
    },
    background: {
      type: String,
      value: '',
    },
    color: {
      type: String,
      value: '',
    },
    back: {
      type: Boolean,
      value: true,
    },
    loading: {
      type: Boolean,
      value: false,
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候 opacity 动画效果
      type: Boolean,
      value: true,
    },
    show: {
      // 显示隐藏导航，隐藏的时候 navigation-bar 的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange',
    },
    // back 为 true 时返回的页面深度
    delta: {
      type: Number,
      value: 1,
    },
  },
  data: {
    displayStyle: '',
    ios: false,
    innerPaddingRight: '',
    leftWidth: '',
    safeAreaTop: '',
  },
  lifetimes: {
    attached() {
      this.initNavigationBar()
    },
  },
  methods: {
    /**
     * 初始化导航栏（安全区域、胶囊按钮避让）
     */
    initNavigationBar() {
      const rect = wx.getMenuButtonBoundingClientRect()
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const platform = wx.getDeviceInfo ? wx.getDeviceInfo().platform : wx.getSystemInfoSync().platform
      const isAndroid = platform === 'android'
      const isDevtools = platform === 'devtools'

      this.setData({
        ios: !isAndroid,
        innerPaddingRight: `padding-right: ${windowInfo.windowWidth - rect.left}px`,
        leftWidth: `width: ${windowInfo.windowWidth - rect.left}px`,
        safeAreaTop:
          isDevtools || isAndroid
            ? `height: calc(var(--height) + ${windowInfo.safeArea.top}px); padding-top: ${windowInfo.safeArea.top}px`
            : ``,
      })
    },

    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'};transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({ displayStyle })
    },

    /**
     * 返回按钮
     */
    back() {
      const { delta } = this.data
      if (delta) {
        wx.navigateBack({ delta })
      }
      this.triggerEvent('back', { delta }, {})
    },

    /**
     * 返回首页按钮
     */
    home() {
      this.triggerEvent('home')
    },
  },
})

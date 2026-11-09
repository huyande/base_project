const { navigateBack } = require('../../utils/util.js')
const { getNavBarMetrics } = require('../../utils/nav-bar.js')

Component({
  properties: {
    extClass: {
      type: String,
      value: '',
    },
    title: {
      type: String,
      value: '',
    },
    delta: {
      type: Number,
      value: 1,
    },
    back: {
      type: Boolean,
      value: true,
    },
    size: {
      type: Number,
      value: 72,
    },
    iconColor: {
      type: String,
      value: '',
    },
    titleColor: {
      type: String,
      value: '',
    },
  },

  data: {
    totalHeight: 0,
    barStyle: '',
    navStyle: '',
    titleWrapStyle: '',
    buttonStyle: '',
    iconStyle: '',
  },

  lifetimes: {
    attached() {
      this.initHeader()
    },
  },

  observers: {
    'size, iconColor': function () {
      this.initButtonStyles()
    },
  },

  methods: {
    /**
     * 初始化导航栏（对齐胶囊按钮、安全区域、标题居中、文档流占位）
     */
    initHeader() {
      const { statusBarHeight, navHeight, totalHeight, sideInset } = getNavBarMetrics()

      this.setData({
        totalHeight: totalHeight+10,
        barStyle: `padding-top: ${statusBarHeight}px; height: ${totalHeight}px`,
        navStyle: `height: ${navHeight}px`,
        titleWrapStyle: `padding-left: ${sideInset}px; padding-right: ${sideInset}px`,
      })

      this.initButtonStyles()
    },

    /**
     * 初始化返回按钮尺寸与图标颜色
     */
    initButtonStyles() {
      const { size, iconColor } = this.properties
      const buttonStyle = `width: ${size}rpx; height: ${size}rpx`
      const iconStyle = iconColor ? `background-color: ${iconColor}` : ''

      this.setData({ buttonStyle, iconStyle })
    },

    /**
     * 返回上一页
     */
    onBack() {
      const { delta } = this.properties
      if (delta) {
        navigateBack(delta)
      }
      this.triggerEvent('back', { delta })
    },
  },
})

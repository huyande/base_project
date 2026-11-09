/**
 * 自定义导航栏尺寸计算
 * 基于胶囊按钮位置动态计算导航栏高度，供 page-header 组件及各页面复用。
 */

/**
 * 获取导航栏布局指标
 * @returns {{ statusBarHeight: number, navHeight: number, totalHeight: number, sideInset: number }}
 */
function getNavBarMetrics() {
  const rect = wx.getMenuButtonBoundingClientRect()
  const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  const statusBarHeight = windowInfo.statusBarHeight || (windowInfo.safeArea ? windowInfo.safeArea.top : 0)

  const navGap = rect.top - statusBarHeight
  const navHeight = navGap * 5 + rect.height
  const totalHeight = statusBarHeight + navHeight
  const sideInset = windowInfo.windowWidth - rect.left
  return {
    statusBarHeight,
    navHeight,
    totalHeight,
    sideInset,
  }
}

module.exports = {
  getNavBarMetrics,
}

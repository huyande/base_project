// postcss.config.js
module.exports = {
    plugins: [
      require('@hsuna/postcss-media-query-transform')({
        mediaQuery: { 
          query: "(min-width: 750px)", // 媒体查询条件：屏幕宽度≥750px时触发转换
          scale: 0.5 // 缩放比例，此处为0.5倍
        },
        propList: ["*"], // 指定需要转换的属性，['*'] 表示所有属性
        transformUnit: "rpx", // 指定要转换的单位，例如 'rpx'
        insert: "after" // 转换后的CSS插入位置，'after' 表示插入到原样式之后
      })
    ]
  }
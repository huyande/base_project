/**
 * 隐私授权弹窗组件
 *
 * 处理微信隐私接口（如 chooseAvatar）调用前的用户授权：
 * - 组件挂载时注册 wx.onNeedPrivacyAuthorization；隐私接口触发且用户未授权时回调
 * - 弹窗内"同意"按钮使用 open-type="agreePrivacyAuthorization"，点击后 resolve({event:'agree'})
 * - "拒绝"则 resolve({event:'disagree'})，隐私接口会收到拒绝错误
 * - 仅作为授权 UI；具体的头像上传/保存由各业务页面处理
 */
Component({
  data: {
    visible: false,
    contractName: '《小程序隐私保护指引》',
  },

  lifetimes: {
    attached() {
      this._resolve = null
      this._needHandler = (resolve) => {
        this._resolve = resolve
        this._fetchContractName()
        this.setData({ visible: true })
      }

      if (wx.onNeedPrivacyAuthorization) {
        wx.onNeedPrivacyAuthorization(this._needHandler)
      }
    },

    detached() {
      if (wx.offNeedPrivacyAuthorization) {
        wx.offNeedPrivacyAuthorization()
      }
      this._resolve = null
    },
  },

  methods: {
    _fetchContractName() {
      if (!wx.getPrivacySetting) return
      wx.getPrivacySetting({
        success: (res) => {
          const name = res && res.privacyContractName
          if (name) this.setData({ contractName: name })
        },
      })
    },

    onViewContract() {
      if (!wx.openPrivacyContract) return
      wx.openPrivacyContract({ fail: () => {} })
    },

    onAgree() {
      this.setData({ visible: false })
      if (this._resolve) {
        // buttonId 必须与 wxml 中同意按钮的 id 一致
        this._resolve({ buttonId: 'agree-btn', event: 'agree' })
        this._resolve = null
      }
    },

    onDisagree() {
      this.setData({ visible: false })
      if (this._resolve) {
        this._resolve({ event: 'disagree' })
        this._resolve = null
      }
    },
  },
})

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

export interface Code2SessionResult {
  openid: string;
  sessionKey: string;
  unionid?: string;
}

/**
 * 微信小程序 code2Session client。
 * 小程序端 wx.login 获取临时凭证 code 后，由服务端调用
 * GET /sns/jscode2session 换取 openid / session_key / unionid。
 * 本地调测可用 WX_MOCK_OPENID 跳过真实调用。
 */
@Injectable()
export class WxCode2SessionClient {
  private readonly logger = new Logger(WxCode2SessionClient.name);
  private readonly base =
    process.env.WX_WX_API_BASE ?? 'https://api.weixin.qq.com';

  async code2Session(code: string): Promise<Code2SessionResult> {
    // 本地调测后门：设置 WX_MOCK_OPENID 时直接返回，不请求微信
    const mockOpenId = process.env.WX_MOCK_OPENID;
    if (mockOpenId) {
      return { openid: mockOpenId, sessionKey: 'mock-session-key' };
    }

    const appid = process.env.WX_APP_ID;
    const secret = process.env.WX_APP_SECRET;
    if (!appid || !secret) {
      throw new UnauthorizedException('服务端未配置 WX_APP_ID / WX_APP_SECRET');
    }

    const url = `${this.base}/sns/jscode2session?appid=${encodeURIComponent(
      appid,
    )}&secret=${encodeURIComponent(secret)}&js_code=${encodeURIComponent(
      code,
    )}&grant_type=authorization_code`;

    let json: {
      errcode?: number;
      errmsg?: string;
      openid?: string;
      session_key?: string;
      unionid?: string;
    };
    try {
      const res = await fetch(url);
      json = (await res.json()) as typeof json;
    } catch (err) {
      this.logger.error(`code2Session 请求失败: ${String(err)}`);
      throw new UnauthorizedException('微信登录服务暂不可用');
    }

    if (json.errcode !== undefined || !json.openid || !json.session_key) {
      // 40029 code 无效、40163 code 已被使用、45011 频率限制等
      throw new UnauthorizedException(
        `微信登录失败(${json.errcode ?? 'no-openid'}): ${json.errmsg ?? '未返回 openid'}`,
      );
    }

    return {
      openid: json.openid,
      sessionKey: json.session_key,
      unionid: json.unionid,
    };
  }
}

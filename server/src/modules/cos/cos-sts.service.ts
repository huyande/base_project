import { Injectable, BadRequestException } from '@nestjs/common';
import STS from 'qcloud-cos-sts';

interface StsCredentials {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
}

interface StsResponse {
  expiredTime: number;
  credentials: StsCredentials;
}

export interface StsCredential extends StsCredentials {
  /** 临时密钥有效截止时间（Unix 秒） */
  expiredTime: number;
}

/**
 * 腾讯云 COS 临时密钥（STS）签发服务。
 * 基于官方 qcloud-cos-sts 生成限定桶/路径上传权限的临时凭证，
 * 小程序端 cos-wx-sdk-v5 通过 getSts 接口使用。
 */
@Injectable()
export class CosStsService {
  async getSts(bucket: string, region: string): Promise<StsCredential> {
    if (!bucket || !region) {
      throw new BadRequestException('缺少 bucket 或 region 参数');
    }

    const secretId = process.env.COS_SECRET_ID;
    const secretKey = process.env.COS_SECRET_KEY;
    const allowPrefix = process.env.COS_ALLOW_PREFIX || 'uploads/*';
    const duration = parseInt(process.env.COS_STS_DURATION || '1800', 10);

    if (!secretId || !secretKey) {
      throw new BadRequestException('COS_SECRET_ID / COS_SECRET_KEY 未配置');
    }

    const policy = {
      version: '2.0',
      statement: [
        {
          action: ['name/cos:PutObject', 'name/cos:PostObject'],
          effect: 'allow',
          principal: { qcs: '*' },
          resource: [
            `qcs::cos:${region}:uid/${this.getAppId(bucket)}:${bucket}/${allowPrefix}`,
          ],
        },
      ],
    };

    const { promise, resolve, reject } =
      Promise.withResolvers<StsCredential>();

    STS.getCredential(
      {
        secretId,
        secretKey,
        durationSeconds: duration,
        policy,
      },
      // 官方 SDK 仅提供回调 API，无 Promise 版本
      (err: Error | null, data: StsResponse) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          tmpSecretId: data.credentials.tmpSecretId,
          tmpSecretKey: data.credentials.tmpSecretKey,
          sessionToken: data.credentials.sessionToken,
          expiredTime: data.expiredTime,
        });
      },
    );

    try {
      return await promise;
    } catch (error) {
      // SDK 错误（密钥无效/网络失败等）对调用方是可感知的配置问题，透传为 400
      // qcloud-cos-sts 回调抛的是 { Code, Message } 普通对象，而非 Error 实例
      const sdkError = error as { Message?: string; message?: string };
      const message = sdkError.Message ?? sdkError.message ?? '未知错误';
      throw new BadRequestException(`获取 COS 临时密钥失败: ${message}`);
    }
  }

  /** 从 bucket-appid 形式的桶名中提取 appid */
  private getAppId(bucket: string): string {
    const parts = bucket.split('-');
    return parts[parts.length - 1];
  }
}

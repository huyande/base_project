import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { LoginResponseDto, LoginUserDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh.dto';
import { WxCode2SessionClient } from './wx-code2session.client';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly wxCode2SessionClient: WxCode2SessionClient,
  ) {}

  async login(code: string): Promise<LoginResponseDto> {
    if (!code) {
      throw new UnauthorizedException('缺少参数');
    }

    // 0. wx.login 的临时凭证 code 换取 openId
    const { openid: openId } =
      await this.wxCode2SessionClient.code2Session(code);

    // 1. 查询用户，不存在则自动注册（仅保存 openId）
    let user = await this.userRepository.findOneBy({ openId });
    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({ openId, nickname: '', avatarUrl: '' }),
      );
    }

    // 2. 检查现有 refreshToken 是否有效（多设备共存）
    const now = new Date();
    const tokenExpiresAt = user.tokenExpiresAt
      ? new Date(user.tokenExpiresAt)
      : null;

    let refreshToken: string;
    let newTokenExpiresAt: Date;

    if (user.refreshToken && tokenExpiresAt && tokenExpiresAt > now) {
      // 有效：使用现有 Token
      refreshToken = user.refreshToken;
      newTokenExpiresAt = tokenExpiresAt;
    } else {
      // 无效/不存在：颁发新 Token
      const refreshExpirationDays = parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7',
      );
      newTokenExpiresAt = new Date(
        now.getTime() + refreshExpirationDays * 24 * 60 * 60 * 1000,
      );

      refreshToken = await this.generateRefreshToken(user);
      await this.updateUserToken(user.id, refreshToken, newTokenExpiresAt);
    }

    const accessToken = await this.generateAccessToken(user);

    return {
      accessToken,
      refreshToken,
      user: this.toLoginUser(user),
    };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = { user: this.toLoginUser(user) };
    // 环境变量约定为 ms 时长字符串（如 15m），格式无法静态推断，显式断言
    const expiresIn = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
    ) || '15m') as JwtSignOptions['expiresIn'];
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      openId: user.openId,
      type: 'refresh' as const,
    };
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = (this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
    ) || '7d') as JwtSignOptions['expiresIn'];
    return this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  async refresh(refreshToken: string): Promise<RefreshResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('缺少 refreshToken');
    }

    try {
      // 验证 refreshToken
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
      const payload = this.jwtService.verify(refreshToken, { secret });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Token 类型无效');
      }

      // 查询用户
      const user = await this.userRepository.findOneBy({ id: payload.sub });
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 验证数据库中的 refreshToken 是否匹配
      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('RefreshToken 无效');
      }

      // 生成新的 Token 对
      const accessToken = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      const refreshExpirationDays = parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7',
      );
      const newTokenExpiresAt = new Date(
        Date.now() + refreshExpirationDays * 24 * 60 * 60 * 1000,
      );

      await this.updateUserToken(user.id, newRefreshToken, newTokenExpiresAt);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('RefreshToken 验证失败');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { refreshToken: null, tokenExpiresAt: null },
    );
  }

  private async updateUserToken(
    userId: string,
    refreshToken: string,
    tokenExpiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { refreshToken, tokenExpiresAt },
    );
  }

  private toLoginUser(user: User): LoginUserDto {
    return {
      id: user.id,
      openId: user.openId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}

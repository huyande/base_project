import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Result } from '@/common/response/result';
import type { SuccessResult } from '@/common/response/result';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshDto, RefreshResponseDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录/注册' })
  async login(@Body() loginDto: LoginDto): Promise<SuccessResult<LoginResponseDto>> {
    return Result.success(await this.authService.login(loginDto.code));
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新 Token' })
  async refresh(
    @Body() refreshDto: RefreshDto,
  ): Promise<SuccessResult<RefreshResponseDto>> {
    return Result.success(
      await this.authService.refresh(refreshDto.refreshToken),
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '登出' })
  async logout(@Req() req): Promise<SuccessResult<{ message: string }>> {
    await this.authService.logout(req.user.id);
    return Result.success({ message: '登出成功' });
  }
}

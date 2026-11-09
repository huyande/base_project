import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '微信OpenID' })
  openId: string;

  @ApiProperty({ description: '昵称' })
  nickname: string;

  @ApiProperty({ description: '头像URL' })
  avatarUrl: string;

  @ApiProperty({ description: '注册时间' })
  createdAt: Date;
}

export class LoginResponseDto {
  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: '用户信息',
    type: LoginUserDto,
  })
  user: LoginUserDto;
}

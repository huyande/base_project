import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'wx.login 获取的临时登录凭证 code',
    example: '0a3Xxx000Qw9999A1y000',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

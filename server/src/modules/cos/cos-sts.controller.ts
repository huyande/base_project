import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Result } from '@/common/response/result';
import type { SuccessResult } from '@/common/response/result';
import { CosStsService, StsCredential } from './cos-sts.service';

@ApiTags('COS')
@ApiBearerAuth()
@Controller('wx/cos')
export class CosStsController {
  constructor(private readonly cosStsService: CosStsService) {}

  @Get('sts')
  @ApiOperation({ summary: '获取 COS 上传临时密钥' })
  async getSts(
    @Query('bucket') bucket: string,
    @Query('region') region: string,
  ): Promise<SuccessResult<StsCredential>> {
    return Result.success(await this.cosStsService.getSts(bucket, region));
  }
}

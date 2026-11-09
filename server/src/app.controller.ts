import { Controller, Get } from '@nestjs/common';
import { Result } from '@/common/response/result';
import type { SuccessResult } from '@/common/response/result';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): SuccessResult<string> {
    return Result.success(this.appService.getHello());
  }
}

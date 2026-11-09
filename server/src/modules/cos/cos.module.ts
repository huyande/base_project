import { Module } from '@nestjs/common';
import { CosStsController } from './cos-sts.controller';
import { CosStsService } from './cos-sts.service';

@Module({
  controllers: [CosStsController],
  providers: [CosStsService],
})
export class CosStsModule {}

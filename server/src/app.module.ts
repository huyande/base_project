import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AllExceptionsFilter } from './common/response/all-exceptions.filter';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CosStsModule } from './modules/cos/cos.module';

@Module({
  imports: [DatabaseModule, AuthModule, CosStsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // ponytail: 响应信封改由各 controller 显式 Result.success() 包装，去掉了全局 TransformInterceptor——
    // OpenAPI 文档与 TS 类型在 controller 边界即真实。ClassSerializerInterceptor 保留负责 @Exclude 序列化。
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}

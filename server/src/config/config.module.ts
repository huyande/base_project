import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import databaseConfig from './database.config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const rootDir = process.cwd();

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // 先加载 .env，再由 .env.{NODE_ENV} 覆盖（后者优先级更高）
      envFilePath: [
        resolve(rootDir, '.env'),
        resolve(rootDir, `.env.${nodeEnv}`),
      ],
      load: [databaseConfig],
    }),
  ],
})
export class AppConfigModule {}

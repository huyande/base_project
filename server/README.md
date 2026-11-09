# 微信小程序后端初始化脚手架

基于 NestJS + TypeORM + MySQL 的微信小程序后端框架，内置微信登录（code2Session + JWT 双令牌）与统一响应/异常处理，供后续各类小程序项目在其上快速开发。

## 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript
- **数据库**: MySQL (TypeORM)
- **认证**: JWT (jsonwebtoken + passport-jwt)
- **文档**: Swagger
- **包管理**: pnpm

## 目录结构

```
src/
├── main.ts                    # 应用入口
├── app.module.ts              # 根模块（全局 JWT 守卫）
├── config/                    # 配置模块
├── database/                  # 数据库模块（实体注册于 entities/index.ts）
├── common/                    # 共享代码
│   ├── dao/base.dao.ts        # DAO 基类
│   ├── decorators/public.decorator.ts  # @Public() 装饰器
│   ├── response/              # Result 响应信封与全局异常过滤器
│   └── utils/                 # 通用工具
└── modules/
    ├── auth/                  # 微信登录 + JWT 认证模块
    │   ├── entities/user.entity.ts  # 用户实体（openId + refreshToken）
    │   ├── guards/            # JwtAuthGuard / JwtStrategy
    │   ├── dto/               # 登录/刷新 DTO
    │   ├── auth.controller.ts # /auth/login /auth/refresh /auth/logout
    │   └── wx-code2session.client.ts  # 微信 code2Session 客户端
    └── cos/                   # COS 上传临时密钥（STS）模块
        ├── cos-sts.controller.ts     # GET /wx/cos/sts?bucket=&region=
        └── cos-sts.service.ts        # qcloud-cos-sts 签发限定路径上传凭证
```

## 安装和运行

```bash
pnpm install
cp .env.example .env   # 按需修改配置
pnpm start:dev
```

## 认证流程

1. 小程序端 `wx.login()` 获取临时 `code`
2. `POST /auth/login { code }` → 后端调用微信 `code2Session` 换取 `openId`，自动注册用户，返回 `accessToken` + `refreshToken`
3. 业务接口携带 `Authorization: Bearer <accessToken>`；`@Public()` 标记的接口免鉴权
4. `accessToken` 过期后 `POST /auth/refresh { refreshToken }` 换取新令牌对
5. `POST /auth/logout` 清除服务端 refreshToken

## COS 上传临时密钥

`GET /wx/cos/sts?bucket=<bucket-appid>&region=<region>`（需 JWT）返回限定上传权限的临时密钥，
供小程序端 `cos-wx-sdk-v5` 的 `getSts` 使用。需在环境变量中配置：

```env
COS_SECRET_ID=AKIDxxxxxxxx        # 腾讯云永久密钥（建议使用子账号，仅授权 STS:AssumeRole 与目标桶 PutObject）
COS_SECRET_KEY=xxxxxxxx
COS_ALLOW_PREFIX=uploads/*        # 允许上传的路径前缀
COS_STS_DURATION=1800             # 临时密钥有效期（秒）
```

## 新增业务模块

```bash
nest g resource modules/<name>
```

实体需在 `src/database/entities/index.ts` 的 `ALL_ENTITIES` 中注册。

## API 文档

启动后访问 `http://localhost:3000/api-docs`（Swagger）。

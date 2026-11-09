# 使用官方 Node.js 22 镜像（跟随 22.x 最新安全补丁版本，内置 Node 与 npm）
FROM node:22-bookworm-slim

# P0：时区设上海——course.service/dispatcher 用 moment() 算"今天/到点"，容器 UTC 会错位
# 同时安装 ca-certificates，保证 HTTPS 请求（npm registry / MySQL TLS 等）证书链可用
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata ca-certificates \
  && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
  && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Shanghai

# 指定工作目录
WORKDIR /app

# 启用 pnpm（Node 22 自带 npm；pnpm@9 兼容 Node >= 18，锁死大版本避免 lockfile 不兼容）
RUN npm install -g pnpm@9

# 拷贝包管理文件（含 workspace 配置，pnpm@9 要求 packages 字段）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/

# pnpm 安装依赖（需含 devDependencies，以便 nest build）
RUN pnpm install --frozen-lockfile

# 将当前目录（dockerfile所在目录）下所有文件都拷贝到工作目录下（.dockerignore中的文件除外）
COPY . /app

# 确认生产环境配置文件已打入镜像（构建阶段可快速发现遗漏）
RUN test -f /app/.env.production || (echo "ERROR: .env.production not found in image" && exit 1)

# 编译 Nest 项目
RUN pnpm run build

ENV NODE_ENV=production

# 应用主进程直接启动
ENTRYPOINT ["node", "dist/main"]

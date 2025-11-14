# Docker 部署说明

本项目包含 Next.js 前端和 FastAPI 后端，可以打包为单个 Docker 容器镜像。

## 架构说明

- **Nginx**: 作为反向代理，监听 80 端口
  - `/api/*` 路由到 FastAPI (端口 8000)
  - `/docs` 和 `/openapi.json` 路由到 FastAPI
  - 其他所有路径路由到 Next.js (端口 3000)
- **FastAPI**: Python 后端服务，监听 127.0.0.1:8000
- **Next.js**: 前端应用，监听 127.0.0.1:3000
- **Supervisor**: 管理所有服务进程

## 构建镜像

```bash
# 基础构建
docker build -t strands-ai-sdk:latest .

# 指定平台构建（用于跨平台）
docker build --platform linux/amd64 -t strands-ai-sdk:latest .
```

## 运行容器

### 基础运行

```bash
docker run -p 8080:80 strands-ai-sdk:latest
```

访问: `http://localhost:8080`

### 带环境变量运行

```bash
docker run -p 8080:80 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  strands-ai-sdk:latest
```

### 带数据卷运行（持久化数据）

```bash
docker run -p 8080:80 \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL="sqlite:///data/app.db" \
  strands-ai-sdk:latest
```

## 使用 Docker Compose

创建 `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  app:
    image: strands-ai-sdk:latest
    ports:
      - "8080:80"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/strands
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=strands
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

运行:

```bash
docker-compose -f docker-compose.production.yml up -d
```

## 环境变量配置

在运行容器时，可以传入以下环境变量：

```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@host:5432/dbname

# 其他配置
NODE_ENV=production
PYTHONUNBUFFERED=1
```

## 路由规则

容器内的 Nginx 配置了以下路由规则：

1. **API 请求** (`/api/*`) → FastAPI (http://127.0.0.1:8000)
2. **API 文档** (`/docs`, `/openapi.json`) → FastAPI
3. **其他所有请求** (`/`, `/chat/*`, etc.) → Next.js (http://127.0.0.1:3000)

这确保了：
- 访问根路径显示前端界面
- API 请求正确路由到后端
- 后端不识别的路径会fallback到前端（Next.js处理404）

## 健康检查

可以通过以下端点检查服务状态：

```bash
# 检查前端
curl http://localhost:8080/

# 检查后端 API
curl http://localhost:8080/api/conversations

# 检查 API 文档
curl http://localhost:8080/docs
```

## 日志查看

```bash
# 查看所有日志
docker logs <container-id>

# 实时查看日志
docker logs -f <container-id>

# 查看特定服务的日志（容器内）
docker exec <container-id> supervisorctl tail -f nginx
docker exec <container-id> supervisorctl tail -f fastapi
docker exec <container-id> supervisorctl tail -f nextjs
```

## 容器管理

```bash
# 进入容器
docker exec -it <container-id> bash

# 重启服务
docker exec <container-id> supervisorctl restart all

# 查看服务状态
docker exec <container-id> supervisorctl status
```

## 生产环境建议

1. **使用外部数据库**: 不要使用 SQLite，建议使用 PostgreSQL
2. **设置资源限制**: 
   ```bash
   docker run -p 8080:80 \
     --memory="2g" \
     --cpus="2" \
     strands-ai-sdk:latest
   ```
3. **启用日志轮转**: 配置 Docker 日志驱动
4. **使用环境变量**: 通过 `.env` 文件管理敏感信息
5. **健康检查**: 
   ```bash
   docker run -p 8080:80 \
     --health-cmd="curl -f http://localhost:80/ || exit 1" \
     --health-interval=30s \
     --health-timeout=10s \
     --health-retries=3 \
     strands-ai-sdk:latest
   ```

## 多阶段构建说明

Dockerfile 使用多阶段构建优化镜像大小：

1. **Stage 1** (frontend-builder): 构建 Next.js 应用
   - 使用 Node.js 20 镜像
   - 安装依赖并构建前端
   
2. **Stage 2** (production): 最终运行镜像
   - 基于 Python 3.11 镜像
   - 安装 Node.js 运行时（需要运行 Next.js）
   - 安装 Nginx 和 Supervisor
   - 复制构建好的前端文件
   - 配置所有服务

## 故障排查

### 服务无法启动

```bash
# 检查日志
docker logs <container-id>

# 检查各服务状态
docker exec <container-id> supervisorctl status
```

### 数据库连接失败

确保 `DATABASE_URL` 环境变量正确设置，并且数据库可访问。

### 前端无法访问 API

检查 Nginx 配置是否正确，确保 `/api/` 路径正确代理到 FastAPI。

## 镜像大小优化

当前镜像包含完整的运行时环境，大小约 1-2GB。如果需要进一步优化：

1. 使用 Alpine 基础镜像
2. 移除不必要的依赖
3. 使用 `.dockerignore` 排除不需要的文件
4. 多阶段构建中清理缓存

## 安全建议

1. 不要在镜像中硬编码敏感信息
2. 使用环境变量或 secrets 管理配置
3. 定期更新基础镜像
4. 扫描镜像漏洞: `docker scan strands-ai-sdk:latest`
5. 使用非 root 用户运行（需要修改 Dockerfile）

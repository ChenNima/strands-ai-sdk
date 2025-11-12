# 数据库配置指南

## 快速启动

### 1. 启动 PostgreSQL 数据库

```bash
# 启动数据库
docker-compose up -d

# 查看数据库状态
docker-compose ps

# 查看数据库日志
docker-compose logs -f postgres
```

### 2. 停止数据库

```bash
# 停止数据库
docker-compose down

# 停止并删除数据卷（会清空所有数据）
docker-compose down -v
```

## 数据库配置

### 默认配置

- **主机**: localhost
- **端口**: 5432
- **用户名**: postgres
- **密码**: postgres
- **数据库名**: strands_ai

### 连接字符串

```
postgresql://postgres:postgres@localhost:5432/strands_ai
```

## 使用数据库

### Python 连接示例

#### 使用 psycopg2

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    user="postgres",
    password="postgres",
    database="strands_ai"
)

cursor = conn.cursor()
cursor.execute("SELECT version();")
print(cursor.fetchone())

conn.close()
```

#### 使用 SQLAlchemy

```python
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/strands_ai"
engine = create_engine(DATABASE_URL)

with engine.connect() as connection:
    result = connection.execute("SELECT version();")
    print(result.fetchone())
```

### 命令行连接

```bash
# 使用 psql 连接
docker exec -it strands-postgres psql -U postgres -d strands_ai

# 或者从宿主机连接（需要安装 postgresql-client）
psql -h localhost -U postgres -d strands_ai
```

## 常用命令

### 在 psql 中

```sql
-- 列出所有数据库
\l

-- 连接到数据库
\c strands_ai

-- 列出所有表
\dt

-- 查看表结构
\d table_name

-- 退出
\q
```

### 备份和恢复

```bash
# 备份数据库
docker exec strands-postgres pg_dump -U postgres strands_ai > backup.sql

# 恢复数据库
docker exec -i strands-postgres psql -U postgres strands_ai < backup.sql
```

## 环境变量配置


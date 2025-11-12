# 数据库集成任务计划和设计文档

## 📋 项目概述

为 Strands AI SDK 项目添加 PostgreSQL 数据库支持，使用 SQLModel + Alembic 进行数据库建模和迁移管理，首先实现消息记录存储功能。

## 🎯 目标

1. 集成 PostgreSQL 数据库到现有项目
2. 使用 SQLModel 进行 ORM 建模
3. 使用 Alembic 管理数据库迁移
4. 实现消息历史记录存储
5. 支持会话管理和消息检索

## 🏗️ 数据库架构设计

### 表结构设计

#### 1. conversations 表（会话表）
```sql
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    title VARCHAR(500),
    user_id VARCHAR(255),  -- 预留用户系统字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB  -- 存储额外的元数据
);
```

**字段说明：**
- `id`: 数据库自增主键（内部使用，性能优化）
- `uuid`: 外部唯一标识（UUID，用于 API 和关联）
- `title`: 会话标题（从第一条消息或用户输入生成）
- `user_id`: 用户ID（预留，支持未来的用户系统）
- `created_at`: 会话创建时间
- `updated_at`: 最后更新时间
- `metadata`: JSON 格式的额外信息（如标签、设置等）

**设计原理：**
- 使用自增 `id` 作为主键提升数据库内部操作性能
- 使用 `uuid` 字段作为外部标识，提供安全性和分布式兼容性
- 所有外键关联使用内部 `id`，提升 JOIN 性能
- API 层面只暴露 `uuid`，隐藏内部 ID

#### 2. messages 表（消息表）
```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    conversation_uuid UUID NOT NULL REFERENCES conversations(uuid) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- 'user', 'assistant', 'system', 'tool'
    content TEXT,
    parts JSONB NOT NULL,  -- 存储消息的各个部分（文本、工具调用、工具结果等）
    attachments JSONB,  -- 存储附件信息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB  -- 额外的消息元数据
);
```

**字段说明：**
- `id`: 数据库自增主键（内部使用，性能优化）
- `uuid`: 外部唯一标识（UUID，用于 API）
- `conversation_uuid`: 所属会话UUID（外键，直接引用 conversations.uuid）
- `role`: 消息角色（user/assistant/system/tool）
- `content`: 消息文本内容（简化查询，可从 parts 提取）
- `parts`: 完整的消息部分结构（JSONB，包含文本、工具调用、工具结果等所有内容）
- `attachments`: 附件信息（文件、图片等）
- `created_at`: 消息创建时间
- `metadata`: 其他元数据

**parts 字段结构示例：**
```json
[
  {
    "type": "text",
    "text": "让我查询一下天气..."
  },
  {
    "type": "tool-get_current_weather",
    "toolCallId": "call_abc123",
    "toolName": "get_current_weather",
    "state": "input-available",
    "input": {"location": "Tokyo"}
  },
  {
    "type": "tool-result",
    "toolCallId": "call_abc123",
    "output": "{\"temperature\": 20, \"condition\": \"sunny\"}"
  },
  {
    "type": "text",
    "text": "东京当前温度是20度，天气晴朗。"
  }
]
```

### 索引策略

```sql
-- conversations 表索引
CREATE UNIQUE INDEX idx_conversations_uuid ON conversations(uuid);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- messages 表索引
CREATE UNIQUE INDEX idx_messages_uuid ON messages(uuid);
CREATE INDEX idx_messages_conversation_uuid ON messages(conversation_uuid);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_role ON messages(role);

-- 复合索引优化（提升按会话和时间查询的性能）
CREATE INDEX idx_messages_conv_uuid_time ON messages(conversation_uuid, created_at DESC);

-- JSONB 字段索引（可选，用于优化 parts 内容查询）
CREATE INDEX idx_messages_parts_gin ON messages USING GIN (parts);
```

## 📦 技术栈

- **ORM**: SQLModel（基于 Pydantic 和 SQLAlchemy）
- **迁移工具**: Alembic
- **数据库**: PostgreSQL 16
- **连接池**: asyncpg（异步）或 psycopg2（同步）
- **验证**: Pydantic V2

## 📅 实现任务计划

### Phase 1: 基础设施搭建（第1天）

- [x] 创建 docker-compose.yaml
- [x] 创建 .env.example
- [ ] 安装依赖包
  - sqlmodel
  - alembic
  - psycopg2-binary
  - asyncpg（可选，用于异步支持）
- [ ] 更新 pyproject.toml
- [ ] 配置数据库连接

### Phase 2: 模型定义（第1-2天）

- [ ] 创建 `api/models/` 目录
- [ ] 定义 SQLModel 基础模型
  - `api/models/base.py` - 基础模型和工具函数
  - `api/models/conversation.py` - Conversation 模型
  - `api/models/message.py` - Message 模型
- [ ] 定义 Pydantic schemas
  - `api/schemas/conversation.py` - 会话 schemas
  - `api/schemas/message.py` - 消息 schemas

### Phase 3: 数据库配置和连接（第2天）

- [ ] 创建 `api/database/` 目录
- [ ] 配置数据库连接
  - `api/database/config.py` - 数据库配置
  - `api/database/session.py` - 会话管理
  - `api/database/init.py` - 初始化函数
- [ ] 实现连接池管理
- [ ] 添加健康检查端点

### Phase 4: Alembic 迁移设置（第2-3天）

- [ ] 初始化 Alembic
  ```bash
  alembic init migrations
  ```
- [ ] 配置 `alembic.ini`
- [ ] 修改 `migrations/env.py`
- [ ] 修改 `migrations/script.py.mako`
- [ ] 创建初始迁移
  ```bash
  alembic revision --autogenerate -m "Initial migration: conversations and messages tables"
  ```
- [ ] 运行迁移
  ```bash
  alembic upgrade head
  ```

### Phase 5: CRUD 操作实现（第3-4天）

- [ ] 创建 `api/crud/` 目录
- [ ] 实现 Conversation CRUD
  - `api/crud/conversation.py`
  - create_conversation
  - get_conversation
  - list_conversations
  - update_conversation
  - delete_conversation
- [ ] 实现 Message CRUD
  - `api/crud/message.py`
  - create_message
  - get_messages_by_conversation
  - update_message
  - delete_message

### Phase 6: API 集成（第4-5天）

- [ ] 修改 `api/index.py`
- [ ] 在聊天端点中集成消息存储
  - 会话创建/检索
  - 消息保存（用户消息和 AI 响应）
  - 工具调用记录
- [ ] 添加新的 API 端点
  - `GET /api/conversations` - 获取会话列表
  - `GET /api/conversations/{id}` - 获取特定会话
  - `GET /api/conversations/{id}/messages` - 获取会话消息
  - `POST /api/conversations` - 创建新会话
  - `DELETE /api/conversations/{id}` - 删除会话

### Phase 7: 前端集成（第5-6天）

- [ ] 修改前端聊天组件
- [ ] 添加会话历史侧边栏
- [ ] 实现会话切换功能
- [ ] 添加新建会话按钮
- [ ] 实现会话删除功能
- [ ] 本地存储会话ID

### Phase 8: 测试和优化（第6-7天）

- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 性能优化
  - 添加适当的索引
  - 实现分页
  - 优化查询
- [ ] 错误处理完善
- [ ] 文档编写

## 📁 项目文件结构

```
strands-ai-sdk/
├── api/
│   ├── models/           # SQLModel 模型定义
│   │   ├── __init__.py
│   │   ├── base.py       # 基础模型
│   │   ├── conversation.py
│   │   └── message.py
│   ├── schemas/          # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── conversation.py
│   │   └── message.py
│   ├── crud/             # CRUD 操作
│   │   ├── __init__.py
│   │   ├── conversation.py
│   │   └── message.py
│   ├── database/         # 数据库配置
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── session.py
│   │   └── init.py
│   └── index.py          # FastAPI 应用
├── migrations/           # Alembic 迁移文件
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── alembic.ini          # Alembic 配置
├── docker-compose.yaml  # Docker 配置
└── .env.example         # 环境变量示例
```

## 🔧 配置示例

### pyproject.toml 依赖

```toml
[project]
dependencies = [
    "fastapi",
    "sqlmodel>=0.0.14",
    "alembic>=1.13.0",
    "psycopg2-binary>=2.9.9",
    "asyncpg>=0.29.0",  # 可选，用于异步
    "python-dotenv",
    # ... 其他依赖
]
```

### .env 配置

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/strands_ai
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_ECHO=false
```

## 📊 数据流程

### 消息存储流程

```
用户发送消息
    ↓
API 接收请求
    ↓
检查/创建会话
    ↓
保存用户消息到数据库
    ↓
调用 Strands Agent
    ↓
流式返回响应
    ↓
保存 AI 响应到数据库
    ↓
记录工具调用和结果
```

### 会话检索流程

```
用户打开应用
    ↓
加载会话列表
    ↓
用户选择会话
    ↓
加载会话消息
    ↓
显示聊天历史
```

## 🚀 快速开始

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
# 或
poetry install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
```

### 4. 运行迁移

```bash
alembic upgrade head
```

### 5. 启动应用

```bash
python -m uvicorn api.index:app --reload
```

## 🧪 测试策略

### 单元测试
- 模型验证测试
- CRUD 操作测试
- 工具函数测试

### 集成测试
- API 端点测试
- 数据库事务测试
- 并发操作测试

### 性能测试
- 大量消息查询
- 并发会话创建
- 数据库连接池压力测试

## 📝 注意事项

1. **数据隐私**: 确保敏感信息加密存储
2. **性能优化**: 使用索引和分页避免大表查询
3. **错误处理**: 实现完善的异常处理和回滚机制
4. **迁移管理**: 保持迁移文件的版本控制
5. **备份策略**: 定期备份数据库
6. **连接池**: 合理配置连接池大小
7. **异步支持**: 考虑使用 asyncpg 提升性能

## 🔄 未来扩展

- [ ] 添加消息搜索功能（全文搜索）
- [ ] 实现消息分享功能
- [ ] 添加会话标签和分类
- [ ] 实现消息导出功能
- [ ] 添加统计和分析功能
- [ ] 实现消息编辑和删除
- [ ] 支持多用户系统
- [ ] 添加消息加密存储

## 📚 参考资料

- [SQLModel 文档](https://sqlmodel.tiangolo.com/)
- [Alembic 文档](https://alembic.sqlalchemy.org/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

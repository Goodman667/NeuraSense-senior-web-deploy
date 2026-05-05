# NeuraSense Senior Web Deploy

这是一个用于独立部署的 NeuraSense Web 版本快照，重点包含：

- 标准版 Web
- 老年版 / 陪伴版 Web
- FastAPI 后端
- React + Vite 前端

不包含：

- Flutter 移动端
- 本地缓存
- 本地测试日志
- 论文与演示材料

---

## 1. 目录

```text
backend/    FastAPI 后端
frontend/   React 前端
docker-compose.yml
```

---

## 2. 部署方式

推荐直接用 Docker 部署。

### 2.1 准备环境

服务器建议：

- Ubuntu 24.04
- Docker 已安装
- 80 端口可用
- 如果后续上 HTTPS，再配 Nginx / Caddy

### 2.2 配置环境变量

复制：

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.production
```

重点填写：

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_PROVIDER`
- `LLM_API_BASE`（如果你用兼容接口）
- `PUBLIC_API_BASE`

默认可以直接用：

```env
PUBLIC_API_BASE=/api/v1
```

这样前端会通过同域 `/api` 反代访问后端，最适合单机 Docker 部署。

如果暂时不用微信登录，可留空：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`

---

## 3. 启动

如果服务器支持 `docker compose`：

```bash
docker compose up -d --build
```

如果服务器只有旧版 compose：

```bash
docker-compose up -d --build
```

启动后：

- 前端：`http://服务器IP/`
- 后端：`http://服务器IP:8000/docs`

---

## 4. 域名建议

推荐：

- `app.your-domain.com` → 前端
- `api.your-domain.com` → 后端

或者：

- `your-domain.com` → 前端
- `api.your-domain.com` → 后端

前端构建时需要把：

```env
PUBLIC_API_BASE=https://api.your-domain.com/api/v1
```

如果你不做前后端分域，保持：

```env
PUBLIC_API_BASE=/api/v1
```

即可。

---

## 5. 注意事项

### 5.1 当前服务器情况

如果服务器没有 `docker compose` 子命令，但有 Docker：

- 可以安装新版 compose plugin
- 或直接安装 `docker-compose`

### 5.2 当前项目依赖外部服务

这个版本默认依赖：

- Supabase
- LLM API

所以部署前必须准备对应密钥。

### 5.3 老年版重点页面

老年版相关主要在：

- `frontend/src/features/senior/`

---

## 6. 后续

后面正式上线时，建议再补：

- HTTPS
- 反向代理
- 开机自启
- 日志轮转
- 服务器防火墙规则

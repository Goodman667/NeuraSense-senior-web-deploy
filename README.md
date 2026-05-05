# NeuraSense Senior Web Deploy

这是一个用于独立部署的 NeuraSense Web 版本快照仓库，面向当前可运行的网页端版本，重点包含：

- 标准版 Web
- 老年版 Web（`/senior`）
- FastAPI 后端
- React + Vite 前端
- 与实际服务器部署一致的目录结构与说明

不包含：

- Flutter 移动端
- 本地缓存与临时调试文件
- 论文材料与演示草稿

---

## 1. 仓库用途

这个仓库不是原始开发主仓库，而是一个**独立部署快照**，主要用于：

- 服务器部署
- 环境迁移
- 部署回滚
- 给后续 AI / 开发者快速接手

GitHub 仓库：

- [Goodman667/NeuraSense-senior-web-deploy](https://github.com/Goodman667/NeuraSense-senior-web-deploy)

---

## 2. 目录

```text
backend/    FastAPI 后端
frontend/   React 前端
.env.example
docker-compose.yml
README.md
```

---

## 3. 当前推荐部署方式

> 当前服务器环境下，**推荐主机直装**，不推荐把 Docker 作为唯一生产方案。

原因：

- 目标服务器实际出现 `overlayfs permission denied`
- `docker run hello-world` 也无法正常运行
- 说明当前宿主环境对 Docker 挂载有权限限制

因此当前已验证可用的生产方案是：

- **前端**：本地 `npm run build` 后上传 `dist`
- **静态托管**：nginx
- **后端**：Python venv + uvicorn
- **守护**：systemd
- **公网 HTTPS**：Cloudflare Tunnel

---

## 4. 已验证通过的实际部署结构

服务器上的实际目录：

```text
/opt/neurasense-senior-web-deploy
/opt/neurasense-senior-web-deploy/backend
/opt/neurasense-senior-web-deploy/backend/.venv
/var/www/neurasense
```

服务：

- `neurasense-backend.service`
- `nginx`
- `neurasense-cloudflared.service`

---

## 5. 环境变量

复制模板：

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.production
```

重点变量：

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_PROVIDER`
- `LLM_API_BASE`
- `EMBEDDING_PROVIDER`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIM`
- `ENABLE_VECTOR_MEMORY`

前端推荐：

```env
PUBLIC_API_BASE=/api/v1
```

如果暂时不用微信登录，可留空：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`

---

## 6. 前端部署

本地构建：

```bash
cd frontend
npm install
npm run build
```

如果要显式指定 API：

```bash
VITE_API_BASE=/api/v1 npm run build
```

构建产物 `frontend/dist` 上传后放到：

```text
/var/www/neurasense
```

nginx 通过 SPA 方式托管。

---

## 7. 后端部署

```bash
cd /opt/neurasense-senior-web-deploy/backend
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

启动命令：

```bash
/opt/neurasense-senior-web-deploy/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1/api/v1/health
```

---

## 8. nginx 反代

当前部署逻辑：

- `/` → 前端静态页面
- `/api/` → `127.0.0.1:8000/api/`
- 其余前端路由 → `/index.html`

因此以下路径都应能正常访问：

- `/`
- `/senior`
- `/api/v1/health`

---

## 9. 当前正式访问地址

当前已接入 Cloudflare Tunnel 正式域名：

- [https://neura.ha7e.com/](https://neura.ha7e.com/)
- [https://neura.ha7e.com/senior](https://neura.ha7e.com/senior)

内网地址仍可用：

- `http://100.107.89.119/`
- `http://100.107.89.119/senior`

如果浏览器打不开内网地址，但命令行能访问，优先检查本机代理软件（如 Clash）是否拦截了 `100.107.89.119`。

---

## 10. Docker 说明

仓库里仍保留了 `docker-compose.yml` 与 Dockerfile，便于未来迁移到支持 Docker 的环境。

但对**当前这台服务器**来说：

- Docker 不是最终生产运行方式
- 主机直装方案才是已验证可用方案

所以如果你只是想复现当前线上效果，请优先按本 README 的主机直装流程部署。

---

## 11. 建议的运维动作

建议额外保存：

- 服务器 nginx 配置
- systemd 服务文件
- 后端 `.env` 安全备份
- 前端构建时间与版本标记

如果后面继续演示或答辩，建议保留这三个访问层：

1. 本地开发环境
2. Tailscale 内网部署
3. Cloudflare Tunnel HTTPS 域名

---

## 12. 补充说明

这个快照仓库已经包含了此前为当前版本做过的关键修复，例如：

- 登录后重复落回 onboarding 的兼容修复
- 老年版结果卡片最后一页按钮行为修复
- 部署所需的后端 Dockerfile / compose 基础修正

如果以后需要，我可以再继续把以下内容补进仓库：

- `deploy/` 目录（nginx 与 systemd 模板）
- 一键部署脚本
- 服务器迁移 SOP

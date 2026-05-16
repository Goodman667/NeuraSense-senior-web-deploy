# NeuraSense 新服务器部署方案（2026-05-16）

## 1. 本次目标

将当前 NeuraSense 网页端部署到新的服务器，并重新整理旧部署残留，最终恢复线上访问与后续自动部署能力。

计划部署的网站：

- 标准版 Web：首页与完整功能版
- 老年版 Web：`/senior`
- FastAPI 后端：`/api/v1`
- 正式域名：优先继续使用 `neura.ha7e.com`

部署来源仓库：

- GitHub：`https://github.com/Goodman667/NeuraSense-senior-web-deploy`
- 本地路径：`E:/maini/NeuraSense-senior-web-deploy`

这个仓库是之前专门整理出来的部署快照仓库，包含当前要上线的网页端版本，不包含 Flutter 移动端、论文材料和演示草稿。

---

## 2. 新服务器体检结果

新服务器信息：

- IP：`85.113.71.61`
- 登录用户：`root`
- Hostname：`substantial-consideration`
- 系统：Debian GNU/Linux 11 bullseye
- 内核：Linux 5.10.0-20-amd64
- CPU：2 核
- 内存：约 2.9 GiB
- Swap：约 511 MiB
- 根目录磁盘：20G，总体已用约 2.3G，剩余约 18G
- 网络：公网 IP 直接绑定在 `eth0`，不需要 Tailscale
- 当前开放监听：只有 SSH `22` 端口

当前未安装：

- `git`
- `node`
- `npm`
- `nginx`
- `docker`
- `docker compose`
- `cloudflared`

当前结论：

1. 这台服务器可以公网直连，不需要 Tailscale。
2. 服务器非常干净，适合重新部署。
3. 当前环境还没有部署依赖，需要从基础环境开始安装。
4. 内存比旧服务器略好，但仍不算大，前端生产构建建议优先放在本地或 GitHub Hosted Runner 上完成，不建议长期让服务器承担前端大包构建。

---

## 3. 旧部署需要清理的内容

旧服务器已经过期，因此旧部署相关内容不能直接继续使用。

### 3.1 GitHub Actions 旧 self-hosted runner

旧自动部署曾使用：

- Runner 名称：`neurasense-server-runner`
- 仓库：`Goodman667/NeuraSense-senior-web-deploy`
- Workflow：`.github/workflows/deploy.yml`

旧 runner 绑定的是旧服务器，现在应该：

1. 在 GitHub 仓库 Settings → Actions → Runners 里删除旧的离线 runner。
2. 暂时不要依赖旧 workflow 自动部署。
3. 等新服务器部署成功后，再重新绑定新的自动部署方式。

建议后续自动部署使用两段式：

- GitHub Hosted Runner：负责编译前端、检查后端
- 新服务器 self-hosted runner 或 SSH：只负责同步文件、重启服务、健康检查

### 3.2 Cloudflare 旧 Tunnel / DNS

旧服务器曾绑定过：

- 域名：`neura.ha7e.com`
- Tunnel 名：`neurasense`
- 旧 Tunnel ID：`37f4fba6-645f-463c-8380-ffaec6a2f247`

旧服务器过期后，需要在 Cloudflare 检查：

1. 旧 Tunnel 是否还存在。
2. `neura.ha7e.com` 是否还指向旧 Tunnel CNAME。
3. 如果仍然存在旧 Tunnel 或旧 CNAME，需要删除或替换。

---

## 4. 新服务器推荐部署方式

因为新服务器可以公网直连，本次优先推荐：

> Nginx + Python venv + Uvicorn + systemd + Cloudflare DNS/Proxy

不优先使用 Tailscale，也不强制使用 Cloudflare Tunnel。

### 4.1 为什么不优先用 Cloudflare Tunnel

这台服务器已经可以公网直连，所以没有必要像旧服务器一样依赖 Tunnel 穿透。

Cloudflare Tunnel 适合：

- 服务器不能公网入站
- 不想开放 80/443
- 服务器在 NAT 或防火墙后面

但这台服务器已经有公网 IP，因此更简单、可控的方式是：

- Nginx 监听 80/443
- Cloudflare DNS 指向服务器公网 IP
- Cloudflare 提供 HTTPS / 代理 / 基础防护

### 4.2 关于“中国大陆访问”

用户希望大陆也能访问，因此仍然建议使用 Cloudflare 管理域名与 HTTPS。

需要注意：

- Cloudflare 免费/普通网络不能保证中国大陆所有地区高速稳定访问。
- 但相比裸 IP，Cloudflare 可以提供域名、HTTPS、缓存、基础代理和隐藏源站等能力。
- 如果后续发现大陆访问不稳定，可以再评估：DNS only 直连、香港/大陆友好线路服务器、国内 CDN 或其它加速方案。

本阶段建议先使用：

- `neura.ha7e.com` → Cloudflare A 记录 → `85.113.71.61`
- 先开启橙云 Proxied，如果大陆访问异常，再测试 DNS only。

---

## 5. 具体部署流程

### 阶段 1：清理 GitHub 旧自动部署

在部署仓库中先处理旧自动部署残留：

1. 检查 `.github/workflows/deploy.yml`。
2. 如果旧 workflow 仍指向旧 self-hosted runner，先禁用或改造成新方案。
3. 删除 GitHub 上旧离线 runner。
4. 保留 `docs/AUTOMATED_DEPLOYMENT.md`，但更新为新服务器版本。

建议：新服务器首次部署先手动完成，确认服务稳定后再恢复自动部署。

### 阶段 2：安装服务器基础环境

需要安装：

```bash
apt update
apt install -y git nginx python3-venv python3-pip curl unzip rsync ca-certificates
```

后端依赖 OpenCV/headless 等库，建议同时安装：

```bash
apt install -y libgl1 libglib2.0-0
```

如果前端需要在服务器本地构建，再安装 Node.js 22。但更推荐前端在本地或 GitHub Actions 云端构建。

### 阶段 3：拉取项目

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/Goodman667/NeuraSense-senior-web-deploy.git
cd /opt/neurasense-senior-web-deploy
```

### 阶段 4：配置后端环境变量

创建：

```bash
/opt/neurasense-senior-web-deploy/backend/.env
```

需要写入真实环境变量：

```env
SUPABASE_URL=...
SUPABASE_KEY=...
LLM_API_KEY=...
LLM_MODEL=...
LLM_PROVIDER=...
LLM_API_BASE=...
EMBEDDING_PROVIDER=...
EMBEDDING_MODEL=...
EMBEDDING_DIM=...
ENABLE_VECTOR_MEMORY=...
```

如果暂时不用微信登录：

```env
WECHAT_APP_ID=
WECHAT_APP_SECRET=
```

### 阶段 5：部署后端

```bash
cd /opt/neurasense-senior-web-deploy/backend
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

后端启动命令：

```bash
/opt/neurasense-senior-web-deploy/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 阶段 6：配置 systemd

创建：

```bash
/etc/systemd/system/neurasense-backend.service
```

核心内容：

```ini
[Unit]
Description=NeuraSense FastAPI Backend
After=network.target

[Service]
WorkingDirectory=/opt/neurasense-senior-web-deploy/backend
EnvironmentFile=/opt/neurasense-senior-web-deploy/backend/.env
ExecStart=/opt/neurasense-senior-web-deploy/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启用：

```bash
systemctl daemon-reload
systemctl enable --now neurasense-backend
systemctl status neurasense-backend --no-pager
```

验证：

```bash
curl http://127.0.0.1:8000/health
```

### 阶段 7：部署前端

推荐在本地或 GitHub Actions 构建：

```bash
cd frontend
npm ci
VITE_API_BASE=/api/v1 npm run build
```

将 `frontend/dist` 上传到服务器：

```bash
/var/www/neurasense
```

如果临时在服务器本机构建，需要先装 Node.js 22。

### 阶段 8：配置 Nginx

创建：

```bash
/etc/nginx/sites-available/neurasense
```

推荐配置：

```nginx
server {
    listen 80;
    server_name neura.ha7e.com 85.113.71.61;

    root /var/www/neurasense;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用：

```bash
ln -sf /etc/nginx/sites-available/neurasense /etc/nginx/sites-enabled/neurasense
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

验证：

```bash
curl -I http://85.113.71.61/
curl http://85.113.71.61/api/v1/health
```

---

## 6. Cloudflare 配置方案

### 推荐：Cloudflare DNS A 记录

在 Cloudflare 的 `ha7e.com` DNS 页面：

- Type：`A`
- Name：`neura`
- IPv4 address：`85.113.71.61`
- Proxy status：先开启橙云 Proxied

访问目标：

- `https://neura.ha7e.com/`
- `https://neura.ha7e.com/senior`
- `https://neura.ha7e.com/api/v1/health`

SSL/TLS 建议：

- Cloudflare SSL 模式优先用 `Full`
- 如果后续给源站配置证书，可改为 `Full (strict)`

### 备用：Cloudflare Tunnel

如果后续发现 80/443 入站被限制，或不想暴露服务器端口，再改用 Tunnel：

- Tunnel Service：`http://127.0.0.1:80`
- Public Hostname：`neura.ha7e.com`

但当前这台服务器可以公网直连，因此 Tunnel 不是第一选择。

---

## 7. 自动部署重建方案

旧自动部署绑定旧服务器，不能直接继续使用。

新部署稳定后，再重建自动部署。

### 推荐方案 A：GitHub Actions + SSH 部署

适合这台新服务器，因为它可以公网直连 SSH。

流程：

1. GitHub Hosted Runner 构建前端。
2. 通过 SSH/rsync 上传前端 dist 和后端代码。
3. SSH 执行 `systemctl restart neurasense-backend`。
4. GitHub Actions 访问 `https://neura.ha7e.com/api/v1/health` 做健康检查。

优点：

- 不需要服务器安装 self-hosted runner。
- 不受服务器内存影响。
- GitHub Actions 页面清晰。

需要准备：

- 部署专用 SSH key
- GitHub Secrets：
  - `DEPLOY_HOST=85.113.71.61`
  - `DEPLOY_USER=root` 或专用 deploy 用户
  - `DEPLOY_SSH_KEY=...`

### 备用方案 B：self-hosted runner

如果不想开放 SSH 给 GitHub Runner，可以继续用 self-hosted runner。

但本机仍不建议构建前端，只做部署。

---

## 8. 验证清单

部署完成后必须验证：

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1/api/v1/health
curl -I http://85.113.71.61/
curl http://85.113.71.61/api/v1/health
curl -I https://neura.ha7e.com/
curl -I https://neura.ha7e.com/senior
curl https://neura.ha7e.com/api/v1/health
```

浏览器验证：

- 首页是否能打开
- `/senior` 老年版是否能打开
- 登录/注册是否正常
- 老年版问答是否正常
- AI 总结是否正常
- TTS 是否正常
- 控制台是否有明显 API 报错

---

## 9. 文档更新要求

部署完成后，需要更新或新增：

- `README.md`
- `docs/NEURASENSE_NEW_SERVER_DEPLOYMENT_PLAN_2026-05-16.md`
- `docs/AUTOMATED_DEPLOYMENT.md`

并记录：

- 新服务器 IP
- 系统版本
- 部署方式
- Nginx 配置
- systemd 配置
- Cloudflare DNS / SSL 设置
- 自动部署方式
- 验证结果

---

## 10. 推荐执行顺序

1. 备份/检查部署仓库当前状态。
2. 暂时禁用旧 `.github/workflows/deploy.yml`，避免旧自动部署误触发。
3. 删除 GitHub 旧 self-hosted runner 记录。
4. 安装新服务器基础环境。
5. 克隆 `Goodman667/NeuraSense-senior-web-deploy`。
6. 配置后端 `.env`。
7. 部署后端 venv + systemd。
8. 构建并上传前端。
9. 配置 Nginx。
10. 用 IP 验证 HTTP 访问。
11. 在 Cloudflare 中将 `neura.ha7e.com` 指向 `85.113.71.61`。
12. 验证 HTTPS 域名访问。
13. 更新部署文档。
14. 重建 GitHub Actions 自动部署。
15. 触发一次真实自动部署并确认成功。

---

## 11. 当前结论

这台新服务器比旧服务器更适合部署，因为它可以公网直连，不需要 Tailscale 或 Tunnel 穿透。建议采用传统公网服务器部署方式：

> Nginx + Uvicorn + systemd + Cloudflare DNS/Proxy

Cloudflare 仍然保留，用于域名、HTTPS、代理和基础防护。首次部署应先手动跑通，确认稳定后，再重建自动部署。

---

## 12. 实际执行记录（2026-05-16 23:02 CST）

首次迁移部署已完成，实际采用方案：

> Nginx + Python 3.11 venv（uv 管理独立解释器）+ Uvicorn + systemd + Cloudflare DNS/Proxy

### 12.1 服务器实际状态

- IP：`85.113.71.61`
- Hostname：`substantial-consideration`
- 系统：Debian GNU/Linux 11 bullseye
- Python：系统自带 Python 3.9；生产后端使用 `uv` 安装的独立 Python `3.11.15`
- 后端目录：`/opt/neurasense-senior-web-deploy/backend`
- 前端目录：`/var/www/neurasense`
- 后端环境变量：`/opt/neurasense-senior-web-deploy/backend/.env`
- systemd 服务：`neurasense-backend.service`
- Nginx 配置：`/etc/nginx/sites-available/neurasense`
- 源站证书：`/etc/ssl/neurasense/neura.ha7e.com.crt` 与 `.key`（自签，用于 Cloudflare Full 回源）

### 12.2 实际部署说明

- 前端未在服务器构建；在本地执行 `VITE_API_BASE=/api/v1 npm run build` 后上传 `frontend/dist`。
- 后端未使用 Docker；服务器上通过 Python 3.11 venv 运行 Uvicorn。
- Debian 11 默认仓库没有 `python3.11`，因此安装了 `uv` 到 `/root/.local/bin/uv`，由 `uv` 管理 Python 3.11。
- Nginx 同时监听 `80` 和 `443`，`/api/` 反代到 `127.0.0.1:8000/api/`，其他路径按 SPA 回落到 `index.html`。
- Cloudflare DNS 已将 `neura.ha7e.com` 从旧 Tunnel CNAME 改为 `A neura -> 85.113.71.61`，代理状态为橙云 Proxied。
- Cloudflare SSL/TLS 使用 `Full`。

### 12.3 验证结果

以下检查均已通过：

```bash
systemctl is-active neurasense-backend nginx
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/v1/health
curl -I http://85.113.71.61/
curl http://85.113.71.61/api/v1/health
curl -I https://neura.ha7e.com/
curl -I https://neura.ha7e.com/senior
curl https://neura.ha7e.com/api/v1/health
curl https://neura.ha7e.com/api/v1/tools
curl https://neura.ha7e.com/api/v1/tts/voices
curl https://neura.ha7e.com/api/v1/senior/support-resources
```

关键返回：

- `https://neura.ha7e.com/`：HTTP 200
- `https://neura.ha7e.com/senior`：HTTP 200
- `https://neura.ha7e.com/api/v1/health`：`{"status":"healthy","layer":"api"}`
- 后端和 Nginx 服务状态：`active`
- 最近后端日志未发现 `error` / `exception` / `traceback` / `failed`
- 磁盘：约 20G 总量，部署后约 3.8G 已用，约 17G 可用
- 内存：约 2.9GiB，总体可用约 2.3GiB（含 buffer/cache）

### 12.4 待办

- GitHub Actions 自动部署仍需重建；旧 workflow 中的 self-hosted runner 目标仍不应直接依赖。
- 建议下一步改成 GitHub Hosted Runner 构建前端，再通过 SSH/rsync 部署到新服务器。
- 建议后续把 `/etc/nginx/sites-available/neurasense` 和 `/etc/systemd/system/neurasense-backend.service` 模板纳入仓库 `deploy/` 目录。

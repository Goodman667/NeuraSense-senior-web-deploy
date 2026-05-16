# NeuraSense 自动部署说明

更新时间：2026-05-16

## 1. 当前状态

当前线上服务已经迁移到新服务器，自动部署也已从旧 self-hosted runner 更新为 GitHub Actions + SSH/rsync：

- 正式域名：`https://neura.ha7e.com/`
- 老年版：`https://neura.ha7e.com/senior`
- API 健康检查：`https://neura.ha7e.com/api/v1/health`
- 新服务器 IP：`85.113.71.61`
- 后端服务：`neurasense-backend.service`
- 静态托管与反代：`nginx`

旧自动部署曾依赖旧服务器上的 self-hosted runner。旧服务器已过期，因此当前 `.github/workflows/deploy.yml` 不再使用 self-hosted runner，而是在 GitHub Hosted Runner 完成构建后通过 `scripts/deploy_ssh.sh` 发布到新服务器。

## 2. 当前生产部署方式

当前生产运行方式是：

- 前端：本地或 CI 执行 `VITE_API_BASE=/api/v1 npm run build`，产物同步到 `/var/www/neurasense`
- 后端：`/opt/neurasense-senior-web-deploy/backend`
- Python：通过 `uv` 管理的独立 Python 3.11 venv
- Uvicorn：监听 `127.0.0.1:8000`
- Nginx：监听 `80/443`，并将 `/api/` 反代到后端
- Cloudflare：`A neura -> 85.113.71.61`，橙云 Proxied，SSL/TLS 模式 `Full`

## 3. 不再使用的旧方式

旧部署中的以下内容需要视为失效或待清理：

- 旧服务器 self-hosted runner：`neurasense-server-runner`
- 旧 Cloudflare Tunnel：`neurasense` / `37f4fba6-645f-463c-8380-ffaec6a2f247`
- 旧 `neura.ha7e.com` Tunnel CNAME

如果 GitHub Actions 页面仍显示旧 runner 离线，应在 GitHub 仓库：

`Settings → Actions → Runners`

删除旧 runner 记录。

## 4. 当前自动部署方案

当前采用 GitHub Actions + SSH/rsync：

1. GitHub Hosted Runner checkout 仓库。
2. 安装 Node.js 22。
3. 在 `frontend/` 执行 `npm ci` 与 `VITE_API_BASE=/api/v1 npm run build`。
4. 可选：在 `backend/` 执行 `python -m compileall app`。
5. 通过 SSH/rsync 将：
   - `frontend/dist/` 同步到 `/var/www/neurasense/`
   - `backend/` 同步到 `/opt/neurasense-senior-web-deploy/backend/`，但排除 `.env`、`.venv`、`__pycache__`、运行期数据
6. 在服务器执行：
   - 安装/更新后端依赖
   - `systemctl restart neurasense-backend.service`
   - `curl https://neura.ha7e.com/api/v1/health`

GitHub Secrets：

- `DEPLOY_HOST=85.113.71.61`
- `DEPLOY_USER=root` 或后续新建的专用 deploy 用户
- `DEPLOY_SSH_KEY=<部署私钥>`

相关文件：

- `.github/workflows/deploy.yml`：push 到 `main` 或手动 `workflow_dispatch` 触发。
- `scripts/deploy_ssh.sh`：GitHub Actions 使用的正式 SSH/rsync 部署脚本。
- `scripts/deploy_paramiko.py`：本地 Windows 临时验证脚本，只从环境变量读取密码，不用于 CI。
- `scripts/healthcheck.sh`：部署后的公网健康检查；在服务器本机可设置 `CHECK_LOCAL=1` 同时检查 `127.0.0.1`。

日常使用：

```bash
git add .
git commit -m "fix: ..."
git push origin main
```

或在 GitHub Actions 页面手动点击 `Deploy NeuraSense` → `Run workflow`。

## 5. 手动部署/排障常用命令

服务器上常用命令：

```bash
systemctl status neurasense-backend.service --no-pager
journalctl -u neurasense-backend.service -n 100 --no-pager
systemctl status nginx --no-pager
nginx -t
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/v1/health
curl https://neura.ha7e.com/api/v1/health
```

当前关键路径：

```text
/opt/neurasense-senior-web-deploy/backend
/opt/neurasense-senior-web-deploy/backend/.env
/opt/neurasense-senior-web-deploy/backend/.venv
/var/www/neurasense
/etc/nginx/sites-available/neurasense
/etc/systemd/system/neurasense-backend.service
/etc/ssl/neurasense
```

## 6. 当前验证结果

2026-05-16 23:02 CST 已验证：

- `neurasense-backend`：active
- `nginx`：active
- `https://neura.ha7e.com/`：HTTP 200
- `https://neura.ha7e.com/senior`：HTTP 200
- `https://neura.ha7e.com/api/v1/health`：`{"status":"healthy","layer":"api"}`
- `/api/v1/tools`、`/api/v1/tts/voices`、`/api/v1/senior/support-resources` 可返回数据

2026-05-16 23:51 CST 已本地验证：

- `frontend`：`npm run build` 成功。
- `scripts/route_mode_smoke.mjs`：在 Vite preview 上通过；验证 `/senior/companion` 切换完整功能后 URL 清理为 `/`，再进入“个人中心/工具箱”不会回到老年版。

## 7. 后续建议

自动部署已更新。后续建议：

1. 删除 GitHub 旧离线 self-hosted runner 记录。
2. 后续新建非 root 的专用 deploy 用户，并限制其 sudo 权限到部署所需命令。
3. 定期轮换 `DEPLOY_SSH_KEY`。

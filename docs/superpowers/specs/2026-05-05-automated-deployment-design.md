# NeuraSense Automated Deployment Design

## Goal

为 `Goodman667/NeuraSense-senior-web-deploy` 建立一套可直接用于当前服务器的全自动部署流程，使用户在本地修改并 push 到 `main` 后，站点 `https://neura.ha7e.com` 自动更新。

## Chosen Approach

采用 **GitHub Actions（Hosted build）+ server-side self-hosted runner（deploy）**。

### Why this approach

- 服务器可以主动访问 GitHub，但不适合依赖公网入站 SSH。
- 现有服务已经在服务器本机通过 nginx + uvicorn + systemd 稳定运行。
- 前端生产构建体积较大，而服务器只有约 2GB 内存，不适合把 Vite build 放在 self-hosted runner 上。
- 让 Hosted Runner 负责构建，self-hosted runner 只负责部署，可以避免额外的穿透和凭据管理复杂度，同时规避服务器 OOM。

## Deployment Behavior

- Workflow 在 `main` 分支 push 或手动触发时运行。
- Hosted Runner 完成前端 build 并上传 artifact。
- self-hosted runner 下载 artifact 后同步到 `/var/www/neurasense`。
- 后端代码同步到 `/opt/neurasense-senior-web-deploy/backend`。
- `.env`、`.venv`、以及运行时生成数据默认保留，不被删除。
- 同步完成后自动重启 `neurasense-backend.service` 并做健康检查。

## Guardrails

- 前端使用 `rsync --delete`，确保静态资源版本干净一致。
- 后端代码同步时排除 `data/`，再单独同步仓库中静态 JSON，避免覆盖线上运行时数据。
- backend service restart 通过 `sudoers` 定向授权，仅开放所需的 `systemctl restart/status` 能力。

## Files

- `.github/workflows/deploy.yml`
- `scripts/deploy_self_hosted.sh`
- `scripts/healthcheck.sh`
- `docs/AUTOMATED_DEPLOYMENT.md`

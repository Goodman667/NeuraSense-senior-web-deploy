# NeuraSense Automated Deployment Design

## Goal

为 `Goodman667/NeuraSense-senior-web-deploy` 建立一套可直接用于当前服务器的全自动部署流程，使用户在本地修改并 push 到 `main` 后，站点 `https://neura.ha7e.com` 自动更新。

## Chosen Approach

采用 **GitHub Actions + server-side self-hosted runner**。

### Why this approach

- 服务器可以主动访问 GitHub，但不适合依赖公网入站 SSH。
- 现有服务已经在服务器本机通过 nginx + uvicorn + systemd 稳定运行。
- 让 workflow 直接在服务器本机执行部署，可以避免额外的穿透和凭据管理复杂度。

## Deployment Behavior

- Workflow 在 `main` 分支 push 或手动触发时运行。
- 前端在 runner 工作目录内 build，然后同步到 `/var/www/neurasense`。
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

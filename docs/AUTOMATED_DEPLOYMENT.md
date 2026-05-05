# NeuraSense 自动部署说明

更新时间：2026-05-05

## 1. 当前自动部署架构

本项目当前采用：

- GitHub 仓库：`Goodman667/NeuraSense-senior-web-deploy`
- GitHub Actions workflow：`.github/workflows/deploy.yml`
- 服务器侧 self-hosted runner：`neurasense-server-runner`
- 目标部署目录：
  - 后端：`/opt/neurasense-senior-web-deploy/backend`
  - 前端：`/var/www/neurasense`

触发方式：

- push 到 `main`
- 手动点击 GitHub Actions 的 `Run workflow`

---

## 2. 自动部署流程

每次触发后，GitHub Actions 会自动：

1. checkout 最新仓库代码
2. 编译检查后端源码
3. 安装前端依赖并执行 `npm run build`
4. 将前端 `dist` 同步到 `/var/www/neurasense`
5. 将后端代码同步到 `/opt/neurasense-senior-web-deploy/backend`
6. 保留线上 `.env`、`.venv` 与运行期生成数据
7. 安装/更新后端依赖
8. 重启 `neurasense-backend.service`
9. 自动执行健康检查

---

## 3. 为什么使用 self-hosted runner

因为当前服务器：

- 可以主动访问 GitHub
- 但不适合依赖公网 SSH 入站部署
- 同时已有 Tailscale / Cloudflare Tunnel 结构

所以 self-hosted runner 是最稳妥的自动化方案。

---

## 4. 日常使用方法

以后你只需要：

```bash
git add .
git commit -m "feat: your change"
git push origin main
```

然后等待 GitHub Actions 跑完即可。

成功后线上会自动更新：

- `https://neura.ha7e.com/`
- `https://neura.ha7e.com/senior`

---

## 5. 重要注意事项

### 5.1 前端改动

前端页面、样式、交互、老年版卡片等改动，push 后会自动 build 并上线。

### 5.2 后端改动

后端接口、AI 逻辑、问答分析、建议生成等改动，push 后会自动同步并重启服务。

### 5.3 不会被自动覆盖的内容

自动部署已刻意保留：

- 服务器上的 `backend/.env`
- 服务器上的 `backend/.venv`
- 服务器运行期间生成的数据文件

因此线上用户数据和密钥不会因为一次代码部署被清空。

---

## 6. 故障排查

如果自动部署失败，优先看：

1. GitHub 仓库 → Actions → 对应 workflow 日志
2. 服务器 runner 服务状态
3. 后端服务状态

服务器常用命令：

```bash
systemctl status actions.runner.Goodman667-NeuraSense-senior-web-deploy.neurasense-server-runner.service
systemctl status neurasense-backend.service
journalctl -u neurasense-backend -n 100 --no-pager
```

# NeuraSense 当前版本服务器部署记录（Tailscale + 主机直装 + Cloudflare Tunnel）

更新时间：2026-05-05

## 1. 部署目标

本次部署对象为当前本地版本的 NeuraSense Web 项目，包含：

- 标准版 Web
- 老年版 Web（`/senior`）
- FastAPI 后端
- Supabase / LLM 真实环境接入

服务器网络环境较特殊：

- 服务器公网出口存在防火墙限制，公网无法直接入站访问
- 服务器管理入口通过 **Tailscale 内网地址** 访问
- 管理地址：`100.107.89.119`

因此本次部署分成三层：

1. **本机服务运行**：nginx + uvicorn
2. **内网访问**：Tailscale
3. **公网 HTTPS**：Cloudflare Tunnel

---

## 2. 服务器信息

- 系统：Ubuntu 24.04.4 LTS
- Python：3.12
- Node：22.x
- Docker：已安装，但本次**未作为最终运行方案**使用

### 2.1 为什么最终没有使用 Docker

虽然服务器安装了 Docker，但容器实际启动时出现 overlayfs 挂载权限错误，表现为：

- `failed to mount ... overlay ... permission denied`
- `docker run hello-world` 也无法正常运行

这说明问题不在项目代码，而在当前服务器宿主环境对 Docker 的挂载能力有限制。

因此本次最终采用：

- **前端：Vite build 后静态托管到 nginx**
- **后端：Python venv + uvicorn + systemd**
- **nginx 反代 `/api/v1` 到本机 8000**
- **Cloudflare Tunnel 暴露正式 HTTPS 域名**

---

## 3. 实际部署目录

### 3.1 项目目录

服务器端部署目录：

```bash
/opt/neurasense-senior-web-deploy
```

### 3.2 前端静态文件目录

```bash
/var/www/neurasense
```

### 3.3 后端运行目录

```bash
/opt/neurasense-senior-web-deploy/backend
```

虚拟环境：

```bash
/opt/neurasense-senior-web-deploy/backend/.venv
```

---

## 4. 安装的软件

实际安装的软件包括：

```bash
nginx
python3-venv
python3-pip
libgl1
libglib2.0-0
unzip
cloudflared
```

说明：

- `libgl1` / `libglib2.0-0` 是 OpenCV 等依赖运行所需
- `cloudflared` 用于建立正式 Cloudflare Tunnel

---

## 5. 环境变量来源

本次部署使用的是本地已有正式环境变量，而不是纯演示配置。

核心变量包括：

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

后端环境文件位于：

```bash
/opt/neurasense-senior-web-deploy/backend/.env
```

说明：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`

当前可以留空，不影响网页端主要演示流程。

---

## 6. 前端部署方式

### 6.1 本地构建

本地使用以下方式构建前端：

```bash
cd frontend
npm install
VITE_API_BASE=/api/v1 npm run build
```

这样前端会默认通过同域 `/api/v1` 请求后端，而不是写死远程地址。

### 6.2 上传方式

构建后的 `dist` 被打包后上传到服务器，再解压到：

```bash
/var/www/neurasense
```

---

## 7. 后端部署方式

### 7.1 创建虚拟环境

```bash
cd /opt/neurasense-senior-web-deploy/backend
python3 -m venv .venv
. .venv/bin/activate
```

### 7.2 安装依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 7.3 启动命令

实际运行命令：

```bash
/opt/neurasense-senior-web-deploy/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## 8. systemd 服务

后端已经注册为 systemd 服务：

```bash
neurasense-backend.service
```

服务文件：

```bash
/etc/systemd/system/neurasense-backend.service
```

作用：

- 开机自启
- 异常自动重启
- 统一日志管理

常用命令：

```bash
systemctl status neurasense-backend
systemctl restart neurasense-backend
journalctl -u neurasense-backend -n 100 --no-pager
```

---

## 9. nginx 配置

站点配置文件：

```bash
/etc/nginx/sites-available/neurasense
```

启用方式：

```bash
ln -sf /etc/nginx/sites-available/neurasense /etc/nginx/sites-enabled/neurasense
rm -f /etc/nginx/sites-enabled/default
```

当前逻辑：

- `/` → 前端静态页面
- `/api/` → 反代到 `127.0.0.1:8000/api/`
- SPA 路由通过 `try_files ... /index.html`

常用命令：

```bash
nginx -t
systemctl restart nginx
systemctl status nginx
```

---

## 10. 当前访问方式

### 10.1 内网（Tailscale）访问

当前稳定可用地址：

- 首页：`http://100.107.89.119/`
- 老年版：`http://100.107.89.119/senior`
- API 健康检查：`http://100.107.89.119/api/v1/health`

### 10.2 正式 HTTPS 公网访问

当前已通过 Cloudflare Tunnel 绑定正式域名：

- 首页：[https://neura.ha7e.com/](https://neura.ha7e.com/)
- 老年版：[https://neura.ha7e.com/senior](https://neura.ha7e.com/senior)

Tunnel 绑定方式：

- Tunnel 名称：`neurasense`
- Tunnel ID：`37f4fba6-645f-463c-8380-ffaec6a2f247`
- Public Hostname：`neura.ha7e.com`
- Service 类型：`HTTP`
- Service 地址：`127.0.0.1:80`

### 10.3 访问注意事项

如果浏览器打不开内网地址，但命令行能访问，优先检查：

- 本机是否开启 Clash / 系统代理
- 是否把 `100.107.89.119` 流量走进了本地代理

已确认：

- 在本机 PowerShell 用 `curl.exe http://100.107.89.119/` 可以直接访问
- 浏览器出现 `502` 时，根因是本机代理（如 Clash）拦截，而不是服务器服务异常

建议：

- 访问内网地址时关闭 Clash 系统代理
- 或将 `100.107.89.119` 配置为直连（bypass）

---

## 11. 健康检查结果

部署完成后已验证：

### 11.1 本机后端健康检查

```bash
curl http://127.0.0.1:8000/health
```

返回：

```json
{"status":"healthy"}
```

### 11.2 经 nginx 的 API 健康检查

```bash
curl http://127.0.0.1/api/v1/health
```

返回：

```json
{"status":"healthy","layer":"api"}
```

### 11.3 首页检查

```bash
curl -I http://127.0.0.1/
```

返回 `HTTP/1.1 200 OK`。

### 11.4 正式域名 HTTPS 检查

```bash
curl -I https://neura.ha7e.com/
curl -I https://neura.ha7e.com/senior
```

两者均已返回 `HTTP/1.1 200 OK`。

---

## 12. Cloudflare Tunnel 状态

### 12.1 当前正式 Tunnel

服务器上运行的正式服务：

```bash
neurasense-cloudflared.service
```

作用：

- 通过 named tunnel 把本机 `127.0.0.1:80` 暴露到 Cloudflare
- 提供 `neura.ha7e.com` 的 HTTPS 访问

常用命令：

```bash
systemctl status neurasense-cloudflared
systemctl restart neurasense-cloudflared
journalctl -u neurasense-cloudflared -n 100 --no-pager
```

### 12.2 Quick Tunnel 说明

前期曾使用 Cloudflare Quick Tunnel 做临时公网访问测试，后续已停用，改为正式域名方案。

因此当前正式展示应优先使用：

- `https://neura.ha7e.com/`
- `https://neura.ha7e.com/senior`

---

## 13. 后续推荐动作

### 13.1 建议立即保留

1. 备份服务器端 nginx 配置
2. 备份 systemd 服务文件
3. 备份后端 `.env`
4. 保存当前前端构建版本与仓库提交信息

### 13.2 建议后续优化

1. 增加日志轮转与归档策略
2. 增加服务器迁移脚本
3. 如未来宿主环境允许，再切回 Docker 标准化部署
4. 如果以后要面向中国大陆稳定访问，单独评估更适合的公网方案

---

## 14. 一句话总结

本次 NeuraSense 当前网页版本已经成功部署到 Tailscale 可达服务器，虽然 Docker 因宿主限制不可用，但通过 **nginx + venv + uvicorn + systemd + Cloudflare Tunnel** 的方式已稳定跑通；当前既可通过内网地址访问，也可通过正式 HTTPS 域名 `https://neura.ha7e.com/` 对外展示。

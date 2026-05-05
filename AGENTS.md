# NeuraSense — 项目上下文

详细介绍见 [PROJECT_BRIEF.md](PROJECT_BRIEF.md)，以下是核心要点：

- **项目**：NeuraSense AI 心理健康平台，线上地址 neurasense.cc
- **前端**：React 19 + TypeScript + Vite + TailwindCSS，部署在 **Vercel**
- **后端**：Python FastAPI，部署在 **Render**，地址 api.neurasense.cc
- **数据库**：Supabase PostgreSQL
- **LLM**：ZhipuAI GLM-4-Flash（环境变量 `ZHIPU_API_KEY`，代码内映射为 `LLM_API_KEY`）
- **前端入口**：`frontend/src/App.tsx`（路由：landing → onboarding → main）
- **API 入口**：`backend/app/main.py`，所有路由挂载在 `/api/v1`

## 技术约束（不可更改）

- 前端框架：React 19 + TypeScript + Vite + TailwindCSS（不换）
- 后端框架：FastAPI + Python 3.11+（不换）
- 主数据库：Supabase PostgreSQL（通过 supabase-py SDK）
- 认证：JWT token，通过 `?token=` URL 参数或 Authorization header
- CORS：`allow_origins=["*"]`（开发阶段无需处理）

## 项目目录结构

```
frontend/src/
├── App.tsx          # 路由入口
├── components/      # 通用组件
├── hooks/           # 自定义 hooks
├── lib/             # 工具函数
├── types/           # TypeScript 类型定义
└── pages/           # 页面组件

backend/app/
├── main.py          # FastAPI 入口
├── routers/         # API 路由
├── services/        # 业务逻辑
├── models/          # 数据模型
└── data/            # 数据存储
```

## 错误处理模式

- 后端 API 统一返回 `{ "success": bool, "data": ..., "error": str }` 格式
- 前端用 try-catch 包裹所有 API 调用，错误时显示用户友好提示

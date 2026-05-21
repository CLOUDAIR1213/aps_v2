# APS v2 快速启动

## 一键启动（两个终端）

### 终端 1 — 后端

```bash
cd /c/Users/48295/Desktop/aps_v2/backend
/c/Users/48295/.conda/envs/aps/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端地址：http://127.0.0.1:8000

### 终端 2 — 前端

```bash
cd /c/Users/48295/Desktop/aps_v2/frontend
npm run dev
```

前端地址：http://localhost:5173

## 登录账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| planner | planner123 | 计划员 |
| viewer | viewer123 | 查看者 |

## 注意事项

- 后端必须用 conda `aps` 环境的 Python，系统默认 Python 缺少 `asyncmy` 模块
- MySQL 连接串在 `backend/app/database.py` 中，默认密码 `123456`
- 前端 API 地址可通过 `VITE_API_BASE_URL` 覆盖；未设置时默认指向 `http://127.0.0.1:8000`

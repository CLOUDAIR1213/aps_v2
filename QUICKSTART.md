# APS v2 快速启动

本文只记录本地启动、环境、账号、测试和常见问题。项目现状见 [README.md](README.md)。

## 环境要求

- Windows 本机开发环境。
- Python 环境：`C:\Users\48295\.conda\envs\aps\python.exe`。
- Node.js + npm。
- MySQL 8，用于目标开发数据库。
- 后端依赖来自 `backend/requirements.txt`。

## 后端启动

推荐在 PowerShell 中运行：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
$env:DATABASE_URL = "mysql+asyncmy://root:123456@127.0.0.1:3306/aps_v2"
C:\Users\48295\.conda\envs\aps\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端地址：

```text
http://127.0.0.1:8000
```

接口文档：

```text
http://127.0.0.1:8000/docs
```

## 前端启动

首次启动先安装依赖：

```powershell
cd C:\Users\48295\Desktop\aps_v2\frontend
npm install
```

日常启动：

```powershell
cd C:\Users\48295\Desktop\aps_v2\frontend
npm run dev
```

前端地址：

```text
http://localhost:5173
```

如需覆盖后端地址：

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev
```

## 数据库与迁移

本地 MySQL 默认连接串：

```text
mysql+asyncmy://root:123456@127.0.0.1:3306/aps_v2
```

首次准备数据库：

```sql
CREATE DATABASE IF NOT EXISTS aps_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

执行迁移：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
$env:DATABASE_URL = "mysql+asyncmy://root:123456@127.0.0.1:3306/aps_v2"
C:\Users\48295\.conda\envs\aps\python.exe -m alembic upgrade head
```

查看当前迁移版本：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
$env:DATABASE_URL = "mysql+asyncmy://root:123456@127.0.0.1:3306/aps_v2"
C:\Users\48295\.conda\envs\aps\python.exe -m alembic current
```

## 登录账号

当前登录只用于前端本地会话，不作为后端业务接口鉴权门禁；后端业务 API 以功能联调和排产主流程可用为优先。

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| planner | planner123 | 计划员 |
| viewer | viewer123 | 查看者 |

## 验证命令

前端构建：

```powershell
cd C:\Users\48295\Desktop\aps_v2\frontend
npm run test:nav
npm run build
```

后端语法编译：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
C:\Users\48295\.conda\envs\aps\python.exe -m compileall app alembic
```

后端测试推荐使用测试数据库连接串。当前已验证 SQLite 测试连接串可跑通现有测试：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
$env:PYTHONPATH = "."
$env:DATABASE_URL = "sqlite+aiosqlite:///./test_aps_tmp.db"
python -m pytest tests -q
```

如果要在 `aps` conda 环境里直接跑测试，需要先安装测试依赖：

```powershell
C:\Users\48295\.conda\envs\aps\python.exe -m pip install pytest aiosqlite
```

## 常见问题

- 报 `ModuleNotFoundError: asyncmy`：通常是没有使用 `aps` conda 环境，或该环境没有安装后端依赖。
- 报 `No module named app`：从 `backend` 目录运行测试，或设置 `$env:PYTHONPATH = "."`。
- `aps` 环境报 `No module named pytest`：安装 `pytest` 和 `aiosqlite` 后再跑测试。
- 前端请求不到后端：确认后端运行在 `127.0.0.1:8000`，或设置 `VITE_API_BASE_URL`。

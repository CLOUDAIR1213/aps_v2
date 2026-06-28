# AGENTS.md

## 适用范围

本说明适用于 `C:\Users\48295\Desktop\aps_v2`。

APS v2 是一个面向机械加工小企业的轻量级生产排产系统。当前主线是 `production_*` 生产域模型，不是旧 demo 表或旧 demo API。

## 每次对话开始时

1. 先以当前真实代码为准，不只依赖记忆。
2. 修改前先运行 `git status --short`。
3. 只阅读和任务相关的文档：
   - `README.md`：当前项目状态。
   - `QUICKSTART.md`：启动、环境变量、账号、测试命令。
   - `PLAN1.md`、`plan2.md`、`plan3.md`：阶段背景。
   - `plan-ui-refactor.md`：前端样式和布局。
   - `plan-database.md`：数据库、迁移和数据策略。
   - `plan-scheduling-hierarchy.md`：排产层级和依赖规则。
   - `plan-dispatch-batching.md`：派工批量化和加工单范围。
   - `plan-import-operation-notes.md`：工序加工要求备注。
4. 当前代码和真实命令输出优先于过期文档。
5. 修改范围要严格跟随用户请求，不清理无关脏文件。

## 项目事实

- 后端：FastAPI + async SQLAlchemy。
- 前端：React + Vite。
- 目标数据库：MySQL 8 + Alembic。
- SQLite 只用于本地轻量测试，不代表目标部署数据库。
- 后端主业务路由主要在 `backend/app/api/production.py`。
- 后端主业务逻辑主要在 `backend/app/services/production_service.py`。
- 前端路由和导航在 `frontend/src/router.jsx` 和 `frontend/src/navigation.js`。
- 当前业务页面包括工单导入、排产驾驶台、订单完工表、派工、加工单中心、外协任务、生产排班表、甘特图、基础配置和交付风险看板。

## 业务规则

- 人员只用于派工、负荷统计和后续执行记录。
- 除非用户明确改变规则，否则人员不能作为排产硬约束。
- 内部工序按工段产能和工序依赖排产。
- 外协工序通过外协产能槽位和预计回厂时间参与排产时间计算。
- 派工分摊必须回写到原始 `schedule_item`；不要为派工汇总视图新增真实合并任务模型。
- `requirement_note` 表示导入或编辑得到的工序加工要求。
- `external_note` 表示外协执行反馈。不要和 `requirement_note` 混用。
- 加工单中心当前是从已完整派工的内部任务生成 Excel 执行单据，不是完整 MES 生命周期。

## 实现优先级

- 优先保证功能正确和前后端接口对齐，不优先做大规模架构清理。
- 登录和鉴权保持简单，除非用户明确要求加强。
- 涉及排产时，先看 `backend/app/services/production_service.py`，重点关注 `run_production_scheduling`、重算逻辑、外协任务逻辑和派工保存流程。
- 涉及前后端接口时，同时检查 `frontend/src/api/production.js` 和对应后端路由。
- 涉及 UI bug 时，优先做小范围组件/CSS 修复，不随意改业务行为。
- 保持 `plan-ui-refactor.md` 中定义的浅色、紧凑、生产管理后台风格。

## 本地启动

后端：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
$env:DATABASE_URL = "mysql+asyncmy://root:123456@127.0.0.1:3306/aps_v2"
C:\Users\48295\.conda\envs\aps\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

前端：

```powershell
cd C:\Users\48295\Desktop\aps_v2\frontend
npm run dev
```

标准地址：

- 后端：`http://127.0.0.1:8000`
- API 文档：`http://127.0.0.1:8000/docs`
- 前端：`http://localhost:5173`

如果用户说“打开前后端”，先检查端口是否已有服务，再启动标准后端和前端服务。

## 验证命令

前端：

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

后端轻量本地测试：

```powershell
cd C:\Users\48295\Desktop\aps_v2\backend
$env:PYTHONPATH = "."
$env:DATABASE_URL = "sqlite+aiosqlite:///./test_aps_tmp.db"
python -m pytest tests -q
```

如果缺少 `asyncmy`、`pytest` 或 `aiosqlite`，说明具体阻塞，并选择最小可行验证方式。

## 文档规则

- 不要在代码、UI 流程和验证都不足时，把某个阶段标记为完成。
- 专项文档保持专项文档，不要把局部优化扩写成新的 `plan4`。
- `README.md` 应保持为当前状态索引，不要塞入大量局部计划细节。
- 同步文档时，只更新和已验证代码状态直接相关的文件。

## cc-connect 集成

本项目通过 cc-connect 管理。

在这台 Windows 机器上，优先使用：

```powershell
& "C:\Users\48295\AppData\Roaming\npm\node_modules\cc-connect\bin\cc-connect.exe" ...
```

如果当前 shell 中普通 `cc-connect` 命令可用，也可以使用。

创建定时任务：

```powershell
cc-connect cron add --cron "<min> <hour> <day> <month> <weekday>" --prompt "<任务描述>" --desc "<简短标签>"
```

不要指定 `--project` 或 `--session-key`；`CC_PROJECT` 和 `CC_SESSION_KEY` 已经设置好。

给当前聊天发送消息：

```powershell
cc-connect send -m "短消息"
```

长消息使用 `cc-connect send --stdin`。

# APS v2 — 轻量级生产排产系统

APS v2 是一个面向机械加工小企业的生产排产系统。当前主线已经从早期 demo 表和 demo API 切换到 `production_*` 生产域模型，重点是让计划员能完成工单导入、可控排产、派工、外协跟踪和订单交付风险判断。

本文只记录当前真实状态和文档入口。启动、环境、账号、测试命令见 [QUICKSTART.md](QUICKSTART.md)；阶段规划和历史决策见下方计划文档。

## 当前真实状态

- 后端是 FastAPI + SQLAlchemy async，主业务接口集中在 `backend/app/api/production.py`。
- 前端是 React + Vite，主业务路由集中在 `frontend/src/router.jsx` 和 `frontend/src/navigation.js`。
- 生产域主线是 `production_*` 表；旧 demo 后端模块已经从当前主线删除。
- 数据库目标环境是 MySQL 8 + Alembic；当前新增外协相关迁移为 `backend/alembic/versions/202605240001_external_task_management.py`。
- SQLite 只适合本地轻量测试，不代表目标部署数据库。
- 前端已具备计划员工作台、基础数据、工单导入、排产驾驶台、订单完工表、派工、加工单中心、生产排班表、甘特图、外协任务、交付风险看板等页面入口。
- 前端 UI 已按 `plan-ui-refactor.md` 进入第一轮简约后台化：浅色导航、顶部模块栏、紧凑工具条、表格优先和摘要条已覆盖主流程页面。
- 当前排产不是数学最优求解器，采用可解释的规则式排产和资源可用性检查。
- 外协任务已经进入生产主流程：可识别外协工序、维护状态、预计回厂时间，并触发后续排产时间重算。
- 人员只用于派工、负荷统计和后续执行记录，不作为排产硬约束；内部工序按工段产能排产。

## 已实现能力

### 基础数据

- 工段、设备、人员、资源组、工序映射、导入映射等基础资料。
- 工段支持外协产能槽位、默认外协周期和默认供应商字段。
- 前端提供基础资料维护入口，并围绕排产前置条件展示当前准备状态。

### 工单导入

- 支持按“焊接件明细”Excel 模板导入生产工单。
- 支持 NO 编号层级、工序映射、外协标记、逗号小数工时、空外协列容错。
- 导入后进入 `production_work_orders`、`production_work_order_items`、`production_work_order_operations` 等生产域表。

### 排产

- 计划员可以选择排产开始日期和参与排产的订单。
- 支持 `pending` 和已排过的 `scheduled` 订单进入重排。
- 支持当前方案贯穿：订单完工表、派工、生产排班表、甘特图和风险看板围绕同一个方案展示。
- 支持按工序依赖、工段产能占用、外协回厂时间计算计划时间；人员后续在派工页分配，设备当前更多用于展示和后续扩展。
- 失败时不应创建空方案，避免污染历史方案列表。

### 派工与执行视图

- 派工页支持人员分配、跨工段人员提示、人员负荷展示、按工序汇总批量派工和自动分配。
- 加工单中心可从已完整派工的内部任务生成 Excel 加工单，未派工和待补足任务不会进入正式导出。
- 生产排班表支持按方案查看工序排程，并区分内部工序和外协工序。
- 甘特图用于展示方案内排程时间线。

### 前端 UI

- `plan-ui-refactor.md` 是唯一 UI 规划和管理文档；`ui-mockups/README.md` 只作为历史静态原型说明保留。
- 全局壳层已采用浅色生产管理后台风格，顶部模块栏由 `frontend/src/components/layout/PageHeader.jsx` 提供。
- 主流程页面已统一到紧凑工具条、白底表格、低饱和蓝色主操作和状态标签风格。
- `frontend/src/components/common/CompactSummaryStrip.jsx` 已用于替代页面级大 KPI 卡片，减少首屏占用。
- 当前 UI 已通过前端构建验证，但尚未完成逐页截图级视觉 QA。

### 外协任务

- 外协工序可以进入独立外协任务页面。
- 支持查看外协状态、供应商、预计回厂时间、送出/回厂时间和备注。
- 外协预计回厂时间变化后，可重算后续内部工序时间。

### 结果与管理看板

- 订单完工表展示订单预计完成、延期风险、关键工序和明细下钻。
- 支持排产结果、资源负荷、派工负荷和加工单 Excel 导出。
- 管理看板聚焦交付风险、资源瓶颈、外协风险和问题状态，不作为炫技大屏。

## 当前边界

- 尚未实现拖拽式人工改排。
- 尚未把物料齐套、库存、采购到货作为硬约束。
- 尚未接入 MES 现场开工、完工、异常反馈闭环。
- 加工单中心当前只提供基于已完整派工任务的 Excel 导出和导出批次记录，尚未实现加工单下发、作废、版本追溯和现场扫码报工。
- 尚未实现节假日、设备保养、请假、加班审批等复杂日历。
- 尚未接入 OR-Tools 或其他优化求解器。
- 锁单入口和状态有部分结构支撑，但当前重排不复制或避让锁定计划，不应视为硬约束完成。
- 旧 demo 表清理已新增 Alembic 迁移 `202606050001_drop_legacy_demo_tables.py`；历史基线迁移不直接改写。

## 文档分层

- [QUICKSTART.md](QUICKSTART.md)：启动、环境变量、数据库、账号、测试和常见问题。
- [PLAN1.md](PLAN1.md)：一阶段基础数据和生产域主线。
- [plan2.md](plan2.md)：二阶段可控排产、订单完工解释、导出和经营问题口径。
- [plan3.md](plan3.md)：老板交付风险看板和管理层问题识别。
- [plan-ui-refactor.md](plan-ui-refactor.md)：前端 UI 和页面逻辑重构规划。
- [plan-database.md](plan-database.md)：数据库架构、迁移、旧表清理和数据策略。
- [plan-scheduling-hierarchy.md](plan-scheduling-hierarchy.md)：排产层级、工序依赖和调度口径。

### 专项/局部优化文档

这类文档只记录某个模块的局部优化需求和验收口径，不代表 APS v2 新阶段主线，也不代表功能已经实现。

- [plan-dispatch-batching.md](plan-dispatch-batching.md)：派工批量化、同类工序工时汇总、批量选择、批量派工、人员工时汇总、生产排班表展示和加工单导出口径。

## 项目结构

```text
aps_v2/
  backend/
    app/
      api/                 # FastAPI 路由
      models/              # SQLAlchemy 模型
      schemas/             # Pydantic schema
      services/            # 导入、排产、看板等业务逻辑
    alembic/versions/      # 数据库迁移
    tests/                 # 后端测试
  frontend/
    src/
      api/                 # 前端 API 封装
      components/          # 业务组件
      pages/               # 页面
      router.jsx           # 路由
      navigation.js        # 导航
```

## 最近复核结论

最近一次复核使用的主要证据：

- `backend/app/models/production.py`：生产域模型、外协字段、人员分配、锁单和问题状态结构。
- `backend/app/api/production.py`：排产、结果、派工、加工单、外协任务、管理看板、导出等接口。
- `frontend/src/router.jsx`：主流程页面路由。
- `frontend/src/components/layout/PageHeader.jsx`、`frontend/src/components/common/CompactSummaryStrip.jsx` 和 `frontend/src/styles.css`：第一轮简约后台 UI 落地。
- `frontend/src/pages/Scheduling.jsx`、`ScheduleResults.jsx`、`Dispatch.jsx`、`WorkOrderTickets.jsx`、`ScheduleBoard.jsx`、`WorkOrderImport.jsx`、`SetupCenter.jsx`、`ExternalTasks.jsx`、`Gantt.jsx`、`ManagementDashboard.jsx`：主流程页面 UI 收敛。
- `backend/tests/test_auth_authorization.py`、`backend/tests/test_external_import_and_slots.py` 和 `backend/tests/test_production_hierarchy.py`：认证授权、导入、层级、外协和排产相关测试。

最近一次针对加工单中心增量的验证结果：

- `python -m compileall backend\app\schemas\production.py backend\app\services\production_service.py backend\app\api\production.py` 通过。
- `frontend` 执行 `npm run build` 通过。
- `frontend` 执行 `npm run test:nav` 通过。
- 本次未重新运行完整后端测试。

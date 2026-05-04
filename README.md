# APS v2 — 轻量级生产排产系统

面向机械加工、小批量多品种生产场景的 APS（Advanced Planning and Scheduling）系统。目标是让计划员导入 Excel 工艺表后，系统自动排产并回答每张订单什么时候完工、是否延期、为什么延期。

---

## 当前进度总览

| 阶段 | 定位 | 状态 |
|------|------|------|
| PLAN1 核心基础数据 | 让系统知道有哪些工段、设备、人员 | **已完成** |
| PLAN2 可控排产与导出 | 计划员选择订单排产、锁单、导出 | **已完成**（选择订单排产、排产开始日期、整单锁定、重排避让、Excel 导出均已完成） |
| PLAN3 经营问题看板 | 老板看交付风险 | **未开始** |

---

## PLAN1 完成清单

### 已有表（排产主线）

| 模型 | 表名 | 说明 |
|------|------|------|
| WorkCenter | work_centers | 工段/资源类型（下料、焊接、5m龙门、钣金外等），含 status、description |
| ResourceMachine | resource_machines | 工段下的具体设备，状态：active/disabled/maintenance/stopped |
| Personnel | personnel | 人员主数据，后续用于执行反馈记录"谁做了" |
| WorkCenterPersonnel | work_center_personnel | 人员与工段多对多关系 |
| WorkOrder | work_orders | 工单主表（订单号、客户、产品、数量、优先级、交期） |
| ImportBatch | import_batches | 一次 Excel 导入批次 |
| Part | parts | 部件/零件，支持上级部件与子件层级 |
| ProductionOperation | production_operations | 零件工序任务，排产最小粒度 |
| OperationDependency | operation_dependencies | 工序前后置关系（FS） |
| ProductionSchedule | production_schedules | 排产方案版本 |
| ProductionScheduleItem | production_schedule_items | 排产方案下的具体任务安排 |

### 本次新增表

| 模型 | 表名 | 说明 |
|------|------|------|
| OperationMappingRule | operation_mapping_rules | Excel 工序列名到系统工段的映射规则，支持持久化复用 |
| ResourceGroup | resource_groups | 资源组分类（编码、名称、说明、状态） |
| ResourceGroupMember | resource_group_members | 资源组成员（可关联工段、设备、人员，polymorphic 关系） |
| ProductionScheduleOrderLock | production_schedule_order_locks | 整单锁定状态（方案+工单唯一） |
| ExportBatch | export_batches | 导出记录 |

### 字段变更

| 表 | 变更 | 说明 |
|------|------|------|
| work_centers | 新增 status | VARCHAR(30)，值 active / disabled |
| work_centers | 新增 description | TEXT，可选说明 |
| resource_machines | status 默认值 | 从 idle 改为 active，统一为：active / disabled / maintenance / stopped |
| production_schedules | 新增 start_time | DATETIME，排产起始时间 |
| production_schedules | 新增 base_schedule_id | INTEGER，基于哪个方案重排（FK to self） |
| production_schedules | 新增 run_params_json | TEXT，排产参数 JSON |
| production_schedule_items | 新增 locked | BOOLEAN，默认 false |
| production_schedule_items | 新增 locked_at | DATETIME |
| production_schedule_items | 新增 locked_by | VARCHAR(80) |
| production_schedule_items | 新增 lock_reason | TEXT |

---

## PLAN2 完成情况

### 已完成

- **规则排产引擎**：按订单优先级、交期、导入时间排序，支持工序依赖（FS），同一设备任务不重叠
- **固定班制**：周一到周六 08:00-12:00、13:00-17:00，周日休息，跨午休/下班/周日自动顺延
- **外协工序**：参与时间约束但不占内部设备，按工时或默认周期排入日历
- **选择订单排产**：支持选择订单范围和指定开始日期运行排产
- **排产开始日期**：支持从指定日期开始排，系统自动校正到工作时间
- **整单锁定**：支持在排产总览中对单张订单锁定/解锁
- **重排策略**：新方案继承已锁订单占用，未锁订单避让已锁资源
- **订单级排产总览**：预计开始、预计完成、延期天数、主要瓶颈、锁定状态
- **订单排产详情**：下钻到零件级时间线、工序级明细、FS 依赖解释
- **资源负荷**：按设备返回 busy_minutes / available_minutes / utilization / status（bottleneck / normal / idle）
- **延期风险分析**：自动生成中文原因和建议
- **生产排班表**：Excel 风格日期矩阵，支持工段/设备/人员视图模式，横向滚动
- **甘特图**：按设备时间轴展示任务
- **历史方案**：每次排产生成新版本，不覆盖旧方案
- **Excel 导出**：四张 Sheet（订单完工表、设备排班表、资源负荷表、延期风险表）

### 未完成（下一步优先）

| 功能 | 说明 |
|------|------|
| 排产方案比较 | 对比两个方案的差异 |
| 批量锁定/解锁 | 一键锁定或解锁多张订单 |

---

## PLAN3 完成情况

未开始。计划内容：

- 经营问题看板页面（老板交付风险视角）
- 默认未来 30 天
- 风险类型：订单延期、临近交期、资源瓶颈、关键工序阻塞、外协影响
- 轻量问题处理状态（open / processing / resolved / paused）+ 备注
- Excel 导出（6 个 Sheet）
- 新增表：business_risk_issue_states

---

## 技术栈

### 后端

| 组件 | 技术 |
|------|------|
| 框架 | FastAPI |
| ORM | SQLAlchemy 2.x（async） |
| 数据库 | MySQL 8.0（InnoDB, utf8mb4） |
| 迁移 | Alembic |
| 驱动 | asyncmy |
| Excel | openpyxl |
| 表单 | python-multipart |

### 前端

| 组件 | 技术 |
|------|------|
| 框架 | React |
| 构建 | Vite |
| 路由 | React Router |
| HTTP | Axios |
| 样式 | 纯 CSS（工业管理系统风格） |

---

## 后端接口一览

### 登录

- `POST /api/auth/login`

### 工段与设备

- `GET /api/work-centers` — 列出工段
- `POST /api/work-centers` — 新增工段（自动生成设备）
- `PUT /api/work-centers/{id}` — 编辑工段
- `PATCH /api/work-centers/{id}/disable` — 禁用工段
- `GET /api/resource-machines` — 列出设备
- `POST /api/resource-machines` — 新增设备
- `PUT /api/resource-machines/{id}` — 编辑设备

### 人员

- `GET /api/personnel` — 人员花名册（含工段关联）
- `POST /api/personnel/import` — 上传排班表导入人员

### 工序映射

- `GET /api/operation-mapping-rules` — 列出映射规则
- `POST /api/operation-mapping-rules` — 创建映射规则
- `PUT /api/operation-mapping-rules/{id}` — 编辑映射规则

### 资源组

- `GET /api/resource-groups` — 列出资源组（含成员）
- `POST /api/resource-groups` — 创建资源组
- `PUT /api/resource-groups/{id}` — 编辑资源组
- `POST /api/resource-groups/{id}/members` — 添加成员
- `DELETE /api/resource-groups/{id}/members/{mid}` — 移除成员

### 工单导入

- `POST /api/imports/work-orders/preview` — 上传工艺表预览（不写库）
- `POST /api/imports/work-orders/commit` — 确认入库

### 排产

- `POST /api/production/scheduling/run` — 运行排产（支持 start_time, work_order_ids, base_schedule_id, keep_locked）
- `GET /api/production/scheduling/schedules` — 排产方案列表
- `GET /api/production/scheduling/results` — 最新排产结果
- `GET /api/production/scheduling/results/{id}` — 指定方案结果
- `GET /api/production/scheduling/overview` — 订单级排产总览（含锁定状态）
- `GET /api/production/scheduling/orders/{id}` — 订单排产详情
- `GET /api/production/scheduling/resource-load` — 资源负荷
- `GET /api/production/scheduling/risks` — 延期风险
- `GET /api/production/scheduling/gantt` — 甘特图数据
- `GET /api/scheduling/{id}/board` — 生产排班表
- `POST /api/production/scheduling/schedules/{id}/orders/{wo_id}/lock` — 锁定订单
- `POST /api/production/scheduling/schedules/{id}/orders/{wo_id}/unlock` — 解锁订单
- `GET /api/production/scheduling/schedules/{id}/export` — 导出 Excel

---

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页看板 | 总览与关键指标 |
| `/work-order-import` | 工单导入 | 上传工艺表、预览、确认入库 |
| `/work-centers` | 资源配置 | 工段管理、设备管理、状态控制 |
| `/operation-mappings` | 工序映射 | Excel 列名到工段映射规则管理 |
| `/personnel` | 人员档案 | 花名册、工段关联、Excel 导入 |
| `/resource-groups` | 资源分组 | 资源组管理、成员增删 |
| `/scheduling` | 排产驾驶台 | 查看待排工序、执行排产 |
| `/schedule-results` | 订单排产总览 | 订单级预计开始/完成、延期风险 |
| `/scheduling/orders/:id` | 订单排产详情 | 零件时间轴、工序明细、依赖解释 |
| `/scheduling/board/:id` | 生产排班表 | 日期矩阵、工段/设备/人员视图 |
| `/gantt` | 甘特图 | 设备时间轴 |
| `/machines` | 设备管理 | 旧 demo 兼容页 |
| `/orders` | 订单管理 | 旧 demo 兼容页 |
| `/routings` | 工艺路线 | 旧 demo 兼容页 |

---

## 项目结构

```
aps_v2/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── production.py          # 核心 API（工段、设备、工序映射、资源组、导入、排产）
│   │   │   └── scheduling.py          # 旧 demo 排产 API
│   │   ├── crud/                      # 旧 demo 数据访问层
│   │   ├── models/
│   │   │   ├── production.py          # 14 个生产主线模型
│   │   │   ├── __init__.py            # 模型注册
│   │   │   ├── machine.py             # 旧 demo 设备模型
│   │   │   ├── order.py               # 旧 demo 订单模型
│   │   │   ├── routing.py             # 旧 demo 工艺路线模型
│   │   │   ├── schedule.py            # 旧 demo 排产方案模型
│   │   │   └── task.py                # 旧 demo 任务模型
│   │   ├── schemas/
│   │   │   └── production.py          # Pydantic 请求/响应结构
│   │   ├── services/
│   │   │   ├── production_service.py          # 核心业务逻辑（工段、设备、映射、资源组、导入、排产、排班表）
│   │   │   ├── production_analysis_service.py # 结果分析（总览、详情、负荷、风险）
│   │   │   ├── production_import_service.py   # Excel 导入解析
│   │   │   └── ...
│   │   ├── utils/                     # 时间与通用工具
│   │   ├── database.py                # MySQL 连接与初始化
│   │   └── main.py                    # FastAPI 入口
│   ├── alembic/
│   │   ├── env.py                     # 迁移环境
│   │   └── versions/
│   │       ├── 202604300001_initial_mysql_baseline.py  # 基线迁移（18 张旧表）
│   │       └── 202605040001_plan1_foundation_data.py   # PLAN1 迁移（3 张新表 + 字段补充）
│   ├── alembic.ini
│   ├── aps.db                         # 历史 SQLite 原型数据（不再作为正式入口）
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── production.js          # 核心 API 封装
│   │   │   └── client.js              # Axios 基础配置
│   │   ├── components/
│   │   │   ├── SummaryCards.jsx       # 摘要卡
│   │   │   ├── StatusBadge.jsx        # 状态标签
│   │   │   ├── GanttChart.jsx         # 甘特图组件
│   │   │   ├── ScheduleTable.jsx      # 排产表
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── WorkCenters.jsx        # 资源配置（工段+设备管理）
│   │   │   ├── WorkOrderImport.jsx    # 工单导入
│   │   │   ├── OperationMapping.jsx   # 工序映射规则管理
│   │   │   ├── Personnel.jsx          # 人员花名册
│   │   │   ├── ResourceGroups.jsx     # 资源分组管理
│   │   │   ├── Scheduling.jsx         # 排产驾驶台
│   │   │   ├── ScheduleResults.jsx    # 订单排产总览
│   │   │   ├── OrderScheduleDetail.jsx# 订单排产详情
│   │   │   ├── ScheduleBoard.jsx      # 生产排班表
│   │   │   ├── Gantt.jsx              # 甘特图
│   │   │   ├── Dashboard.jsx          # 首页
│   │   │   ├── Login.jsx              # 登录
│   │   │   └── ...
│   │   ├── App.jsx                    # 布局、导航、登录态
│   │   ├── router.jsx                 # 路由定义
│   │   └── styles.css                 # 全局样式（工业管理系统风格）
│   ├── package.json
│   └── vite.config.js
├── PLAN1.md                           # 核心基础数据路线文档
├── plan2.md                           # 可控排产与导出规划
├── plan3.md                           # 经营问题看板规划
├── plan-database.md                   # 数据库架构方案
├── plan-ui-refactor.md                # 前端 UI 重构规划
└── README.md
```

---

## 排产规则

- 任务粒度：零件 - 工序
- 同一零件内部：按工序列从左到右建立顺序依赖
- 子件任务：可并行进入各资源队列
- 上级部件拼装/焊接：等待下级子件完成后再排
- 多订单排序：优先级高 > 交期早 > 导入时间早
- 同一设备任务不重叠
- 设备选择：同工段多台设备时选最早完成的（仅 active 设备参与）
- 外协：按工时或默认周期占用日历，不占内部设备
- 班制：周一到周六 08:00-12:00、13:00-17:00，周日休息
- 逾期判断：planned_end > due_date
- 禁用工段：其下工序不参与排产；若启用工序依赖禁用工段工序，排产阻塞并报错
- 禁用/维修/停机设备：不参与排产候选

---

## 本地启动

### 后端

使用 conda 环境 `aps`。

```powershell
# 1. 在 MySQL 中创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS aps_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

# 2. 进入项目虚拟环境
conda activate aps
cd backend
pip install -r requirements.txt

# 3. 执行 Alembic 迁移
$env:DATABASE_URL="mysql+asyncmy://root:你的密码@localhost:3306/aps_v2?charset=utf8mb4"
python -m alembic.config upgrade head

# 4. 启动后端
uvicorn app.main:app --reload
```

默认地址：`http://127.0.0.1:8000`

说明：

- `asyncmy` 安装在 conda 环境 `aps` 中；不要用系统默认 Python 判断依赖是否缺失。
- Alembic 只负责迁移已存在的 database，不负责自动创建 `aps_v2` 数据库。
- `DATABASE_URL` 建议作为当前终端会话环境变量设置，不要把真实密码写入代码或文档。
- 当前 MySQL schema 已在 `aps` 环境下验证到 Alembic head：`202605050001`。

### Alembic 常用命令

```powershell
conda activate aps
cd C:\Users\48295\Desktop\aps_v2\backend

python -m alembic.config upgrade head       # 执行迁移
python -m alembic.config current            # 当前版本
python -m alembic.config history            # 迁移历史
python -m alembic.config revision -m "描述" # 新增迁移
```

当前已验证的迁移链：

| Revision | 说明 |
|------|------|
| `202604300001` | MySQL 初始基线 |
| `202605040001` | PLAN1 基础数据 |
| `202605050001` | PLAN2 可控排产、锁单、导出 |

### 前端

```bash
cd frontend
npm install
npm run dev
```

默认地址：`http://127.0.0.1:5173`

### 前端构建

```bash
cd frontend
npm run build
```

---

## 数据库策略

- 正式数据库：MySQL 8.0（InnoDB, utf8mb4）
- 迁移机制：Alembic（唯一 schema 变更入口）
- 不再依赖 `Base.metadata.create_all` 建表
- SQLite（aps.db）仅保留历史原型数据，不再作为扩展目标
- 旧 demo 表保留兼容，不继续扩展
- 新业务以 `production_*` 主线为准
- 编码规则：基础数据编码必须手填、全局唯一
- 删除策略：禁用不物理删除
- 当前 Alembic head：`202605050001`

---

## 推荐验收流程

1. 启动 MySQL，确认 `aps_v2` 数据库存在；如不存在，先执行 `CREATE DATABASE IF NOT EXISTS aps_v2 ...`
2. 进入 conda 环境 `aps`，设置 `DATABASE_URL`，执行 `python -m alembic.config upgrade head`
3. 执行 `python -m alembic.config current`，确认版本为 `202605050001 (head)`
4. 启动后端和前端
5. 登录系统
6. 进入资源配置，创建工段（内部+外协），确认设备自动生成
7. 编辑工段、禁用/启用工段，展开设备列表编辑设备状态
8. 上传人员排班表，确认人员导入
9. 进入工单导入，上传工艺表，预览确认入库
10. 进入排产驾驶台，选择订单和历史基准方案，运行排产
11. 在订单总览查看预计开始/完成/延期
12. 锁定一张订单后，基于该方案重排其他订单，确认锁定订单计划不变
13. 查看生产排班表和甘特图核对资源占用
14. 查看资源负荷和逾期风险
15. 导出 Excel，确认包含订单完工表、设备排班表、资源负荷表、延期风险表

---

## 当前边界

- 不支持拖拽改排
- 不支持手工锁定工序（后续可扩展为工序级锁定）
- 不支持节假日、加班审批和设备停机维护日历
- 不支持物料库存约束
- 不回写原始 `.xlsm` 文件
- 不提供完整 MES 报工
- 经营问题看板未实现（PLAN3 待做）
- 平均资源负荷率采用简单平均值
- 暂未接入 OR-Tools 等优化器
- 暂未提供正式自动化测试套件

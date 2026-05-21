# APS v2 — 轻量级生产排产系统

面向机械加工、小批量多品种生产场景的 APS（Advanced Planning and Scheduling）系统。目标是让计划员导入 Excel 工艺表后，系统自动排产并回答每张订单什么时候完工、是否延期、为什么延期。

---

## 当前进度总览

| 阶段 | 定位 | 状态 |
|------|------|------|
| PLAN1 核心基础数据 | 让系统知道有哪些工段、设备、人员 | **已完成** |
| PLAN2 可控排产、派工与导出 | 计划员选择订单排产、锁单、人员分摊、导出 | **已完成**（选择订单排产、排产开始日期、整单锁定、重排避让、人员计划工时分摊、失败不留空方案、Excel 导出均已完成） |
| PLAN3 交付风险看板 | 老板看交付风险，但不抢计划员主流程 | **已完成第一版**（动态风险计算、问题清单优先、状态备注、筛选、下钻、Excel 导出均已接入） |
| 前端主流程优化 | 让计划员按一个当前方案贯穿完工表、派工、排班和甘特 | **已完成阶段一至阶段十**（计划员工作台、主导航重排、当前方案贯穿、排产驾驶台、订单完工表、订单详情解释、连续派工、现场排班复核、风险看板弱化、文案统一、前端组件拆分） |

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
| ProductionScheduleItemPersonnelAllocation | production_schedule_item_personnel_allocations | 排产明细到人员的计划工时分摊，按占比保存计划分钟快照 |
| ExportBatch | export_batches | 导出记录 |
| BusinessRiskIssueState | business_risk_issue_states | 经营风险问题的人工处理状态和备注 |

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
| production_schedule_item_personnel_allocations | 新增整表 | schedule_item_id + person_id 唯一；删除排产明细时级联删除分摊 |

---

## PLAN2 完成情况

### 已完成

- **规则排产引擎**：按订单优先级、交期、导入时间排序，支持工序依赖（FS），同一设备任务不重叠
- **工时口径**：Excel 工序数字按单件工时入库，排产产能占用按 `ProductionOperation.duration_hours * Part.quantity` 计算
- **固定班制**：周一到周六 08:00-12:00、13:00-17:00，周日休息，跨午休/下班/周日自动顺延
- **外协工序**：参与时间约束但不占内部设备，按工时或默认周期排入日历
- **选择订单排产**：支持选择待排/已排订单范围和指定开始日期运行排产，已排订单可基于历史方案重排
- **排产开始日期**：支持从指定日期开始排，系统自动校正到工作时间
- **整单锁定**：支持在订单完工表中对单张订单“锁定计划 / 取消锁定”
- **重排策略**：基于历史方案时，新方案只包含本次勾选订单和历史方案中的已锁订单；已锁订单继承原排布，未锁订单避让已锁资源；排产失败不会留下空方案
- **方案状态**：排产成功生成的新 `ProductionSchedule.status` 为 `active`，历史 `draft` 数据不批量回填
- **订单完工表**：预计开始、预计完成、延期天数、主要瓶颈、锁定计划状态
- **订单排产详情**：下钻到零件级时间线、工序级明细、FS 依赖解释
- **资源负荷**：按设备返回 busy_minutes / available_minutes / utilization / status（bottleneck / normal / idle）
- **延期风险分析**：自动生成中文原因和建议
- **派工与工时**：独立派工页按“连续处理未派工任务”组织，按排产明细为一名或多名在职人员分摊计划工时，占比合计必须为 100%
- **人员工时汇总**：按排产方案汇总每个人任务数、计划工时、涉及订单/工段，并支持展开任务明细
- **生产排班表**：Excel 风格日期矩阵，支持工段/设备/人员视图模式；人员视图优先使用真实派工，未派工分组置顶，已派工人员按姓名排序
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

### 已完成第一版

- **交付风险看板页面**：保留 `/management-dashboard`，导航位置靠后；默认未来 30 天，第一屏展示问题清单，摘要和分布弱化到后面
- **动态风险计算**：基于 `production_*` 排产方案动态识别订单延期、临近交期、资源瓶颈、关键工序阻塞、外协影响
- **人工处理状态**：新增 `business_risk_issue_states`，按 `schedule_id + issue_key` 保存 open / processing / resolved / paused 和备注
- **筛选能力**：支持按方案、未来天数、风险等级、问题类型、客户、处理状态筛选
- **下钻定位**：风险问题可跳转订单详情、生产排班表、甘特图
- **Excel 导出**：导出交付风险报告，包含看板摘要、订单交付风险、资源瓶颈、关键工序阻塞、外协风险、全部问题状态

### 暂不进入第三阶段

- 物料风险字段和库存约束
- 负责人、截止时间、多条处理日志
- 拖拽改排和手工调整排产算法

### 当前审查结论（2026-05-05）

三阶段代码结构已完成，review findings 已修复，可以进入真实排产数据闭环验收。

已通过：

- 后端编译：`C:\Users\48295\.conda\envs\aps\python.exe -m compileall backend\app backend\alembic`
- 前端构建：`npm run build`
- 数据库迁移：当时 `alembic current -> 202605060001 (head)`；当前全量主线 head 见后文 Alembic 说明
- 后端路由：`/api/production/management-dashboard`、`/issue-state`、`/export` 已加载

已修复：

- 外协风险等级口径：外协延期 → `high`；外协临近交期 → `medium`；普通最后完成不生成风险。
- 导出文件名：API 仍兼容历史经营看板口径；前端下载默认名使用 `交付风险看板_{方案编号}_{日期}.xlsx`。
- 真实 FUBEI 工艺表验收数据脚本：可生成 5 张派生订单 Excel，准备基础数据和工序映射，并可直接导入排产验证看板闭环。

已跑通：

- 使用真实 `上海FUBEI-20260131-工艺，改5m，1.6立车.xlsm` 的 `焊接件明细` 生成 5 张验收 Excel。
- 自动导入 5 单并生成排产方案 `PS-20260505-080000-000000`。
- 经营问题看板命中 `order_delay`、`due_soon`、`resource_bottleneck`、`operation_blocking`、`external_risk` 五类风险。
- 状态备注保存、经营风险 Excel 导出、订单排产时间表导出已通过脚本验收。

下一步：

- 用前端手工复核筛选、跳转订单详情、生产排班表和甘特图。
- 数据闭环验收通过后，再进入 UI 打磨和后续接口收敛。

### 当前代码完成度审查（2026-05-17）

本次按当前工作区代码复核，结论如下：

- 后端 `app` 目录通过 `python -m compileall app`，未发现语法级阻塞。
- 前端通过 `npm run build`，Vite 生产包生成成功。
- 当前主线功能闭环已覆盖：基础配置、工单预览/入库、选择订单排产、历史方案锁定计划重排、订单完工表、派工与工时、排班表、甘特图、交付风险看板、状态备注、排产结果导出、交付风险导出。
- 文档状态已与 PLAN3 实现对齐：交付风险看板和 Excel 导出已完成第一版，不再标记为未开始。

当前仍建议优先补齐：

- 后端自动化测试：导入解析、依赖生成、排产锁单、经营风险识别、导出文件名。
- 前端回归测试：筛选、跳转、锁单、导出、空状态和错误态。
- 数据库迁移验收脚本：在空 MySQL 库中执行 `alembic upgrade head` 后自动检查关键表和字段。
- 旧 demo 接口收敛：明确保留兼容还是下线，避免新开发误用 `orders/routings/schedules` 旧数据线。

### 排产口径修正（2026-05-19）

本次已完成：

- Excel 工艺表中的工序数字统一解释为单件工时。
- 排产时内部设备和外协工段都按 `单件工时 * Part.quantity` 占用产能。
- 已生成排程的结果、资源负荷、订单详情、导出和甘特图占用统计按排程开始/结束时间中的工作日历工时解释，避免旧方案被新口径重算。
- 新生成方案状态写为 `active`；历史 `draft` 方案保持原样。
- 基于历史方案重排时，前端明确新方案只包含本次勾选订单和历史方案中的已锁订单。

已验证：

- 后端编译：`python -m compileall backend\app`
- 前端构建：`npm run build`
- 内存 SQLite 最小排产：内部工序 `2h * 数量3 = 6h`
- 内存 SQLite 最小排产：外协工序 `4h * 数量2 = 8h`
- 内存 SQLite 历史方案重排：已锁订单原样复制，新订单避让锁定区间

### 派工与排产执行修正（2026-05-20）

本次已完成：

- 新增派工分摊表 `production_schedule_item_personnel_allocations`，按 `schedule_item_id + person_id` 唯一保存人员占比和计划分钟快照。
- 新增 `/dispatch` 页面，支持按方案、订单、工段、人员、派工状态筛选任务，编辑人员占比，快速均分到 100%。
- 新增人员工时汇总，按人员显示任务数、计划工时、涉及订单/工段，并可展开任务明细。
- 新增派工接口、保存接口、人员工时汇总接口；保存时校验人员在职、人员不重复、占比合计 100%。
- 删除人员前若存在派工分摊记录会被阻止，避免历史计划工时断链。
- 基于历史方案重排时，仅复制已锁订单的排产明细和这些明细上的人员分摊；新排任务不继承旧派工。
- 订单排产详情增加派工摘要；生产排班表人员视图改用真实派工，未分配时显示“未派工”。
- 修复排产执行入参时间逻辑：前端传 `start_date`，后端统一按本地工作日历 08:00 起排，并对带时区 datetime 做归一化兜底。
- 修复重复排产的方案编号逻辑：`schedule_no` 使用本次生成方案的运行时间，`start_time` 只表示排产起始时间，避免同一开始日期重复排产撞唯一约束。
- 已执行 `alembic upgrade head`，当前数据库迁移版本为 `202605190001`。

已验证：

- 后端编译：`C:\Users\48295\.conda\envs\aps\python.exe -m compileall backend\app`
- 前端构建：`npm run build`
- 后端路由加载：47 个生产相关路由已注册
- Alembic：`current -> 202605190001 (head)`
- 真实 MySQL 数据库最小排产：1 张订单生成 153 条排产明细，排产链路跑通

### 前端主流程与当前方案贯穿（2026-05-21）

本次只优化现有功能工作流，不新增业务、不重写系统。

已完成：

- 首页 `/` 改为“计划员工作台”，不再按综合大屏组织信息。
- 首页优先展示：是否可以排产、阻塞项数量、可排订单数、最新排产方案、延期订单数、未派工任务数。
- 首页只给一个主按钮，并按当前状态自动指路：
  - 缺基础数据：去基础配置。
  - 没有可排工单：去工单导入。
  - 有工单但没方案：去排产驾驶台。
  - 已有方案：查看订单完工表。
- 主导航重排为计划员主线：运行总览、工单导入、排产驾驶台、订单完工表、派工与工时、生产排班表、甘特图、基础配置。
- 交付风险看板放到靠后的“管理查看”分组；老板能看风险，但不抢计划员排产和派工主流程。
- 约定“当前方案”规则：URL 有 `schedule_id` 时使用 URL；URL 没有时默认最新方案。
- 订单完工表、派工、生产排班表、甘特图、交付风险看板顶部统一显示当前方案编号、创建时间、订单数、延期数。
- 页面互跳时保留当前方案：
  - 订单完工表 -> `/dispatch?schedule_id=当前方案`
  - 订单完工表 -> `/scheduling/board/当前方案`
  - 订单完工表 -> `/gantt?schedule_id=当前方案`
  - 派工、排班表、甘特图、交付风险看板之间互跳不丢方案。
- 侧边导航和页面顶部快捷按钮接入当前方案路径工具，避免用户切页后看到不同版本。
- 排产驾驶台 `/scheduling` 重构为三段式流程：本次排产设置、订单选择、执行结果。
- 排产设置固定展示已选订单数、总产能工时（按零件数量折算）、开始日期、是否基于历史方案、是否保留锁定计划订单。
- 运行排产按钮旁明确提示：会生成新方案、不覆盖历史方案；基于历史方案时只包含勾选订单和已锁定计划订单。
- 排产成功后给出“查看订单完工时间”和“进入派工”两个后续动作。
- 订单选择默认展示全部可排订单，交期风险订单置顶，已排订单明确标识；删除订单入口弱化到“更多”。
- 订单完工表 `/schedule-results` 重构为老板和计划员优先看的交付页面，首屏只保留当前方案、总订单数、延期订单数、最晚完工时间、平均负荷。
- 订单完工表主表按风险排序：延期订单、临近交期、高优先级、交期早；字段顺序聚焦交期、预计开始、预计完成、延期天数、瓶颈、锁定计划状态。
- 工序级明细默认收起到“查看工序明细”，资源负荷概览放在订单表之后。
- 锁单操作文案改为“锁定计划 / 取消锁定”，贴近计划员语义。
- 订单详情 `/scheduling/orders/:id` 重构为“订单排产解释”，顶部直接给出预计完工结论，例如“预计 05-28 17:00 完工，晚于交期 2 天”或“预计按期完成”。
- 订单详情突出最后完成工序的工段、设备、结束时间，并列出影响交付的关键工序。
- 订单详情工序明细增加序号、前置关系和派工状态；已派工显示人员与占比工时，未派工显示黄色提醒。

### 派工流程与生产排班表优化（2026-05-21）

本次只把已有派工、人员分摊和排班表能力串成更顺手的计划员工作流，不新增业务边界。

已完成：

- 派工页默认按“未派工优先”组织任务，列表排序为：未派工、交期早、开始时间早。
- 派工页顶部补齐当前方案、任务总数、未派工数、已派工数、已分摊工时，并保留当前方案互跳。
- 保存派工成功后自动定位到下一条未派工任务，让派工从“编辑某条任务”变成“连续处理未派工任务”。
- 人员分摊区增加“单人 100%”和“多人均分”快捷操作。
- 人员下拉建议显示姓名、工号、所属工段；优先推荐当前工段人员。
- 选择不属于当前工段的人员时只提醒、不阻止保存，便于处理临时跨工段支援。
- 生产排班表默认打开当前方案；未指定方案时优先使用当前方案上下文，否则使用最新方案。
- 生产排班表默认日期范围从方案开始日期起，默认 14 天。
- 排班表筛选栏压缩为：视图、工段、工单、日期跨度、搜索；排班表只做现场复核，不承载人员配置入口。
- 人员视图中未派工分组置顶，已派工人员按姓名排序。
- 日期矩阵继续横向滚动，任务信息列继续固定。
- 单元格显示工时；鼠标悬停显示订单、工序、时间段。
- 外协、延期、休息日颜色继续保留，但降低视觉重量，避免盖过每日任务复核。

已验证：

- 前端构建：`npm run build`
- 后端编译：`C:\Users\48295\.conda\envs\aps\python.exe -m compileall backend\app`
- 本地 Vite 页面连通：`/scheduling`、`/schedule-results`、`/scheduling/orders/:id?schedule_id=...` 均返回 200。

### 交付风险看板弱化、文案统一与代码整理（2026-05-21）

本次目标是满足老板看风险，但系统仍以计划员排产、派工、复核为主。

已完成：

- 侧边导航新增靠后的“管理查看”分组，`/management-dashboard` 显示为“交付风险看板”。
- 交付风险看板默认仍显示问题清单，不改成大屏；老板最关心字段靠前：订单号、客户、交期、预计完成、延期天数、原因、当前处理状态。
- 交付风险看板保留状态和备注、筛选、下钻和导出 Excel，不新增复杂负责人、日志、审批。
- 页面文案统一：“订单完工表”“排产驾驶台”“生产排班表”“派工与工时”“交付风险看板”“锁定计划 / 取消锁定”。
- “产能工时”在界面中说明为“按零件数量折算”；“单件工时”只保留在导入预览相关文案。
- 前端优先拆分完成：
  - `ScheduleResults.jsx` 拆到 `components/scheduling/*`。
  - `Dispatch.jsx` 拆到 `components/dispatch/*`。
  - `WorkCenters.jsx` 拆到 `components/work-centers/*`。
- 后端服务拆分和样式文件拆分暂缓，后续再按风险更低的节奏处理。

已验证：

- 前端构建：`npm run build`

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
- `DELETE /api/work-centers/{id}` — 删除工段
- `GET /api/resource-machines` — 列出设备
- `POST /api/resource-machines` — 新增设备
- `PUT /api/resource-machines/{id}` — 编辑设备
- `DELETE /api/resource-machines/{id}` — 删除设备

### 人员

- `GET /api/personnel` — 人员花名册（含工段关联）
- `POST /api/personnel/import` — 上传排班表导入人员，兼容 `机台人员` / `机组人员` 工作表；按工段表头下的 `工号`、`姓名` 导入，`外协` 列跳过
- `DELETE /api/personnel/{id}` — 删除人员；若已有派工分摊记录会返回 400，需先处理派工记录或改为离职状态
- `GET /api/personnel/workload?schedule_id=...` — 当前排产方案下的人员计划工时汇总

### 工序映射

- `GET /api/operation-mapping-rules` — 列出映射规则
- `POST /api/operation-mapping-rules` — 创建映射规则
- `PUT /api/operation-mapping-rules/{id}` — 编辑映射规则
- `DELETE /api/operation-mapping-rules/{id}` — 删除映射规则

### 资源组

- `GET /api/resource-groups` — 列出资源组（含成员）
- `POST /api/resource-groups` — 创建资源组
- `PUT /api/resource-groups/{id}` — 编辑资源组
- `POST /api/resource-groups/{id}/members` — 添加成员
- `DELETE /api/resource-groups/{id}/members/{mid}` — 移除成员

### 工单导入

- `POST /api/imports/work-orders/preview` — 上传工艺表预览（不写库）；返回单件工时汇总和按零件数量折算后的产能工时
- `POST /api/imports/work-orders/commit` — 确认入库；当请求中 `create_missing_work_centers=true` 时，可自动为缺失的工序列创建同名工段和映射规则

### 排产与派工

- `POST /api/production/scheduling/run` — 运行排产（支持 start_date, start_time, work_order_ids, base_schedule_id, keep_locked；前端优先传 start_date）
- `GET /api/production/operations` — 可排工序队列；`duration_hours` 为单件工时，`effective_duration_hours` 为排产产能工时
- `GET /api/production/scheduling/schedules` — 排产方案列表
- `GET /api/production/scheduling/results` — 最新排产结果
- `GET /api/production/scheduling/results/{id}` — 指定方案结果
- `GET /api/production/scheduling/overview` — 订单级排产总览（含锁定状态）
- `GET /api/production/scheduling/orders/{id}` — 订单排产详情
- `GET /api/production/scheduling/resource-load` — 资源负荷
- `GET /api/production/scheduling/risks` — 延期风险
- `GET /api/production/scheduling/gantt` — 甘特图数据
- `GET /api/production/scheduling/schedules/{id}/board` — 生产排班表
- `GET /api/production/scheduling/schedules/{id}/dispatch` — 派工任务列表，支持按订单、工段、人员、已派工/未派工筛选
- `PUT /api/production/scheduling/schedule-items/{item_id}/personnel-allocations` — 整组替换保存某条排产明细的人员分摊
- `POST /api/production/scheduling/schedules/{id}/orders/{wo_id}/lock` — 锁定订单
- `POST /api/production/scheduling/schedules/{id}/orders/{wo_id}/unlock` — 解锁订单
- `PATCH /api/production/scheduling/schedules/{id}/orders/{wo_id}/lock` — 更新锁定订单状态（兼容前端调用）
- `PATCH /api/production/scheduling/schedules/{id}/orders/{wo_id}/unlock` — 更新解锁订单状态（兼容前端调用）
- `GET /api/production/scheduling/schedules/{id}/export` — 导出 Excel

### 交付风险看板

- `GET /api/production/management-dashboard` — 交付风险看板（接口路径沿用 management-dashboard；支持 schedule_id, horizon_days, risk_level, risk_type, customer, status）
- `PATCH /api/production/management-dashboard/issue-state` — 保存风险问题处理状态和备注
- `GET /api/production/management-dashboard/export` — 导出交付风险 Excel

---

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 计划员工作台 | 判断能否排产，并给出唯一下一步主按钮 |
| `/work-order-import` | 工单导入 | 上传工艺表、预览、确认入库；缺失工序映射可选择自动补齐 |
| `/work-centers` | 资源配置 | 工段管理、设备管理、状态控制 |
| `/operation-mappings` | 工序映射 | Excel 列名到工段映射规则管理 |
| `/personnel` | 人员档案 | 花名册、逐人显示关联工段、Excel 导入 |
| `/resource-groups` | 资源分组 | 资源组管理、成员增删 |
| `/scheduling` | 排产驾驶台 | 三段式排产命令：本次排产设置、订单选择、执行结果；风险订单置顶，已排订单可重排 |
| `/schedule-results` | 订单完工表 | 首屏聚焦当前方案、总订单数、延期订单数、最晚完工时间、平均负荷；主表按风险排序展示预计完工 |
| `/dispatch?schedule_id=...` | 派工与工时 | 未派工优先连续处理，支持单人 100%、多人均分、跨工段提醒和人员工时汇总 |
| `/management-dashboard?schedule_id=...` | 交付风险看板 | 当前方案的交付风险、问题状态、备注、导出；页面默认先看问题清单，摘要和分布放后面 |
| `/scheduling/orders/:id` | 订单排产解释 | 解释订单为什么排到当前时间：完工结论、最后完成工序、关键工序、工序顺序和派工状态 |
| `/scheduling/board` | 生产排班表入口 | URL 未指定方案时优先打开当前方案，否则打开最新排产方案 |
| `/scheduling/board/:id` | 生产排班表 | 默认从方案开始日期展示 14 天；日期矩阵、工段/设备/人员视图；人员视图未派工置顶，已派工按姓名排序 |
| `/gantt?schedule_id=...` | 甘特图 | 当前方案的设备时间轴 |

### 前端主导航

当前侧边栏按“计划员主线 + 管理查看”组织：

1. 运行总览
2. 工单导入
3. 排产驾驶台
4. 订单完工表
5. 派工与工时
6. 生产排班表
7. 甘特图
8. 基础配置
9. 交付风险看板（管理查看，位置靠后）

交付风险看板不作为计划员主线重点，但仍保留给老板查看交付风险。

### 当前方案规则

结果类页面统一只认一个“当前方案”：

- URL 有 `schedule_id`：使用 URL 指定方案。
- URL 没有 `schedule_id`：默认使用最新方案，并在页面加载后写回当前方案上下文。
- `/scheduling/board/:id` 使用路径中的方案 ID，日期默认从该方案开始日期起 14 天。
- 页面顶部显示当前方案编号、创建时间、订单数、延期数。
- 订单完工表、派工、生产排班表、甘特图、交付风险看板之间互跳时必须保留当前方案。

### UI 原型图

当前已有一套基于文档和参考图绘制的可落地 UI 原型：

- `ui-mockups/aps-ui-mockups.html` — 单页静态原型，可用 `#home`、`#scheduling`、`#management` 等 hash 切换页面。
- `ui-mockups/screenshots/*.png` — 已导出的 1600x1080 页面图。
- `ui-mockups/README.md` — 原型页面清单和设计说明。

原型壳层已按参考图调整为白色顶部栏、浅色左侧任务栏、线性图标菜单和蓝色浅底选中态；后续前端 UI 打磨可按这套原型逐页落地。

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
│   │   │   ├── production.py          # 18 个生产主线模型
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
│   │       ├── 202604300001_initial_mysql_baseline.py  # MySQL 初始基线
│   │       ├── 202605040001_plan1_foundation_data.py   # PLAN1 基础数据
│   │       ├── 202605050001_plan2_scheduling_enhancements.py # PLAN2 排产增强
│   │       ├── 202605060001_plan3_management_dashboard.py     # PLAN3 交付风险看板
│   │       └── 202605190001_dispatch_personnel_allocations.py # 派工人员计划工时分摊
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
│   │   │   ├── common/
│   │   │   │   ├── CurrentScheduleBanner.jsx # 当前方案摘要条
│   │   │   │   ├── DataState.jsx             # 加载/空/错误状态
│   │   │   │   └── SectionPanel.jsx          # 通用区块容器
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.jsx            # 主布局
│   │   │   │   ├── PageHeader.jsx            # 页面标题和快捷操作
│   │   │   │   ├── SidebarNav.jsx            # 计划员主导航
│   │   │   │   └── StepIndicator.jsx         # 流程步骤
│   │   │   ├── scheduling/
│   │   │   │   ├── ScheduleSelector.jsx      # 方案选择和完工表操作
│   │   │   │   ├── OrderCompletionTable.jsx  # 订单完工表区块
│   │   │   │   ├── OrderTimeline.jsx         # 订单完工主表
│   │   │   │   ├── OrderLockTable.jsx        # 锁定计划操作列
│   │   │   │   ├── ResourceLoadPanel.jsx     # 资源负荷概览
│   │   │   │   └── ScheduleOperationDetail.jsx # 收起的工序明细
│   │   │   ├── dispatch/
│   │   │   │   ├── DispatchFilterBar.jsx     # 派工筛选条
│   │   │   │   ├── DispatchTaskTable.jsx     # 派工任务列表
│   │   │   │   ├── PersonnelAllocationEditor.jsx # 人员占比分摊编辑器
│   │   │   │   └── PersonnelWorkloadTable.jsx # 人员工时汇总
│   │   │   ├── work-centers/
│   │   │   │   ├── WorkCenterForm.jsx        # 新增工段表单
│   │   │   │   ├── WorkCenterTable.jsx       # 工段列表
│   │   │   │   ├── MachineTable.jsx          # 设备列表和编辑
│   │   │   │   └── EditWorkCenterModal.jsx   # 编辑工段弹窗
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── WorkCenters.jsx        # 资源配置（工段+设备管理）
│   │   │   ├── WorkOrderImport.jsx    # 工单导入
│   │   │   ├── OperationMapping.jsx   # 工序映射规则管理
│   │   │   ├── Personnel.jsx          # 人员花名册
│   │   │   ├── ResourceGroups.jsx     # 资源分组管理
│   │   │   ├── Scheduling.jsx         # 排产驾驶台
│   │   │   ├── ScheduleResults.jsx    # 订单完工表
│   │   │   ├── Dispatch.jsx           # 派工与人员计划工时汇总
│   │   │   ├── OrderScheduleDetail.jsx# 订单排产解释
│   │   │   ├── ScheduleBoard.jsx      # 生产排班表
│   │   │   ├── Gantt.jsx              # 甘特图
│   │   │   ├── Dashboard.jsx          # 首页
│   │   │   ├── Login.jsx              # 登录
│   │   │   └── ...
│   │   ├── App.jsx                    # 布局、导航、登录态
│   │   ├── navigation.js              # 主导航、页面元信息、当前方案跳转目标
│   │   ├── router.jsx                 # 路由定义
│   │   ├── utils/
│   │   │   └── scheduleContext.js     # 当前方案路径和本地上下文工具
│   │   └── styles.css                 # 全局样式（工业管理系统风格）
│   ├── package.json
│   └── vite.config.js
├── PLAN1.md                           # 核心基础数据路线文档
├── plan2.md                           # 可控排产与导出规划
├── plan3.md                           # 交付风险看板规划（原经营问题看板）
├── plan-database.md                   # 数据库架构方案
├── plan-ui-refactor.md                # 前端 UI 重构规划
├── ui-mockups/                         # 可落地 UI 原型与 1600x1080 页面截图
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
- 工时口径：`ProductionOperation.duration_hours` 表示单件工时；实际排产占用按 `duration_hours * Part.quantity` 折算
- 外协：按工时或默认周期占用日历，不占内部设备
- 班制：周一到周六 08:00-12:00、13:00-17:00，周日休息
- 排产方案：成功生成的新方案状态为 `active`，失败场景不落空方案
- 历史方案重排：新方案范围为本次勾选订单 + 已锁订单；已锁订单复制原排布，未勾选且未锁订单不进入新方案
- 派工分摊：每条排产明细可分配一名或多名在职人员，占比合计必须为 100%，人员计划工时按该明细的工作日历分钟数乘以占比保存
- 派工继承：基于历史方案重排时，只复制已锁订单排产明细上的人员分摊；重新排产的新明细不继承旧派工
- 人员视图：生产排班表按真实派工展示人员；未派工明细显示“未派工”，不使用工段默认人员冒充
- 当前方案：结果类页面优先使用 URL 中的 `schedule_id`；URL 未指定时默认最新方案；跨订单完工表、派工、生产排班表、甘特图、交付风险看板跳转时保留当前方案
- 方案编号：`schedule_no` 使用本次生成方案的运行时间生成，`start_time` 只表示排产起始时间，避免同一开始日期重复排产撞唯一约束
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
- 当前 MySQL schema 已在 `aps` 环境下验证到 Alembic head：`202605190001`。

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
| `202605060001` | PLAN3 经营问题看板状态表 |
| `202605190001` | 派工人员计划工时分摊表 |

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
- 当前 Alembic head：`202605190001`

---

## 推荐验收流程

1. 启动 MySQL，确认 `aps_v2` 数据库存在；如不存在，先执行 `CREATE DATABASE IF NOT EXISTS aps_v2 ...`
2. 进入 conda 环境 `aps`，设置 `DATABASE_URL`，执行 `python -m alembic.config upgrade head`
3. 执行 `python -m alembic.config current`，确认版本为 `202605190001 (head)`
4. 启动后端和前端
5. 如需使用真实 FUBEI 数据快速验收，执行：
   `C:\Users\48295\.conda\envs\aps\python.exe backend\scripts\prepare_management_dashboard_acceptance_data.py --commit-and-schedule`
6. 脚本会输出 5 张派生 Excel 到 `outputs/management_dashboard_acceptance/`，并生成 manifest、交付风险看板导出文件和排产时间表。
7. 登录系统
8. 进入运行总览，确认首页显示“计划员工作台”，并只给出一个下一步主按钮
9. 确认左侧导航中计划员主线顺序为：运行总览、工单导入、排产驾驶台、订单完工表、派工与工时、生产排班表、甘特图、基础配置；交付风险看板位于靠后的管理查看分组
10. 进入资源配置，创建工段（内部+外协），确认设备自动生成
11. 编辑工段、禁用/启用工段，展开设备列表编辑设备状态
12. 进入人员档案上传人员排班表，确认人员导入；人员表支持 `机台人员` / `机组人员` 工作表，第 2 行工段、第 3 行 `工号/姓名`，外协列不导入人员
13. 进入工单导入，上传工艺表，预览确认入库；如只缺工序映射，可选择自动补齐同名工段和映射规则后导入
14. 进入排产驾驶台，选择待排或已排订单和历史基准方案，运行排产
15. 在排产驾驶台确认三块结构：本次排产设置、订单选择、执行结果；运行排产按钮旁能看到新方案和历史方案规则说明
16. 在订单选择中确认默认显示全部可排订单、交期风险订单置顶、已排订单标识清楚、删除订单入口弱化到“更多”
17. 排产成功后确认执行结果给出“查看订单完工时间”和“进入派工”
18. 在订单完工表查看当前方案、总订单数、延期订单数、最晚完工时间、平均负荷
19. 确认订单完工表主表按延期、临近交期、高优先级、交期早排序，并突出预计完成、延期天数、瓶颈和锁定计划状态
20. 确认工序级排产明细默认收起在“查看工序明细”，资源负荷概览在订单表之后
21. 点击订单进入订单排产解释页，确认顶部直接显示预计完工结论、最后完成工序、影响交付的关键工序
22. 在订单解释页确认工序明细有序号、前置关系、派工状态；未派工显示黄色提醒
23. 确认订单完工表、派工与工时、生产排班表、甘特图、交付风险看板顶部都显示同一个当前方案编号、创建时间、订单数和延期数
24. 从订单完工表跳到派工、排班表、甘特图，确认 URL 带当前 `schedule_id` 或路径方案 ID，且页面显示同一方案
25. 锁定一张订单计划后，基于该方案重排其他已排/待排订单，确认锁定计划订单时间不变，未锁定计划订单避让锁定资源
26. 临时将某内部工段全部设备设为非 active 后运行排产，确认系统报错且不会新增空排产方案
27. 进入派工与工时页，为一条排产明细分配单人 100% 或多人合计 100%，确认保存成功
28. 在派工页查看人员工时汇总，确认计划工时与任务分摊一致
29. 从交付风险看板进入生产排班表，或从订单完工表跳转到指定方案排班表，核对资源占用和人员视图
30. 查看资源负荷和逾期风险
31. 导出 Excel，确认包含订单完工表、设备排班表、资源负荷表、延期风险表
32. 进入交付风险看板，确认默认显示问题清单，字段顺序为订单号、客户、交期、预计完成、延期天数、原因、当前处理状态
33. 按客户、风险等级、处理状态筛选风险问题
34. 修改风险问题状态和备注，刷新后确认状态保留
35. 从风险问题跳转订单详情、生产排班表、甘特图
36. 导出交付风险 Excel，确认包含看板摘要、订单交付风险、资源瓶颈、关键工序阻塞、外协风险、全部问题状态

---

## 当前边界

- 不支持拖拽改排
- 不支持手工锁定工序（后续可扩展为工序级锁定）
- 不支持节假日、加班审批和设备停机维护日历
- 不支持物料库存约束
- 不回写原始 `.xlsm` 文件
- 不提供完整 MES 报工；当前人员工时只做计划分摊，不做实际开始/结束、实际工时和偏差分析
- 交付风险看板第一版已实现，物料风险、复杂负责人、审批和多步骤处理日志暂不进入当前范围
- 平均资源负荷率采用简单平均值
- 暂未接入 OR-Tools 等优化器
- 暂未提供正式自动化测试套件

## 后续优化建议

1. 先补测试和验收脚本：把当前已跑通的真实数据闭环固化为可重复命令，避免后续 UI 或算法调整破坏导入、排产和看板。
2. 收敛旧 demo 主线：前端已转向 `production_*`，后端旧 `machines/orders/routings/schedules` 只建议保留兼容或迁移工具，不再扩展新业务。
3. 继续增强排产解释：当前详情页已突出完工结论、最后完成工序和关键工序；后续可补充关键路径、等待时间、资源排队原因。
4. 引入轻量日历：先做设备停机、周日/节假日、临时加班事件，不急于接复杂优化器。
5. 做滚动重排基础：增加执行反馈和工序级状态后，再支持只重排未完成任务。
6. 经营看板第二版：增加负责人、截止时间、处理日志和问题导出筛选快照，物料风险放到库存数据稳定后再接入。

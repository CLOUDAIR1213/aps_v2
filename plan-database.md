# APS v2 数据库架构与可维护性方案

## Summary

本文档用于规划 APS v2 的数据库长期结构。目标不是只列出表名，而是给出一套 **以 MySQL 8.0 为正式主线、以 Alembic 为迁移机制** 的可维护数据库方案。

本方案承接：

- `PLAN1.md`：核心基础数据。
- `plan2.md`：可控排产、锁单、导出。
- `plan3.md`：经营问题看板。
- `plan-ui-refactor.md`：前端页面逻辑和 UI 重构。

当前最重要的数据库原则：

- 新业务继续以 `production_*` 主线为准。
- 旧 Demo 表只保留兼容，不继续扩展。
- 不重复创建含义相同的新表。
- 基础数据优先保证编码唯一、可禁用、可追溯。
- 排产结果必须版本化，不覆盖历史方案。
- 经营风险由后端动态计算，人工处理状态单独保存。
- 正式开发主线切到 MySQL 8.0，不再围绕 SQLite 扩大系统。
- 所有后续表结构变更必须通过 Alembic 迁移，不再依赖重建 `aps.db`。
- SQLite 只作为历史原型兼容或临时本地验证，不作为后续功能设计目标。

## 当前数据库现状

当前项目存在两条数据线。

### 旧 Demo 兼容线

旧 Demo 表包括：

- `orders`
- `machines`
- `routings`
- `routing_operations`
- `schedule_tasks`
- `schedules`
- `schedule_items`

这些表用于早期演示页面和接口兼容。

后续策略：

- 保留读取和兼容能力。
- 不继续扩展新字段。
- 不作为新 APS 主线。
- 菜单和 UI 中逐步弱化。
- 不在二、三阶段新增功能中依赖这些表。

### APS v2 production 主线

当前 APS v2 主线集中在：

- `work_centers`
- `resource_machines`
- `personnel`
- `work_center_personnel`
- `work_orders`
- `import_batches`
- `parts`
- `production_operations`
- `operation_dependencies`
- `production_schedules`
- `production_schedule_items`

这些表是后续扩展的唯一主线。

当前主线覆盖：

- 工段。
- 设备。
- 人员。
- 工单。
- 导入批次。
- 零件层级。
- 工序任务。
- 工序依赖。
- 排产方案。
- 排产明细。

## 数据库总体原则

### 0. MySQL 主线决策

正式数据库主线采用 MySQL 8.0。

推荐原因：

- 小企业部署更常见，运维人员更容易接受。
- Windows 本机、办公室电脑、内网服务器部署都比较直接。
- SQLAlchemy + Alembic 可以支撑后续持续迁移。
- 当前 APS v2 的核心需求是结构化业务数据、排产结果、导出和问题状态，不依赖 PostgreSQL 独有能力。

技术约定：

- 数据库版本：MySQL 8.0 或以上。
- 存储引擎：InnoDB。
- 字符集：`utf8mb4`。
- 排序规则：优先 `utf8mb4_0900_ai_ci`；如果环境较旧，可退回 `utf8mb4_unicode_ci`。
- 后端异步驱动建议：`asyncmy`。
- SQLAlchemy URL 形态：`mysql+asyncmy://user:password@localhost:3306/aps_v2?charset=utf8mb4`。
- Alembic 仍作为唯一 schema migration 入口。

维护边界：

- 不把业务逻辑写成 MySQL 存储过程。
- 不依赖触发器维护核心业务状态。
- 不把排产算法放进 SQL。
- MySQL 只负责可靠存储、约束、索引和事务。
- 订单完工、资源负荷、风险原因仍由后端服务聚合计算。

MySQL 落地细则：

- 所有表显式使用 InnoDB，保证事务和外键可用。
- 所有文本字段统一 `utf8mb4`，保证中文、英文、符号和后续导出内容稳定保存。
- 编码类字段在后端统一去空格、转大写或按规则标准化，再写入数据库。
- 时间字段优先使用 `DateTime` 映射 MySQL `DATETIME`，业务时间统一按中国本地生产时间理解。
- 不使用 MySQL `TIMESTAMP` 承担排产时间，避免时区自动转换影响 08:00-17:00 班制判断。
- 金额、重量、工时如果后续需要精确统计，优先用 `Decimal`；当前已有 `Float` 可在后续迁移中逐步收敛。
- 大文本说明使用 `Text`，不要无限制扩大普通 `String`。
- 高频筛选字段必须建索引；不要依赖全表扫描支撑看板和导出。
- 唯一约束仍由数据库兜底，前端校验只做体验优化。

### 1. 主线唯一

所有新功能都围绕 `production_*` 主线扩展。

禁止新增含义重复的表：

- 不新增新的 `orders_v2`。
- 不新增新的 `machines_v2`。
- 不新增新的 `schedules_v2`。
- 不新增新的 `operations_v2`。

如果缺字段，在现有主线表上兼容性补充。

### 2. 历史可追溯

排产和导入都要保留历史：

- 每次 Excel 导入生成 `import_batches`。
- 每次排产生成 `production_schedules`。
- 每个方案下的任务写入 `production_schedule_items`。
- 新方案不覆盖旧方案。
- 排产方案和明细应在排程校验成功后写入；无启用设备、依赖环或缺失依赖等失败场景不能留下空方案。

### 3. 编码稳定

基础数据必须有稳定编码。

编码字段用于：

- Excel 重复导入匹配。
- 页面维护。
- 对接企业现有编号。
- 后续和外部系统集成。

建议编码字段全部唯一：

- `work_centers.code`
- `resource_machines.code`
- `personnel.employee_no`
- 后续资源组、工具、物料也必须有 code。

### 4. 禁用优先，不物理删除

被历史排产、导入、风险问题引用过的数据，不建议物理删除。

建议：

- 基础数据使用 `status` 控制启用、禁用、停机、维修。
- 历史数据保留。
- 删除动作在 UI 上优先表现为“禁用”。

### 5. 后端聚合，前端展示

数据库和后端负责：

- 订单预计开始。
- 订单预计完成。
- 延期天数。
- 资源负荷。
- 瓶颈判断。
- 经营风险。

前端只负责：

- 展示。
- 筛选。
- 操作入口。
- 状态和备注维护。

不要让前端从工序明细重新计算核心业务结论。

## 分阶段数据库蓝图

## 第一阶段：核心基础数据

第一阶段目标：

- 系统知道有哪些工段。
- 系统知道有哪些设备。
- 系统知道有哪些人员。
- 系统能把 Excel 工序列映射到工段。
- 系统能稳定导入工单、零件、工序和依赖。

### 已有表

#### work_centers

用途：

- 表示工段/资源类型。
- 例如：下料、拼装、焊接、5m 龙门、钣金外。

当前字段：

- `id`
- `code`
- `name`
- `is_external`
- `default_capacity_per_day`
- `default_duration_hours`
- `created_at`
- `updated_at`

建议补充：

- `status`：`active`、`disabled`
- `description`

维护规则：

- `code` 必填唯一。
- `name` 必填唯一。
- 内部工段 `is_external=false`。
- 外协工段 `is_external=true`。
- 内部工段没有启用设备时标记为阻塞。
- 外协工段不要求设备。

#### resource_machines

用途：

- 表示某工段下的具体设备或产能通道。

当前字段：

- `id`
- `work_center_id`
- `code`
- `name`
- `status`
- `capacity_per_day`
- `created_at`
- `updated_at`

建议状态：

- `active`：启用。
- `disabled`：禁用。
- `maintenance`：维修。
- `stopped`：停机。

当前已有默认状态 `idle`，后续建议统一为设备主数据状态，不再混用“空闲/忙碌”这种运行态。

维护规则：

- `code` 必填唯一。
- 内部工段至少一台 `active` 设备。
- 非 active 设备不参与排产。

#### personnel

用途：

- 人员主数据。
- 当前不作为排产硬约束。
- 后续用于执行反馈记录“谁做了”。

当前字段：

- `id`
- `employee_no`
- `name`
- `status`
- `created_at`
- `updated_at`

建议状态：

- `active`
- `disabled`

维护规则：

- `employee_no` 必填唯一。
- 人员通过 `work_center_personnel` 关联工段。
- 工段无人员只提示风险，不阻塞排产。

#### work_center_personnel

用途：

- 人员和工段的多对多关系。

当前字段：

- `id`
- `work_center_id`
- `person_id`
- `sort_order`
- `created_at`

维护规则：

- `work_center_id + person_id` 唯一。
- 第一版可用 `sort_order` 决定排班表默认人员。

#### work_orders

用途：

- 工单/订单主表。

当前字段：

- `id`
- `order_no`
- `customer`
- `product_name`
- `quantity`
- `priority`
- `due_date`
- `status`
- `created_at`
- `updated_at`

建议状态：

- `pending`：待排。
- `scheduled`：已排。
- `locked`：计划锁定。
- `completed`：后续执行反馈完成。
- `cancelled`：取消。

注意：

- 第二阶段整单锁定不一定直接改 `work_orders.status`，更建议在排产方案维度保存锁定关系，避免不同方案之间状态混乱。
- 排产驾驶台的可排订单范围包含 `pending` 和 `scheduled`，以支持首次排产后的基于历史方案重排。

#### import_batches

用途：

- 记录一次 Excel 导入批次。

当前字段：

- `id`
- `work_order_id`
- `source_filename`
- `sheet_name`
- `status`
- `parsed_summary_json`
- `created_at`

建议补充：

- `source_file_hash`
- `imported_by`
- `issue_summary_json`

维护规则：

- 预览阶段不写库。
- 确认入库后写 `import_batches`。
- `parsed_summary_json` 仅保存摘要，不保存整个 Excel。

#### parts

用途：

- 表示部件/零件。
- 支持上级部件和子件层级。

当前字段：

- `id`
- `work_order_id`
- `import_batch_id`
- `parent_part_id`
- `no`
- `drawing_no`
- `name`
- `material`
- `quantity`
- `material_weight`
- `source_row`
- `is_assembly`
- `created_at`

维护规则：

- `work_order_id + no + drawing_no` 唯一。
- `parent_part_id` 表示装配层级。
- 当前物料字段只展示，不做库存约束。

#### production_operations

用途：

- 排产最小任务粒度：零件-工序。

当前字段：

- `id`
- `work_order_id`
- `part_id`
- `work_center_id`
- `name`
- `seq_no`
- `duration_hours`
- `source_row`
- `source_col`
- `status`
- `created_at`
- `updated_at`

建议补充：

- `external_duration_hours` 可暂不加，继续使用 `duration_hours` 和 `work_center.default_duration_hours`。
- `is_key_operation` 暂不加，由后端分析计算。

维护规则：

- 工序来自 Excel 工序列。
- `work_center_id` 必须有效。
- `duration_hours` 必须为有效数字。
- 工序依赖由 `operation_dependencies` 表表达。

#### operation_dependencies

用途：

- 表示工序前后置关系。

当前字段：

- `id`
- `operation_id`
- `depends_on_operation_id`

建议补充：

- `dependency_type`，默认 `FS`，用于后续扩展。

维护规则：

- `operation_id + depends_on_operation_id` 唯一。
- 当前只做 FS 关系。
- 排产前必须检查依赖环。

### 第一阶段建议新增表

#### operation_mapping_rules

用途：

- 保存 Excel 工序列到系统工段的映射规则。
- 支撑工序映射确认页和后续导入复用。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| source_name | String(100) | Excel 工序列名 |
| normalized_name | String(100) | 标准化名称 |
| work_center_id | Integer | 关联工段 |
| is_external | Boolean | 是否外协 |
| status | String(30) | active、disabled |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

约束：

- `source_name` 唯一，或 `normalized_name` 唯一。

设计理由：

- 目前导入主要通过工段名称匹配。
- 后续如果没有映射规则，用户每次遇到别名都要重复确认。
- 这个表是基础数据稳定性的关键。

#### resource_groups

用途：

- 资源组管理。
- 第一版只用于分类、筛选、配置管理，不进入排产算法。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| code | String(50) | 唯一编码 |
| name | String(100) | 名称 |
| description | Text | 说明 |
| status | String(30) | active、disabled |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

#### resource_group_members

用途：

- 资源组成员关系。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| group_id | Integer | 资源组 |
| member_type | String(30) | work_center、machine、personnel |
| member_id | Integer | 对应资源 id |
| created_at | DateTime | 创建时间 |

约束：

- `group_id + member_type + member_id` 唯一。

设计理由：

- 避免为工段、设备、人员分别建三张关系表。
- 资源组第一版不进入算法，轻量关系足够。

## 第二阶段：可控排产与导出

第二阶段目标：

- 计划员选择订单和开始日期排产。
- 支持整单锁定。
- 排产结果可导出。
- 每次排产保留历史方案。

### 已有表

#### production_schedules

用途：

- 排产方案版本。

当前字段：

- `id`
- `schedule_no`
- `name`
- `status`
- `start_time`
- `base_schedule_id`
- `run_params_json`
- `created_at`
- `updated_at`

建议补充：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| issue_summary_json | Text | 排产异常摘要 |
| created_by | String(80) | 创建人 |

当前状态口径：

- `active`：排产成功生成、可用于看板/导出/后续重排的新方案。
- `draft`：历史遗留或未发布草稿，当前排产成功路径不再生成。
- `archived`：后续如需归档历史方案时扩展。

设计理由：

- 第二阶段需要知道这次方案从哪天开始、排了哪些订单、是否基于旧方案。
- 参数必须落在方案上，后续才能复盘。
- 方案状态不单独迁移旧数据；历史 `draft` 保持原样，新成功方案写 `active`。

#### production_schedule_items

用途：

- 某个排产方案下的任务安排。

当前字段：

- `id`
- `schedule_id`
- `operation_id`
- `work_order_id`
- `part_id`
- `work_center_id`
- `machine_id`
- `start_time`
- `end_time`
- `sequence_on_resource`
- `is_external`
- `created_at`

建议补充：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| locked | Boolean | 是否锁定 |
| locked_at | DateTime | 锁定时间 |
| locked_by | String(80) | 锁定人 |
| lock_reason | Text | 锁定原因 |

设计理由：

- 用户看到的是“整单锁定”。
- 技术上可以锁定该订单在该方案下的所有 `production_schedule_items`。
- 后续如果需要工序级锁定，不需要改结构。

工时口径：

- `ProductionOperation.duration_hours` 表示 Excel 工序列中的单件工时。
- 排产时有效产能工时为 `duration_hours * max(Part.quantity, 1)`。
- `production_schedule_items` 不额外落库有效工时，结果、负荷和导出按已保存的 `start_time` / `end_time` 在工作日历内反推占用工时。
- 旧历史方案不会因新工时口径被批量重算。

索引建议：

- `schedule_id`
- `work_order_id`
- `work_center_id`
- `machine_id`
- `start_time`
- `end_time`
- `schedule_id + machine_id + start_time`
- `schedule_id + work_order_id`

### 第二阶段建议新增表

#### production_schedule_order_locks

用途：

- 保存用户层面的整单锁定状态。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| schedule_id | Integer | 排产方案 |
| work_order_id | Integer | 工单 |
| locked | Boolean | 是否锁定 |
| locked_at | DateTime | 锁定时间 |
| locked_by | String(80) | 锁定人 |
| note | Text | 备注 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

约束：

- `schedule_id + work_order_id` 唯一。

设计理由：

- UI 层是整单锁定。
- 明细层可以同步 `production_schedule_items.locked`。
- 单独表便于看哪些订单被锁，不用扫描全部明细。

#### export_batches

用途：

- 记录排产结果、经营看板等导出行为。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| export_type | String(50) | schedule_result、management_dashboard |
| schedule_id | Integer | 关联方案 |
| filename | String(255) | 文件名 |
| params_json | Text | 导出参数 |
| created_by | String(80) | 导出人 |
| created_at | DateTime | 导出时间 |

设计理由：

- 老板和计划员经常需要知道“导出的是什么版本”。
- 后续可以做导出历史和锁定提示。
- 不需要保存文件本体，先保存导出记录即可。

## 第三阶段：经营问题看板

第三阶段目标：

- 老板看交付风险。
- 调度员维护问题状态。
- 风险动态计算，人工状态单独保存。

### 新增表

#### business_risk_issue_states

用途：

- 保存系统动态计算出来的风险问题的人工处理状态。
- 不保存完整风险快照。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| schedule_id | Integer | 关联排产方案 |
| issue_key | String(160) | 稳定问题标识 |
| status | String(30) | open、processing、resolved、paused |
| note | Text | 备注 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

约束：

- `schedule_id + issue_key` 唯一。

索引：

- `schedule_id`
- `status`
- `issue_key`

设计理由：

- 风险内容随规则动态计算。
- 人工状态需要保留。
- 不落库完整风险结果，避免数据过期和重复。

### issue_key 规则

`issue_key` 必须稳定。

示例：

- `order-delay:{schedule_id}:{work_order_id}`
- `due-soon:{schedule_id}:{work_order_id}`
- `resource-bottleneck:{schedule_id}:{work_center_id}:{machine_id}`
- `operation-blocking:{schedule_id}:{operation_id}`
- `external-risk:{schedule_id}:{work_order_id}:{operation_id}`

规则：

- 不使用中文。
- 不使用可变文案。
- 不使用排序号。
- 同一方案同一问题刷新后 key 不变。

## 后续阶段预留表

以下表不建议当前一次性全部实现，但数据库设计应预留方向。

## 执行反馈

### operation_execution_records

用途：

- 记录每道工序实际执行情况。
- 回答谁做了、实际什么时候做、用了多久、结果如何。

建议字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Integer | 主键 |
| schedule_item_id | Integer | 关联计划任务 |
| operation_id | Integer | 工序 |
| work_order_id | Integer | 工单 |
| part_id | Integer | 零件 |
| person_id | Integer | 执行人员 |
| actual_start_time | DateTime | 实际开始 |
| actual_end_time | DateTime | 实际结束 |
| actual_duration_minutes | Integer | 实际耗时 |
| result | String(30) | completed、partial、rework、paused、failed |
| exception_reason | Text | 异常原因 |
| note | Text | 备注 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

设计理由：

- 不提前把人员变成排产硬约束。
- 先把执行反馈作为实际记录。
- 后续滚动重排可基于实际完成情况。

## 轻量日历

### shift_templates

用途：

- 班次模板。

建议字段：

- `id`
- `code`
- `name`
- `start_time`
- `end_time`
- `break_start_time`
- `break_end_time`
- `work_minutes`
- `status`

### resource_calendar_events

用途：

- 设备或工段的停机、加班、休息事件。

建议字段：

- `id`
- `resource_type`
- `resource_id`
- `event_type`
- `start_time`
- `end_time`
- `capacity_delta_minutes`
- `reason`
- `created_at`

设计原则：

- 当前继续固定班制。
- 后续日历以事件方式扩展，不重写排产主表。

## 物料与库存

当前不做物料字段和库存约束。

后续可扩展：

### materials

- 物料编码。
- 物料名称。
- 规格。
- 单位。
- 状态。

### material_inventory

- 物料。
- 当前库存。
- 单位。
- 库位。
- 更新时间。

### work_order_material_requirements

- 工单。
- 零件。
- 物料。
- 需求数量。
- 已分配数量。
- 缺口数量。
- 最早需要日期。

设计原则：

- 物料风险未来作为 `material_risk` 加入经营看板。
- 不应推翻第三阶段 `business_risk_issue_states` 结构。

## 工具、模具、工装

后续可扩展：

### tool_types

- 工具类型编码。
- 名称。
- 说明。

### tools

- 工具编码。
- 工具名称。
- 工具类型。
- 状态。
- 适用工段。

### operation_tool_requirements

- 工序。
- 工具。
- 占用数量。
- 是否必须。

设计原则：

- 工具约束后续可加入排产算法。
- 当前不进入一、二、三阶段主线。

## 命名规范

### 表名

- 使用小写复数。
- 使用下划线。
- 主线表不加 `_v2`。
- 兼容表不改名。

示例：

- `work_orders`
- `production_operations`
- `business_risk_issue_states`

### 字段名

统一字段：

- 主键：`id`
- 创建时间：`created_at`
- 更新时间：`updated_at`
- 状态：`status`
- 编码：`code`
- 名称：`name`
- 备注：`note`

外键：

- `{table_singular}_id`

示例：

- `work_order_id`
- `work_center_id`
- `machine_id`
- `schedule_id`

### 状态值

状态值使用英文小写字符串。

原因：

- API 稳定。
- 数据库迁移简单。
- 前端统一映射中文。

不要把中文状态直接存数据库。

## 索引与约束策略

### 必须唯一

- `work_centers.code`
- `work_centers.name`
- `resource_machines.code`
- `personnel.employee_no`
- `work_orders.order_no`
- `production_schedules.schedule_no`
- `operation_dependencies.operation_id + depends_on_operation_id`
- `business_risk_issue_states.schedule_id + issue_key`

### 常用索引

建议索引：

- `work_orders.status`
- `work_orders.due_date`
- `production_operations.status`
- `production_operations.work_order_id`
- `production_operations.part_id`
- `production_operations.work_center_id`
- `production_schedule_items.schedule_id`
- `production_schedule_items.work_order_id`
- `production_schedule_items.machine_id`
- `production_schedule_items.start_time`
- `production_schedule_items.end_time`
- `business_risk_issue_states.schedule_id`
- `business_risk_issue_states.status`

### JSON 字段策略

正式主线使用 MySQL `JSON` 保存结构化摘要和参数：

- `parsed_summary_json`
- `run_params_json`
- `issue_summary_json`
- `params_json`

规则：

- JSON 字段只保存摘要、参数、快照。
- 不把核心关系数据塞进 JSON。
- 不用 JSON 代替外键关系。
- JSON 字段需要有明确 schema 约定，避免变成不可维护的杂项字段。
- 不把高频筛选字段只放在 JSON 中；需要筛选、排序、关联的字段必须拆成普通列。
- 第一版不依赖复杂 MySQL JSON 查询作为核心功能，避免后续维护困难。

## 迁移策略

当前项目使用：

- SQLite。
- `Base.metadata.create_all`。
- 无 Alembic。

这个方式只适合早期原型，不适合继续扩展 APS v2。下一步应直接切换为 MySQL 8.0，并把 Alembic 作为唯一表结构变更入口。

### 立即策略

立即调整方向：

- 后端数据库连接改为 MySQL。
- 增加 `alembic` 依赖和迁移目录。
- 初始化 Alembic 配置。
- 用 Alembic 生成当前 `production_*` 主线和兼容旧表的基线迁移。
- 后续新增表、字段、索引、约束全部走迁移脚本。
- `Base.metadata.create_all` 不再作为正式建表方式。

实施原则：

- 不再通过重建 `aps.db` 解决结构变更。
- 不再把 SQLite 兼容作为新功能设计约束。
- 开发、测试、部署使用同一套 MySQL schema。
- 本地开发可用本机 MySQL 或 Docker MySQL。

### Alembic 基线策略

当前项目已有模型和部分数据，应先建立基线：

- 第一步：确认当前模型结构。
- 第二步：创建 MySQL 空库。
- 第三步：执行 Alembic 初始迁移，生成所有当前表。
- 第四步：如需迁移 SQLite 旧数据，单独写一次性数据迁移脚本，不混入 schema migration。
- 第五步：从此以后所有 schema 变更都通过 Alembic revision。

落地注意：

- Alembic 迁移要求目标 database 已经存在；Alembic 不负责执行 `CREATE DATABASE`。
- 本地先执行 `CREATE DATABASE IF NOT EXISTS aps_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`，再运行 `python -m alembic.config upgrade head`。
- 运行迁移必须使用项目 conda 环境 `aps`，因为 `asyncmy` 安装在该环境中；系统默认 Python 可能无法加载项目依赖。
- `DATABASE_URL` 是 schema migration 的连接入口，建议作为终端环境变量注入，不把真实密码提交到仓库。

当前实际验证：

- 已在 MySQL 数据库 `aps_v2` 上执行迁移到 head。
- 当前全量主线 `alembic_version.version_num` 为 `202605190001`。
- 已确认 PLAN2 表 `production_schedule_order_locks`、`export_batches` 存在。
- 已确认 PLAN2 字段 `production_schedules.start_time`、`production_schedules.base_schedule_id`、`production_schedules.run_params_json`、`production_schedule_items.locked` 存在。
- 已确认 PLAN3 表 `business_risk_issue_states` 存在，用于保存经营问题处理状态和备注。

### 数据迁移策略

如果现有 SQLite 中有需要保留的数据：

- 只迁移 `production_*` 主线必要数据。
- 旧 demo 表数据可选择不迁移，或仅迁移演示数据。
- 数据迁移脚本与 Alembic schema migration 分开。
- 数据迁移前先导出备份。
- 导入 MySQL 后跑一次完整排产和看板验证。

### Alembic 管理规则

规则：

- 每次新增表必须有 migration。
- 每次新增字段必须有 migration。
- 每次新增索引和唯一约束必须有 migration。
- migration 文件命名写清业务意图。
- 不手工修改已应用 migration。
- 生产环境只执行向前迁移，不靠删库重建。

不再额外设计 `schema_version` 表，Alembic 的 `alembic_version` 表作为 schema 版本来源。

## API 与数据库边界

### 后端负责

- 数据校验。
- 导入解析。
- 工序映射。
- 排产计算。
- 排产方案生成。
- 订单级聚合。
- 资源负荷。
- 延期风险。
- 经营问题计算。
- Excel 导出。

### 前端负责

- 展示。
- 筛选条件。
- 用户操作。
- 状态和备注输入。

### 禁止

- 前端从 `production_schedule_items` 重新计算订单完工时间。
- 前端重新计算资源负荷。
- 前端生成风险原因。
- 前端维护复杂依赖图。

## 推荐实施顺序

### 第一步：MySQL 与 Alembic 基础设施

- 引入 MySQL 8.0 作为正式数据库。
- 引入 Alembic 作为唯一 schema migration 机制。
- 生成当前 schema 基线迁移。
- 编写 MySQL 本地启动和环境变量说明。
- 移除后续功能对 SQLite 重建数据库的依赖。

### 第二步：整理数据库主线

- 明确 `production_*` 为唯一新业务主线。
- 旧 Demo 表保留兼容，不再扩展。
- README 或文档中注明旧表用途。

### 第三步：补齐第一阶段基础数据表

- `operation_mapping_rules`
- `resource_groups`
- `resource_group_members`
- 给 `work_centers` 补 `status`
- 统一 `resource_machines.status`

### 第四步：支持第二阶段排产增强

- `production_schedules` 补排产参数字段。
- `production_schedule_items` 补锁定字段。
- 新增 `production_schedule_order_locks`。
- 新增 `export_batches`。

### 第五步：支持第三阶段经营看板

- 新增 `business_risk_issue_states`。
- 增加经营看板 API 和导出。

### 原则说明

数据库基础设施要先于第一阶段业务表扩展完成。否则基础数据表、锁单表、导出记录和经营问题状态会继续堆在原型数据库模式上，后续迁移成本会明显变高。

旧推荐顺序中将数据库基础设施放到最后，是早期原型阶段的临时写法；从 MySQL 决策确认后，应调整为先建立 MySQL + Alembic 底座，再推进 `PLAN1`。

## Test Plan

文档检查：

- 是否明确 `production_*` 是唯一新主线。
- 是否明确旧 Demo 表只保留兼容。
- 是否覆盖一阶段基础数据。
- 是否覆盖二阶段锁单、导出、排产参数。
- 是否覆盖三阶段经营问题状态。
- 是否说明物料、模具、执行反馈、日历是后续扩展。
- 是否包含迁移策略。
- 是否避免新增重复含义表。

后续实现验证：

- 后端启动后新表可创建。
- 旧页面兼容表不受影响。
- 新业务只读写 `production_*` 主线。
- 编码唯一约束生效。
- 排产方案历史可回看。
- 锁单状态能与排产明细对应。
- 经营风险状态能按 `issue_key` 更新。
- MySQL 可运行。
- Alembic 可以从空库初始化完整 schema。
- Alembic 可以执行后续增量迁移。

## Assumptions

- 正式数据库直接使用 MySQL 8.0。
- Alembic 必须在下一轮数据库结构变更前引入。
- SQLite 不再作为后续系统扩展目标。
- 不立即删除旧 Demo 表。
- 不把物料、模具、执行反馈一次性提前实现。
- 数据库设计优先保证可维护、可追溯、可扩展。
- 业务计算放后端，不放前端。

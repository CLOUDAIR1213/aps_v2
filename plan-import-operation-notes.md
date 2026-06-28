# 工艺表备注解析与工序要求保存方案

## 背景

工艺表里的备注经常不是普通说明，而是加工要求，例如“激光落料”“两端 45 度”“喷砂底漆面漆”等。系统后续需要在导入预览、订单明细、派工、生产排班表和外协任务中看到这些要求，并允许计划员按每道工序单独修改。

本方案只处理 Excel 工艺表中的加工备注，不替代现有外协执行备注、锁单备注、管理问题备注。

## 当前代码事实

主要相关文件：

- `backend/app/services/production_import_service.py`
- `backend/app/services/production_service.py`
- `backend/app/models/production.py`
- `backend/app/schemas/production.py`
- `frontend/src/pages/WorkOrderImport.jsx`

当前行为：

- 导入服务定义了 `NOTE_COLUMN = 11`，并把该列读入 `ImportPartPreview.note`。
- 导入预览页面已经统计 `summary.note_count`，并展示带备注的零件行。
- 确认导入时，`commit_import()` 创建 `Part` 和 `ProductionOperation`，但没有把 `ImportPartPreview.note` 写入数据库。
- 当前 `Part` 模型没有 `note` 字段。
- 当前 `ProductionOperation` 模型没有加工要求字段。
- 当前 `ProductionScheduleItem.external_note` 是外协执行反馈备注，不适合保存 Excel 工艺要求。

对样例文件 `上海FUBEI-20260131-工艺，改5m，1.6立车.xlsm` 的只读检查结果：

- `焊接件明细` 第 11 列表头是 `材料费`，不是备注。
- 真正的备注列表头是第 41 列 `备注1`。
- 当前解析代码会忽略表头为 `备注1` 的列，因此样例文件中的备注要求不会被正确保存。

## 产品口径

备注按“加工要求”处理，而不是导入临时提示。

采用两层保存：

1. 零件行原始备注：保存 Excel 行级备注原文，用于追溯。
2. 工序加工要求：保存到每个工序上，用于排产、派工、排班、外协查看和后续人工修改。

第一版默认规则：

- Excel 行级备注复制到该行所有生成的工序，作为每道工序的初始加工要求。
- 第一版编辑入口放在订单明细弹窗，不在派工列表中直接编辑。
- 列表页使用“短标签 + 展开/悬浮全文”的紧凑显示方式。
- 未来如果支持同订单重复导入，是否覆盖人工修改过的工序加工要求需要另行设计；本次只记录当前不重复导入的口径。

## 数据库落点

| 表 | 新字段 | 类型 | 作用 | 为什么放这里 |
| --- | --- | --- | --- | --- |
| `parts` | `note` | `Text`, nullable | 保存 Excel 每一行的原始备注 | 备注在模板里是按零件行填写，保留原文方便追溯 |
| `production_operations` | `requirement_note` | `Text`, nullable | 保存每道工序的加工要求，后续可人工修改 | 排班、派工、订单明细实际都围绕工序展示，要求必须挂在工序上 |
| 不加到 `production_schedule_items` | 无 | 无 | 不把导入要求存在排产明细 | 排产明细是某个方案的计划结果；工艺要求属于工序本身，重排后仍应保留 |
| 不复用 `external_note` | 无 | 无 | 外协备注继续只表示外协执行反馈 | 避免“加工要求”和“外协状态备注”混在一起 |

命名口径：

- `parts.note` 表示 Excel 行级原始备注。
- `production_operations.requirement_note` 表示这道工序加工时要遵守的要求。
- 不建议把工序字段命名为普通 `note`，否则容易和外协备注、锁单备注、管理问题备注混淆。

## 解析方案

### 备注列识别

不要再固定使用第 11 列。应按表头动态识别。

建议规则：

- 基础信息列仍识别为：`NO`、`图号`、`名称`、`材料厚`、`材料长`、`材料宽`、`产品数量(件)`、`材料`、`单料重`、`材料总重`、`材料费`。
- 工序列从基础信息列之后开始识别，但备注类和控制类表头不作为工序列。
- 以下表头应识别为备注或非工序列：
  - `备注`
  - `备注1`
  - `工艺备注`
  - `加工要求`
  - `工艺要求`
  - `关键尺寸/备注`
  - `flag`
  - `计划日期`
  - `完工日期`
  - 空表头
- 第一个匹配备注表头的列作为行级备注列。
- 如果同时存在多个备注列，按列顺序合并非空文本，中间用换行或分号分隔。

### 导入预览

扩展 schema：

- `ImportPartPreview.note` 保持，用于零件行级原始备注。
- `ImportOperationPreview.requirement_note` 新增，用于每道工序的初始加工要求。

预览生成逻辑：

- 从动态识别出的备注列读取文本到 `part.note`。
- 对该零件行生成的每道工序，把同一行备注复制到 `operation.requirement_note`。
- `summary.note_count` 继续统计带备注的零件行数量。
- 工序任务表中增加“加工要求”提示，避免备注只出现在侧边栏。

### 确认入库

`commit_import()` 写入：

- 创建 `Part` 时写入 `note=item.note`。
- 创建 `ProductionOperation` 时写入 `requirement_note=item.requirement_note`。

当前系统不允许相同 `order_no` 重复导入，因此第一版不处理“重复导入覆盖人工修改”的策略。

## 显示效果

### 工单导入预览

- 工序任务表增加“加工要求”列或短标签。
- 有备注时显示短标签，例如“加工要求”。
- 鼠标悬浮、点击展开或详情区展示全文。
- 长备注不能撑高表格行，也不能挤压工时、来源、类型等关键列。

### 订单明细弹窗

- 作为第一版唯一编辑入口。
- 每道工序展示 `requirement_note` 全文。
- 支持修改单道工序的加工要求。
- 修改某一道工序不影响同零件下其他工序，即使它们最初来自同一条 Excel 行级备注。

### 派工页

- 任务行只做紧凑展示，不直接编辑。
- 有加工要求时显示短标签或图标，并通过悬浮/展开查看全文。
- 重点是提醒派工人员这道工序有特殊要求，避免把派工列表变成复杂编辑表。

### 生产排班表

- 行内显示“加工要求”短标签。
- 全文通过悬浮、展开行或详情面板查看。
- 不能因为长备注导致行高大面积膨胀，排班表仍以时间、工段、工序、零件为主信息。

### 外协任务页

- 分开展示“加工要求”和“外协备注”。
- `requirement_note` 表示这道外协工序要加工成什么要求。
- `external_note` 表示外协执行过程中的状态说明、异常说明、沟通备注。

## 接口和迁移口径

### Alembic 迁移

新增一个 Alembic revision，例如 `202606xxxx_import_operation_notes.py`。

升级内容：

- `op.add_column("parts", sa.Column("note", sa.Text(), nullable=True))`
- `op.add_column("production_operations", sa.Column("requirement_note", sa.Text(), nullable=True))`

降级内容：

- `op.drop_column("production_operations", "requirement_note")`
- `op.drop_column("parts", "note")`

迁移要求：

- 使用 SQLAlchemy/Alembic 通用类型，兼容 MySQL 和 SQLite 测试。
- 不写 MySQL 专用 SQL。
- 不需要给这两个 Text 字段加索引，因为它们用于展示和编辑，不用于高频筛选。

### 后端模型和 Schema

模型新增：

- `Part.note`
- `ProductionOperation.requirement_note`

Schema/DTO 透出：

- 导入预览：`ImportPartPreview.note`、`ImportOperationPreview.requirement_note`
- 工序读取：`ProductionOperationRead.requirement_note`
- 订单明细：`OrderScheduleOperation.requirement_note`
- 派工任务：`DispatchTaskRow.requirement_note`
- 生产排班表：`ScheduleBoardRow.requirement_note`
- 外协任务：`ExternalTaskRow.requirement_note`
- 排产明细通用返回：`ProductionScheduleItemRead.requirement_note`

### 修改接口

第一版新增轻量接口：

- `PATCH /api/production/operations/{operation_id}`

请求字段：

- `requirement_note`

边界：

- 只允许修改 `requirement_note`。
- 不在同一个接口里修改工时、工段、依赖、状态。
- 如果后续需要改工时和工段，应单独设计“工艺变更”流程。

## 测试计划

后端解析测试：

- 样例表 `备注1` 列能被识别为备注列。
- 第 11 列 `材料费` 不再被误读为备注。
- `备注1` 不会被当成工序列，也不会触发缺失工序映射错误。
- 预览 payload 中 `parts[].note` 有值。
- 预览 payload 中对应 `operations[].requirement_note` 有值。

入库和修改测试：

- 确认导入后，`parts.note` 和 `production_operations.requirement_note` 正确入库。
- 订单明细弹窗修改某一道工序加工要求后，刷新仍保留。
- 修改一条工序的要求不影响同零件其他工序。
- 空字符串或清空备注时能保存为空值或空文本，前端显示为无加工要求。

前端显示验证：

- 导入预览、订单明细、派工页、生产排班表能看到加工要求提示。
- 长备注不撑坏表格行高，全文通过展开、悬浮或详情查看。
- 外协任务页中加工要求和外协备注是两个独立显示项。

## 推荐实施顺序

1. 改解析：动态识别备注列，修正当前第 11 列误读问题。
2. 改 schema：导入预览 payload 增加工序加工要求字段。
3. 加迁移和模型字段：`parts.note`、`production_operations.requirement_note`。
4. 改确认导入：把备注写入零件和工序。
5. 加工序加工要求修改 API。
6. 改前端导入预览、订单明细弹窗、派工页、生产排班表和外协任务页展示。
7. 补测试并用样例 xlsm 验证。

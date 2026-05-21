# APS v2 NO 层级装配排产算法方案

## Summary

本文档记录 `焊接件明细` 中基于 `NO` 字段的多级装配排产规则、接口影响、实现方案和验收标准。

当前目标是让系统理解：

- `1 / 2 / 3` 是一级总成或总体物件。
- `1.1 / 1.2` 是所属上级总成的子件。
- 未来支持 `1.1.1 / 1.1.1.1` 等任意深度层级。
- 所有下级物件完成后，上一级物件的任何工序才允许开始。

本阶段只处理 `焊接件明细`，不解析 `单件料加工明细`、`钢板`、`圆钢`、`标准件`、`型材` 等其它工作表。

## Business Rules

### NO 层级规则

直接父级通过去掉最后一段编号得到：

| NO | 直接父级 |
|---|---|
| `1` | 无 |
| `1.1` | `1` |
| `1.1.1` | `1.1` |
| `2.3.4.5` | `2.3.4` |

层级深度：

```text
level = NO 中 "." 的数量 + 1
```

一级总成：

```text
NO 不包含 "."
```

叶子件：

```text
没有其它 NO 的直接父级等于当前 NO
```

### 父子排产规则

对于任意父级 `P`：

- 如果 `P` 有直接子级 `C1...Cn`。
- 如果 `P` 自己有工序。
- 则 `P` 的第一道工序必须等待所有直接子级完成。

子级完成的定义：

- 子级自身有工序：取子级最后一道工序。
- 子级自身没有工序但有更下级：递归取其子孙完成锚点。
- 子级自身没有工序且没有下级：不生成依赖，导入预览给 warning。

因为父级内部工序已按列顺序串行，只要父级第一道工序等待所有子级完成，就能保证父级全部工序都不会提前开始。

## API And Data Contract

### 导入预览

接口保持不变：

```http
POST /api/imports/work-orders/preview
Content-Type: multipart/form-data
```

响应中的 `summary` 增加 `hierarchy`：

```json
{
  "summary": {
    "part_count": 64,
    "assembly_count": 4,
    "child_part_count": 60,
    "operation_count": 153,
    "work_center_count": 12,
    "total_hours": 123.4,
    "total_capacity_hours": 456.7,
    "error_count": 0,
    "warning_count": 0,
    "hierarchy": {
      "max_depth": 2,
      "root_count": 4,
      "leaf_count": 60,
      "parent_child_edge_count": 60,
      "missing_parent_count": 0,
      "duplicate_no_count": 0
    }
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `max_depth` | number | `NO` 最大层级深度 |
| `root_count` | number | 一级总成数量 |
| `leaf_count` | number | 叶子件数量 |
| `parent_child_edge_count` | number | 成功识别的父子关系数量 |
| `missing_parent_count` | number | 找不到直接父级的子件数量 |
| `duplicate_no_count` | number | 重复 `NO` 数量 |

新增导入预览问题规则：

| 场景 | severity | 是否阻塞 |
|---|---|---|
| 子级找不到直接父级 | `warning` | 否 |
| 父级没有工序但有子级 | `warning` | 否 |
| 叶子件没有任何工序 | `warning` | 否 |
| 同一订单内 `NO` 重复 | `error` | 是 |
| `NO` 为空 | 沿用现有逻辑 | 是 |
| 图号为空 | 沿用现有逻辑 | 是 |

### 导入提交

接口保持不变：

```http
POST /api/imports/work-orders/commit
Content-Type: application/json
```

请求体保持现有结构，不新增必填字段。

响应增加依赖分类计数：

```json
{
  "work_order": {},
  "import_batch_id": 12,
  "part_count": 64,
  "operation_count": 153,
  "dependency_count": 209,
  "sequence_dependency_count": 149,
  "hierarchy_dependency_count": 60
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sequence_dependency_count` | number | 同一 `NO` 内工序顺序依赖数量 |
| `hierarchy_dependency_count` | number | 子级完成到父级首工序的层级依赖数量 |
| `dependency_count` | number | 总依赖数量 |

### 排产执行

接口保持不变：

```http
POST /api/production/scheduling/run
Content-Type: application/json
```

请求示例：

```json
{
  "start_date": "2026-05-22",
  "work_order_ids": [1],
  "base_schedule_id": null,
  "keep_locked": true
}
```

行为说明：

- 不新增参数。
- 不要求用户选择层级策略。
- 后端默认采用新的 `NO` 层级依赖。
- 排产引擎继续读取 `operation_dependencies`，不感知 Excel 层级细节。

### 订单详情

接口保持不变：

```http
GET /api/production/scheduling/orders/{work_order_id}?schedule_id=123
```

每道工序响应增加 `dependency_reasons`：

```json
{
  "operation_id": 1001,
  "operation_name": "整形",
  "predecessor_operation_ids": [9001, 9002],
  "dependency_reasons": [
    {
      "predecessor_operation_id": 9001,
      "type": "hierarchy",
      "reason": "父级 1 必须等待子级 1.1 完成。"
    },
    {
      "predecessor_operation_id": 9002,
      "type": "sequence",
      "reason": "同一零件内上一道工序完成后才能开始。"
    }
  ]
}
```

依赖类型：

| type | 说明 |
|---|---|
| `sequence` | 同一零件内的前后工序依赖 |
| `hierarchy` | 子件完成后父级才能开始的层级依赖 |

## Implementation

### 数据库

本阶段不新增表。

继续使用：

- `parts.parent_part_id`
- `production_operations`
- `operation_dependencies`

原因：

- 当前表结构已能表达父子零件、工序、FS 依赖。
- 排产引擎已经基于 `operation_dependencies` 做拓扑排序。
- 本次优化重点是导入阶段生成更准确的依赖图。

### 导入预览

实现位置：

- `backend/app/services/production_import_service.py`

关键行为：

- `get_parent_no(no)` 使用最后一个点号识别直接父级。
- 预览阶段统计层级摘要。
- 重复 `NO` 作为 error。
- 缺失父级、父级无工序、叶子无工序作为 warning。

### 导入提交

实现位置：

- `backend/app/services/production_service.py`

依赖生成分两类：

1. 顺序依赖：

```text
同一 NO 内：
op2 depends_on op1
op3 depends_on op2
```

2. 层级依赖：

```text
父级第一道工序 depends_on 直接子级完成锚点
```

完成锚点计算：

```python
def finish_anchors(part_no):
    own_ops = operations_by_part_no.get(part_no, [])
    if own_ops:
        return [own_ops[-1]]

    anchors = []
    for child_no in children_by_parent.get(part_no, []):
        anchors.extend(finish_anchors(child_no))
    return anchors
```

父级首工序选择：

```python
parent_ops = sorted(operations_by_part_no[parent_no], key=lambda op: (op.seq_no, op.id))
parent_first_op = parent_ops[0]
```

只依赖父级第一道工序，不依赖父级所有工序。因为父级内部已有顺序依赖，这样可以减少依赖边数量，并保持排产图清晰。

### 排产引擎

实现位置：

- `backend/app/services/production_service.py`

`run_production_scheduling` 主体不需要改变。

原因：

- 它已经读取 `OperationDependency`。
- 它已经按依赖完成情况构造 ready 队列。
- 新的层级约束通过导入阶段写入依赖表即可自然生效。

## Example

真实 FUBEI 表 `焊接件明细` 实测结构：

- 一级总成：4 个，`1 / 2 / 3 / 4`
- 二级子件：60 个
- 最大深度：2
- 缺失父级：0
- 重复 NO：0

父级 `1`：

```text
1
1.1
1.2
...
1.14
```

新依赖表达：

```text
1.1 最后工序  -> 1 第一工序
1.2 最后工序  -> 1 第一工序
...
1.14 最后工序 -> 1 第一工序
```

当前表中 `1` 的父级工序：

```text
整形 -> 拼装 -> 焊接 -> 打磨 -> 喷丸 -> 底漆 -> 3m龙门 -> 气攻 -> 去毛清理 -> 面漆
```

实际排产效果：

```text
所有 1.x 完成后，1 的整形才能开始。
整形完成后，1 的拼装才能开始。
拼装完成后，1 的焊接才能开始。
后续父级工序继续按顺序执行。
```

## Test Plan

### 单元测试

测试文件：

- `backend/tests/test_production_hierarchy.py`

覆盖场景：

- `get_parent_no` 直接父级解析：
  - `1 -> None`
  - `1.1 -> 1`
  - `1.1.1 -> 1.1`
  - `2.3.4.5 -> 2.3.4`
- 两层依赖：
  - 子级最后工序依赖到父级第一工序。
  - 同一 NO 内仍按工序顺序串行。
- 三层依赖：
  - `1.1.1` 完成后 `1.1` 才能开始。
  - `1.1` 完成后 `1` 才能开始。
- 父级无工序：
  - 父级仅作为层级节点。
  - 子级完成锚点继续向上游父级传递。

### 真实文件验证

使用文件：

```text
C:\Users\48295\Desktop\20260425给奕航\工艺表\上海FUBEI-20260131-工艺，改5m，1.6立车.xlsm
```

预览验收：

```json
{
  "max_depth": 2,
  "root_count": 4,
  "leaf_count": 60,
  "parent_child_edge_count": 60,
  "missing_parent_count": 0,
  "duplicate_no_count": 0
}
```

排产验收：

- `1` 的第一道工序开始时间晚于所有 `1.x` 的最后工序结束时间。
- `2 / 3 / 4` 同理。
- 无设备重叠。
- 外协工序仍参与时间约束。
- 导出、甘特图、订单完工表能正常加载。

### 回归测试

必须保持不变：

- Excel 工序数字仍解释为单件工时。
- 排产占用仍为 `ProductionOperation.duration_hours * Part.quantity`。
- 午休、下班、周日顺延不变。
- 只有 `active` 设备参与排产。
- 外协不占内部设备。
- 锁单重排复制已锁订单并避让。
- 排产失败不留下空方案。

## Verification

已执行：

```powershell
C:\Users\48295\.conda\envs\aps\python.exe -m compileall backend\app
```

结果：通过。

已执行：

```powershell
$env:PYTHONPATH='C:\Users\48295\Desktop\aps_v2\backend'
C:\Users\48295\.conda\envs\aps\python.exe -m unittest backend.tests.test_production_hierarchy
```

结果：

```text
Ran 4 tests
OK
```

已用真实 FUBEI 表验证导入预览层级摘要：

```text
max_depth=2
root_count=4
leaf_count=60
parent_child_edge_count=60
missing_parent_count=0
duplicate_no_count=0
```

## Explicit Non-goals

本阶段不做：

- 不解析 `单件料加工明细`。
- 不把 `钢板 / 圆钢 / 标准件 / 型材` 纳入排产。
- 不新增库存、物料齐套、采购约束。
- 不新增多班制、节假日、设备维修日历。
- 不改变当前排产排序策略。
- 不改变当前锁单重排行为。
- 不改变导出 Excel 结构。

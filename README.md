# 轻量 APS 排产系统

这是一个面向机械加工行业的轻量 APS（Advanced Planning and Scheduling，高级计划与排产）演示项目。

项目目标不是做复杂的工业级优化平台，而是提供一个最小可运行、可演示、可继续扩展的 APS 闭环系统，覆盖从基础数据维护到任务生成、规则排产、结果展示、甘特图查看的完整流程。

系统当前已经具备以下能力：

- 机器管理
- 订单管理
- 工艺路线管理
- 工序管理
- 自动生成待排产任务
- 一键规则排产
- 排产结果落库
- 排产结果展示
- 甘特图展示
- Dashboard 首页看板

## 技术栈

### 前端

- React
- Vite
- Axios
- React Router

### 后端

- FastAPI
- SQLAlchemy
- SQLite

## 核心功能

### 1. 基础数据管理

- 维护机器数据
- 维护订单数据
- 为订单配置工艺路线
- 为工艺路线配置工序

### 2. 任务生成

- 根据 `pending` 状态订单及其工艺路线、工序，自动展开生成 `schedule_tasks`
- 支持重复生成前清空旧的待排产任务，避免重复数据

### 3. 规则排产

- 通过 `/api/scheduling/run` 执行第一版规则排产
- 排产规则基于订单优先级、交期、创建时间和工序顺序
- 排产完成后自动生成排产方案与排产明细

### 4. 结果展示

- 查看最新排产方案
- 查看指定排产方案详情
- 通过简化版甘特图按机器查看执行顺序

### 5. 首页看板

- 机器总数
- 订单总数
- 待排产订单数
- 已排产订单数
- 最近一次排产方案摘要

## 系统业务流程

整个系统的最小业务闭环如下：

1. 新增机器
2. 新增订单
3. 为订单配置工艺路线
4. 为工艺路线配置工序
5. 生成待排产任务
6. 执行规则排产
7. 查看排产结果
8. 查看甘特图

可简化理解为：

`订单 -> 工艺路线 -> 生成任务 -> 排产 -> 结果 -> 甘特图`

## 项目结构

```text
aps_v1/
├── backend/
│   ├── app/
│   │   ├── api/          # 接口层
│   │   ├── crud/         # 数据访问层
│   │   ├── models/       # 数据库模型
│   │   ├── schemas/      # 请求/响应模型
│   │   ├── services/     # 业务服务层
│   │   ├── database.py   # 数据库连接与初始化
│   │   └── main.py       # FastAPI 入口
│   ├── aps.db            # SQLite 数据库
│   ├── requirements.txt
│   ├── run.py            # 后端启动文件
│   └── seed.py           # 本地演示数据初始化脚本
├── frontend/
│   ├── src/
│   │   ├── api/          # 前端接口请求封装
│   │   ├── components/   # 通用组件
│   │   ├── pages/        # 页面
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── router.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 启动方式

## 1. 启动后端

进入 `backend` 目录：

```bash
cd backend
```

安装依赖：

```bash
pip install -r requirements.txt
```

初始化演示数据：

```bash
python seed.py
```

启动后端服务：

```bash
python run.py
```

后端默认地址：

```text
http://127.0.0.1:8000
```

## 2. 启动前端

进入 `frontend` 目录：

```bash
cd frontend
```

安装依赖：

```bash
npm install
```

启动前端开发服务：

```bash
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173
```

## 核心接口说明

### Dashboard

- `GET /api/dashboard/summary`

返回系统首页统计信息，例如：

```json
{
  "machine_count": 2,
  "order_count": 5,
  "pending_order_count": 3,
  "scheduled_order_count": 2
}
```

### 排产相关

- `POST /api/scheduling/generate-tasks`
  作用：根据待排产订单和工艺路线生成 `schedule_tasks`

- `POST /api/scheduling/run`
  作用：执行一次规则排产，并生成新的排产方案

- `GET /api/scheduling/tasks`
  作用：查看当前所有待排产/已排产任务

- `GET /api/scheduling/results`
  作用：查看最新一次排产方案及其明细

- `GET /api/scheduling/results/{schedule_id}`
  作用：查看指定排产方案详情

- `GET /api/scheduling/gantt`
  作用：获取适用于前端甘特图展示的数据

### 基础数据

- `GET /api/machines`
- `POST /api/machines`
- `GET /api/orders`
- `POST /api/orders`
- `POST /api/routings`
- `GET /api/routings/order/{order_id}`
- `POST /api/routing-operations`
- `GET /api/routing-operations/routing/{routing_id}`

## 演示数据说明

项目提供了一个最小演示数据脚本 `backend/seed.py`，用于本地联调和汇报演示。

它会插入：

- 2 台机器
- 2 个订单
- 2 条工艺路线
- 4 道工序

执行方式：

```bash
python seed.py
```

如果你想重新开始一轮干净演示，可以先执行一次 `seed.py` 再启动前后端。

## 演示操作建议

如果用于课堂演示、项目汇报或答辩，建议按下面顺序操作：

### 方式一：快速演示

1. 执行 `python seed.py`
2. 启动后端 `python run.py`
3. 启动前端 `npm run dev`
4. 打开首页 Dashboard，展示统计卡片
5. 打开 Scheduling 页面
6. 点击 `Generate Tasks`
7. 点击 `Run Scheduling`
8. 打开 `Schedule Results` 页面查看排产结果
9. 打开 `Gantt` 页面展示甘特图

### 方式二：完整手工演示

1. 在 Machines 页面新增机器
2. 在 Orders 页面新增订单
3. 在 Routings 页面新增工艺路线和工序
4. 在 Scheduling 页面生成任务
5. 执行一键排产
6. 在 Results 页面查看排产明细
7. 在 Gantt 页面查看机器分组排产情况

## 当前实现说明

本项目当前是“轻量演示版 APS”，重点在于跑通最小闭环，而不是做复杂工业优化。

### 已实现

- 基础数据维护
- 工艺路线与工序维护
- 待排产任务生成
- 第一版规则排产
- 排产结果落库
- 结果查询与甘特图展示
- Dashboard 看板
- 前后端联调

### 暂未实现

- 登录与权限控制
- 用户系统
- 导出 Excel / 打印
- WebSocket 实时刷新
- 拖拽排产
- 多版本排产方案比较
- 发布 / 撤销 / 审批流程
- 班次日历与节假日逻辑
- 物料约束、库存约束
- OR-Tools 等高级优化排产算法
- Docker 部署
- Alembic 数据迁移
- 自动化测试框架

## 适用场景

这个项目适合以下用途：

- 毕业设计或课程设计演示
- APS/MES 原型验证
- 机械加工行业排产业务流程讲解
- 前后端全栈小型项目展示
- 作为后续扩展优化排产系统的基础版本

## 后续可扩展方向

如果后续继续迭代，可以考虑扩展：

- 更复杂的排产规则
- 甘特图缩放与交互
- 订单筛选与搜索
- 机器负载分析
- 看板可视化增强
- 排产版本管理
- 高级优化算法接入

## 说明

本项目强调：

- 结构清晰
- 逻辑可读
- 功能闭环

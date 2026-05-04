import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getProductionOperations,
  getProductionSchedules,
  getProductionSchedulingResult,
  getWorkOrders,
  runProductionScheduling
} from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatDeadlineLabel,
  formatHours,
  getDeadlineTone
} from "../utils/formatters";

const filters = [
  { key: "all", label: "全部任务" },
  { key: "late", label: "交期风险" },
  { key: "external", label: "外协相关" }
];

export default function Scheduling() {
  const [operations, setOperations] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [historyPlans, setHistoryPlans] = useState([]);
  const [baseScheduleId, setBaseScheduleId] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [operationData, orderData] = await Promise.all([
        getProductionOperations(),
        getWorkOrders()
      ]);
      setOperations(operationData);
      setWorkOrders(orderData);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "排产队列加载失败。");
    }

    try {
      setLatestResult(await getProductionSchedulingResult());
    } catch (requestError) {
      if (requestError?.response?.status !== 404) {
        setError(requestError?.response?.data?.detail || "最新方案加载失败。");
      }
      setLatestResult(null);
    }

    try {
      const scheduleData = await getProductionSchedules();
      setHistoryPlans(scheduleData.schedules || []);
    } catch {
      setHistoryPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build pending orders list from operations
  const pendingOrders = useMemo(() => {
    const orderMap = new Map();
    for (const op of operations) {
      const order = workOrders.find((wo) => wo.id === op.work_order_id);
      if (!order || orderMap.has(order.id)) continue;
      orderMap.set(order.id, {
        ...order,
        operationCount: operations.filter((o) => o.work_order_id === order.id).length,
        totalHours: operations
          .filter((o) => o.work_order_id === order.id)
          .reduce((sum, o) => sum + o.duration_hours, 0),
        deadlineTone: getDeadlineTone(order.due_date),
      });
    }
    return Array.from(orderMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [operations, workOrders]);

  // Auto-select all pending orders when data loads
  useEffect(() => {
    if (pendingOrders.length > 0 && selectedOrders.size === 0) {
      setSelectedOrders(new Set(pendingOrders.map((o) => o.id)));
    }
  }, [pendingOrders]);

  const toggleOrder = (orderId) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedOrders(new Set(pendingOrders.map((o) => o.id)));
  };

  const clearAll = () => {
    setSelectedOrders(new Set());
  };

  const handleRun = async () => {
    if (selectedOrders.size === 0) {
      setError("请至少选择一张订单。");
      return;
    }
    if (!window.confirm(`确认对 ${selectedOrders.size} 张订单执行排产？将生成新方案，不覆盖历史方案。`)) {
      return;
    }
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const startTime = new Date(`${startDate}T08:00:00`);
      const result = await runProductionScheduling({
        start_time: startTime.toISOString(),
        work_order_ids: Array.from(selectedOrders),
        base_schedule_id: baseScheduleId,
        keep_locked: true,
      });
      setLatestResult(result);
      setMessage(`排产完成，生成方案 ${result.schedule.schedule_no}，共 ${result.items.length} 条明细。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "排产执行失败。");
    } finally {
      setRunning(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return pendingOrders.filter((order) => {
      if (filter === "late") return order.deadlineTone !== "success";
      if (filter === "external") {
        return operations.some(
          (op) => op.work_order_id === order.id && /外|表面处理/.test(op.work_center_name || "")
        );
      }
      return true;
    });
  }, [pendingOrders, operations, filter]);

  const totalHours = operations.reduce((sum, op) => sum + op.duration_hours, 0);
  const resourceCount = new Set(operations.map((op) => op.work_center_id)).size;
  const riskCount = pendingOrders.filter((o) => o.deadlineTone !== "success").length;
  const selectedCount = selectedOrders.size;

  const cards = [
    {
      title: "待排订单",
      value: pendingOrders.length,
      meta: `已选 ${selectedCount} 张`,
      accent: "#205c52"
    },
    {
      title: "队列工时",
      value: formatHours(totalHours),
      meta: `${operations.length} 道工序`,
      accent: "#2d5d8c"
    },
    {
      title: "资源覆盖",
      value: resourceCount,
      meta: "涉及的工段/设备资源",
      accent: "#b97012"
    },
    {
      title: "交期风险",
      value: riskCount,
      meta: riskCount ? "建议优先排程或调整交期" : "当前未见明显风险",
      accent: "#c44733"
    }
  ];

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">生产排产驾驶台</h3>
            <p className="panel-subtitle">
              选择订单范围和开始日期，系统按依赖、资源和班制计算时间。每次排产生成新方案，不覆盖历史。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to="/work-order-import">
              导入工单
            </Link>
            <button className="button secondary" type="button" disabled={running || selectedCount === 0} onClick={handleRun}>
              {running ? "排产中..." : `执行排产 (${selectedCount})`}
            </button>
            <Link className="button ghost" to="/schedule-results">
              查看结果
            </Link>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}

        <div className="scheduling-params">
          <label className="field-label compact-field">
            排产开始日期
            <input
              type="date"
              className="field-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="field-label compact-field">
            基于历史方案
            <select
              className="field-input"
              value={baseScheduleId || ""}
              onChange={(e) => setBaseScheduleId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">不基于历史方案（全新排产）</option>
              {historyPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.schedule_no} — {plan.name}
                </option>
              ))}
            </select>
          </label>
          <span className="param-hint">选择历史方案后，已锁订单将继承原方案排布，未锁订单重新排。</span>
        </div>
      </div>

      <SummaryCards cards={cards} loading={loading} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">待排订单选择</h3>
            <p className="panel-subtitle">勾选要参与本次排产的订单，未勾选订单不纳入排产范围。</p>
          </div>
          <div className="filter-row">
            {filters.map((item) => (
              <button
                key={item.key}
                className={`filter-chip${filter === item.key ? " active" : ""}`}
                type="button"
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
            <button className="button small ghost" type="button" onClick={selectAll}>全选</button>
            <button className="button small ghost" type="button" onClick={clearAll}>清空</button>
          </div>
        </div>

        {loading ? (
          <div className="alert info">正在加载待排订单。</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">暂无待排订单</h3>
            <p className="empty-state-copy">先在工单导入页上传工艺表并确认入库。</p>
            <Link className="button" to="/work-order-import">去导入工单</Link>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={filteredOrders.every((o) => selectedOrders.has(o.id))}
                      onChange={() => {
                        const allSelected = filteredOrders.every((o) => selectedOrders.has(o.id));
                        if (allSelected) {
                          setSelectedOrders((prev) => {
                            const next = new Set(prev);
                            filteredOrders.forEach((o) => next.delete(o.id));
                            return next;
                          });
                        } else {
                          setSelectedOrders((prev) => {
                            const next = new Set(prev);
                            filteredOrders.forEach((o) => next.add(o.id));
                            return next;
                          });
                        }
                      }}
                    />
                  </th>
                  <th>订单号</th>
                  <th>客户</th>
                  <th>产品</th>
                  <th>数量</th>
                  <th>工序数</th>
                  <th>工时</th>
                  <th>交期</th>
                  <th>优先级</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={selectedOrders.has(order.id) ? "" : "row-disabled"}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrder(order.id)}
                      />
                    </td>
                    <td>
                      <p className="data-primary">{order.order_no}</p>
                    </td>
                    <td>{order.customer}</td>
                    <td>{order.product_name}</td>
                    <td>{order.quantity}</td>
                    <td>{order.operationCount}</td>
                    <td>{formatHours(order.totalHours)}</td>
                    <td>
                      <p className="data-primary">{formatDate(order.due_date)}</p>
                      <p className="data-secondary">{formatDeadlineLabel(order.due_date)}</p>
                    </td>
                    <td>{`P${order.priority}`}</td>
                    <td>
                      <StatusBadge tone={order.deadlineTone}>
                        {order.deadlineTone === "danger" ? "已逾期" : order.deadlineTone === "warning" ? "紧迫" : "可控"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {latestResult ? (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">最新方案</h3>
              <p className="panel-subtitle">每次排产都会保留一个历史方案。</p>
            </div>
            <Link className="button small" to="/schedule-results">查看总览</Link>
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-key">方案编号</span>
              <span className="detail-value">{latestResult.schedule.schedule_no}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">明细数</span>
              <span className="detail-value">{latestResult.items.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">逾期工单</span>
              <StatusBadge tone={latestResult.late_orders.length ? "danger" : "success"}>
                {latestResult.late_orders.length}
              </StatusBadge>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

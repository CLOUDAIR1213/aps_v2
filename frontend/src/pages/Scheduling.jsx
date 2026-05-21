import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getProductionOperations,
  getProductionSchedules,
  getProductionSchedulingResult,
  getWorkOrders,
  deleteWorkOrder,
  runProductionScheduling
} from "../api/production";
import DataState from "../components/common/DataState";
import StatusBadge from "../components/StatusBadge";
import {
  formatDate,
  formatDeadlineLabel,
  formatHours,
  getDeadlineTone
} from "../utils/formatters";
import { buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

const filters = [
  { key: "all", label: "全部可排" },
  { key: "late", label: "交期风险" },
  { key: "external", label: "外协相关" }
];

function getCapacityHours(operation) {
  return Number(operation.effective_duration_hours ?? operation.duration_hours ?? 0);
}

function getRiskRank(tone) {
  if (tone === "danger") return 0;
  if (tone === "warning") return 1;
  if (tone === "neutral") return 2;
  return 3;
}

function getOrderScheduleState(order) {
  if (order.pendingOperationCount === 0) {
    return { label: `已排 ${order.scheduledOperationCount}`, meta: "可基于历史方案重排", tone: "info" };
  }
  if (order.scheduledOperationCount > 0) {
    return {
      label: `部分已排 ${order.scheduledOperationCount}/${order.operationCount}`,
      meta: `待排 ${order.pendingOperationCount} 道`,
      tone: "warning"
    };
  }
  return { label: `待排 ${order.pendingOperationCount}`, meta: "首次进入排产", tone: "neutral" };
}

export default function Scheduling() {
  const hasAutoSelectedOrders = useRef(false);
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
  const [deletingOrderId, setDeletingOrderId] = useState(null);
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
      const latestScheduleResult = await getProductionSchedulingResult();
      setLatestResult(latestScheduleResult);
      setActiveScheduleId(latestScheduleResult.schedule.id);
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

  // Build schedulable orders list from pending and scheduled operations.
  const schedulableOrders = useMemo(() => {
    const orderMap = new Map();
    for (const op of operations) {
      const order = workOrders.find((wo) => wo.id === op.work_order_id);
      if (!order || orderMap.has(order.id)) continue;
      const orderOperations = operations.filter((o) => o.work_order_id === order.id);
      const scheduledCount = orderOperations.filter((o) => o.status === "scheduled").length;
      orderMap.set(order.id, {
        ...order,
        operationCount: orderOperations.length,
        scheduledOperationCount: scheduledCount,
        pendingOperationCount: orderOperations.length - scheduledCount,
        totalHours: orderOperations.reduce((sum, o) => sum + getCapacityHours(o), 0),
        deadlineTone: getDeadlineTone(order.due_date),
      });
    }
    return Array.from(orderMap.values()).sort((a, b) => {
      const riskDelta = getRiskRank(a.deadlineTone) - getRiskRank(b.deadlineTone);
      if (riskDelta !== 0) return riskDelta;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [operations, workOrders]);

  // Auto-select all schedulable orders when data loads
  useEffect(() => {
    if (schedulableOrders.length > 0 && !hasAutoSelectedOrders.current) {
      setSelectedOrders(new Set(schedulableOrders.map((o) => o.id)));
      hasAutoSelectedOrders.current = true;
    }
  }, [schedulableOrders]);

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
    setSelectedOrders(new Set(schedulableOrders.map((o) => o.id)));
  };

  const clearAll = () => {
    setSelectedOrders(new Set());
  };

  const handleRun = async () => {
    if (selectedOrders.size === 0) {
      setError("请至少选择一张订单。");
      return;
    }
    const scopeText = baseScheduleId
      ? `确认对 ${selectedOrders.size} 张勾选订单执行重排？新方案只包含本次勾选订单，以及历史方案中已锁定计划的订单。`
      : `确认对 ${selectedOrders.size} 张订单执行排产？将生成新方案，不覆盖历史方案。`;
    if (!window.confirm(scopeText)) {
      return;
    }
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const result = await runProductionScheduling({
        start_date: startDate,
        work_order_ids: Array.from(selectedOrders),
        base_schedule_id: baseScheduleId,
        keep_locked: true,
      });
      setActiveScheduleId(result.schedule.id);
      setLatestResult(result);
      setMessage(`排产完成，生成方案 ${result.schedule.schedule_no}，共 ${result.items.length} 条明细。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "排产执行失败。");
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (
      !window.confirm(
        `确认删除订单「${order.order_no}」？相关零件、工序、排产明细和锁定记录会一并删除。`
      )
    ) {
      return;
    }
    setDeletingOrderId(order.id);
    setError("");
    setMessage("");
    try {
      await deleteWorkOrder(order.id);
      setSelectedOrders((previous) => {
        const next = new Set(previous);
        next.delete(order.id);
        return next;
      });
      setMessage(`订单「${order.order_no}」已删除。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "订单删除失败。");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return schedulableOrders.filter((order) => {
      if (filter === "late") return order.deadlineTone !== "success";
      if (filter === "external") {
        return operations.some(
          (op) => op.work_order_id === order.id && /外|表面处理/.test(op.work_center_name || "")
        );
      }
      return true;
    });
  }, [schedulableOrders, operations, filter]);

  const totalHours = operations.reduce((sum, op) => sum + getCapacityHours(op), 0);
  const resourceCount = new Set(operations.map((op) => op.work_center_id)).size;
  const riskCount = schedulableOrders.filter((o) => o.deadlineTone !== "success").length;
  const selectedCount = selectedOrders.size;
  const selectedTotalHours = schedulableOrders
    .filter((order) => selectedOrders.has(order.id))
    .reduce((sum, order) => sum + order.totalHours, 0);
  const selectedHistoryPlan = historyPlans.find((plan) => plan.id === baseScheduleId);
  const latestScheduleId = latestResult?.schedule?.id;
  const resultPath = buildSchedulePath("/schedule-results", latestScheduleId);
  const dispatchPath = buildSchedulePath("/dispatch", latestScheduleId);
  const runSuccessMessage = message.startsWith("排产完成") ? message : "";
  const noticeMessage = message && !runSuccessMessage ? message : "";

  return (
    <section className="page-grid scheduling-workbench">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">本次排产设置</h3>
            <p className="panel-subtitle">
              把订单范围、开始日期和历史方案口径收拢成一次明确的排产命令。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to="/work-order-import">
              导入工单
            </Link>
          </div>
        </div>

        {error ? <div className="alert danger">{error}</div> : null}
        {noticeMessage ? <div className="alert success">{noticeMessage}</div> : null}

        <div className="schedule-setting-grid">
          <div className="setting-card">
            <span>已选订单数</span>
            <strong>{selectedCount}</strong>
          </div>
          <div className="setting-card">
            <span>总产能工时（按零件数量折算）</span>
            <strong>{formatHours(selectedTotalHours)}</strong>
          </div>
          <div className="setting-card">
            <span>开始日期</span>
            <strong>{startDate}</strong>
          </div>
          <div className="setting-card">
            <span>是否基于历史方案</span>
            <strong>{selectedHistoryPlan ? "是" : "否"}</strong>
            <small>{selectedHistoryPlan ? selectedHistoryPlan.schedule_no : "全新排产"}</small>
          </div>
          <div className="setting-card">
              <span>是否保留锁定计划订单</span>
              <strong>是</strong>
              <small>已锁定计划订单复制原排布</small>
          </div>
        </div>

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
          <div className="schedule-command-action">
            <button className="button secondary" type="button" disabled={running || selectedCount === 0} onClick={handleRun}>
              {running ? "排产中..." : "运行排产"}
            </button>
            <div className="command-rule-list">
              <span>会生成新方案</span>
              <span>不覆盖历史方案</span>
              <span>基于历史方案时，只包含勾选订单和已锁定计划订单</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">订单选择</h3>
            <p className="panel-subtitle">
              默认显示全部可排订单，交期风险订单置顶；已排订单保留在列表中，便于基于历史方案重排。
            </p>
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

        <div className="run-command-strip">
          <div>
            <span className="command-label">本次排产范围</span>
            <strong>{selectedCount ? `${selectedCount} 张订单` : "未选择订单"}</strong>
          </div>
          <div>
            <span className="command-label">产能工时（按零件数量折算）</span>
            <strong>{formatHours(selectedTotalHours)}</strong>
          </div>
          <div>
            <span className="command-label">队列概况</span>
            <strong>{`${schedulableOrders.length} 张 / ${formatHours(totalHours)}`}</strong>
          </div>
          <div>
            <span className="command-label">交期风险</span>
            <strong>{`${riskCount} 张置顶`}</strong>
          </div>
          <div>
            <span className="command-label">资源覆盖</span>
            <strong>{`${resourceCount} 个资源`}</strong>
          </div>
        </div>

        {loading ? (
          <DataState message="正在加载可排订单、工序和历史方案。" title="加载排产队列" />
        ) : filteredOrders.length === 0 ? (
          <DataState
            actionLabel="去导入工单"
            actionTo="/work-order-import"
            message="先在工单导入页上传工艺表并确认入库。"
            title="暂无可排订单"
            tone="warning"
          />
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
                  <th>产能工时（按零件数量折算）</th>
                  <th>交期</th>
                  <th>优先级</th>
                  <th>排产状态</th>
                  <th>交期状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const scheduleState = getOrderScheduleState(order);
                  const rowClassName = [
                    selectedOrders.has(order.id) ? "" : "row-disabled",
                    order.scheduledOperationCount > 0 ? "scheduled-order-row" : "",
                    order.deadlineTone !== "success" ? "risk-order-row" : ""
                  ].filter(Boolean).join(" ");
                  return (
                    <tr key={order.id} className={rowClassName}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => toggleOrder(order.id)}
                        />
                      </td>
                      <td>
                        <p className="data-primary">{order.order_no}</p>
                        {order.deadlineTone !== "success" ? <p className="data-secondary danger-text">交期风险置顶</p> : null}
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
                        <StatusBadge tone={scheduleState.tone}>{scheduleState.label}</StatusBadge>
                        <p className="data-secondary">{scheduleState.meta}</p>
                      </td>
                      <td>
                        <StatusBadge tone={order.deadlineTone}>
                          {order.deadlineTone === "danger" ? "已逾期" : order.deadlineTone === "warning" ? "紧迫" : "可控"}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            className="button small ghost"
                            to={`/scheduling/orders/${order.id}${latestScheduleId ? `?schedule_id=${latestScheduleId}` : ""}`}
                          >
                            详情
                          </Link>
                          <details className="row-more">
                            <summary>更多</summary>
                            <button
                              className="text-danger-action"
                              type="button"
                              disabled={deletingOrderId === order.id || running}
                              onClick={() => handleDeleteOrder(order)}
                            >
                              {deletingOrderId === order.id ? "删除中..." : "删除订单"}
                            </button>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">执行结果</h3>
            <p className="panel-subtitle">
              排产成功后从这里继续复核订单完工时间，或进入派工分摊计划工时。
            </p>
          </div>
          {latestResult ? (
            <div className="panel-actions">
              <Link className="button small" to={resultPath}>查看订单完工时间</Link>
              <Link className="button small ghost" to={dispatchPath}>进入派工</Link>
            </div>
          ) : null}
        </div>

        {runSuccessMessage ? <div className="alert success result-alert">{runSuccessMessage}</div> : null}

        {latestResult ? (
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
        ) : (
          <DataState
            actionLabel="选择订单"
            actionTo="/scheduling"
            message="选择订单并运行排产后，这里会显示新方案和后续动作。"
            title="暂无执行结果"
          />
        )}
      </div>
    </section>
  );
}

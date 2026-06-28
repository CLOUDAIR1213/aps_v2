import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getProductionOperations,
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
  { key: "pending", label: "待排订单" },
  { key: "resource", label: "资源甘特图" },
  { key: "order", label: "订单甘特图" },
  { key: "material", label: "物料需求甘特图" },
  { key: "task", label: "计划任务" }
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
    return { label: `已排 ${order.scheduledOperationCount}`, meta: "可重新计算当前排产", tone: "info" };
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
  const [filter, setFilter] = useState("pending");
  const [orderQuery, setOrderQuery] = useState("");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOrders, setSelectedOrders] = useState(new Set());
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

    setLoading(false);
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
    const scopeText = `确认对 ${selectedOrders.size} 张订单重新排产？本次会覆盖当前统一排产结果，内部工序按工段产能重新计算。`;
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
        keep_locked: true,
      });
      setActiveScheduleId(result.schedule.id);
      setLatestResult(result);
      setMessage(`排产完成，已更新当前统一排产结果，共 ${result.items.length} 条明细。`);
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
      const query = orderQuery.trim().toLowerCase();
      if (query) {
        const haystack = [
          order.order_no,
          order.product_name,
          order.customer
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const scheduleState = getOrderScheduleState(order);
      if (scheduleStatusFilter === "pending" && order.pendingOperationCount === 0) return false;
      if (scheduleStatusFilter === "scheduled" && order.pendingOperationCount > 0) return false;
      if (scheduleStatusFilter === "partial" && !scheduleState.label.startsWith("部分已排")) return false;
      if (scheduleStatusFilter === "risk" && order.deadlineTone === "success") return false;
      return true;
    });
  }, [schedulableOrders, orderQuery, scheduleStatusFilter]);

  const totalHours = operations.reduce((sum, op) => sum + getCapacityHours(op), 0);
  const resourceCount = new Set(operations.map((op) => op.work_center_id)).size;
  const riskCount = schedulableOrders.filter((o) => o.deadlineTone !== "success").length;
  const selectedCount = selectedOrders.size;
  const selectedTotalHours = schedulableOrders
    .filter((order) => selectedOrders.has(order.id))
    .reduce((sum, order) => sum + order.totalHours, 0);
  const latestScheduleId = latestResult?.schedule?.id;
  const resultPath = buildSchedulePath("/schedule-results", latestScheduleId);
  const dispatchPath = buildSchedulePath("/dispatch", latestScheduleId);
  const runSuccessMessage = message.startsWith("排产完成") ? message : "";
  const noticeMessage = message && !runSuccessMessage ? message : "";

  return (
    <section className="page-grid scheduling-workbench">
      <div className="panel scheduling-plan-panel">
        <div className="scheduling-module-head">
          <div className="module-copy">
            <h3 className="panel-title">排产计划</h3>
            <p className="panel-subtitle">按订单范围和开始日期重算当前统一排产结果，内部工序按工段产能排产，人员后续在派工页分配。</p>
          </div>
          <div className="scheduling-head-meta">
            <span>上次排产时间：{latestResult?.schedule?.created_at ? formatDate(latestResult.schedule.created_at) : "暂无"}</span>
            <button className="button secondary" type="button" disabled={running || selectedCount === 0} onClick={handleRun}>
              {running ? "排产中..." : "智能排产"}
            </button>
          </div>
        </div>

        <div className="sub-tab-row" role="tablist" aria-label="排产计划视图">
          {filters.map((item) => (
            <button
              key={item.key}
              className={`sub-tab${filter === item.key ? " active" : ""}`}
              type="button"
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? <div className="alert danger">{error}</div> : null}
        {noticeMessage ? <div className="alert success">{noticeMessage}</div> : null}

        <div className="table-toolbar">
          <label className="toolbar-field">
            <span>订单号</span>
            <input
              className="field-input"
              placeholder="请输入订单号"
              type="search"
              value={orderQuery}
              onChange={(event) => setOrderQuery(event.target.value)}
            />
          </label>
          <label className="toolbar-field">
            <span>排产状态</span>
            <select
              className="field-input"
              value={scheduleStatusFilter}
              onChange={(event) => setScheduleStatusFilter(event.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="pending">待排</option>
              <option value="partial">部分已排</option>
              <option value="scheduled">已排</option>
              <option value="risk">交期风险</option>
            </select>
          </label>
          <label className="toolbar-field">
            <span>开始日期</span>
            <input
              type="date"
              className="field-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <div className="toolbar-actions">
            <button className="button small" type="button">查询</button>
            <button
              className="button small ghost"
              type="button"
              onClick={() => {
                setOrderQuery("");
                setScheduleStatusFilter("all");
              }}
            >
              重置
            </button>
            <button className="button small ghost" type="button" onClick={selectAll}>全选</button>
            <button className="button small ghost" type="button" onClick={clearAll}>清空</button>
          </div>
        </div>

        <div className="compact-summary-strip">
          <span>已选 {selectedCount} 张订单</span>
          <span>产能工时 {formatHours(selectedTotalHours)}</span>
          <span>队列 {schedulableOrders.length} 张 / {formatHours(totalHours)}</span>
          <span>交期风险 {riskCount} 张</span>
          <span>资源 {resourceCount} 个</span>
          <span>当前统一排产</span>
        </div>

        {loading ? (
          <DataState message="正在加载可排订单、工序和当前排产结果。" title="加载排产队列" />
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
                  <th>产品编码</th>
                  <th>数量</th>
                  <th>需求日期</th>
                  <th>优先级</th>
                  <th>排产状态</th>
                  <th>排产</th>
                  <th>显示颜色</th>
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
                      <td>
                        <p className="data-primary">{order.product_code || order.product_name || "-"}</p>
                        <p className="data-secondary">{order.customer || order.product_name}</p>
                      </td>
                      <td>{order.quantity}</td>
                      <td>
                        <p className="data-primary">{formatDate(order.due_date)}</p>
                        <p className="data-secondary">{formatDeadlineLabel(order.due_date)}</p>
                      </td>
                      <td>
                        <StatusBadge tone={order.priority >= 4 ? "danger" : order.priority >= 2 ? "info" : "neutral"}>
                          {`P${order.priority}`}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge tone={scheduleState.tone}>{scheduleState.label}</StatusBadge>
                        <p className="data-secondary">{scheduleState.meta} · {formatHours(order.totalHours)}</p>
                      </td>
                      <td>
                        <span className="schedule-checkmark" aria-label={selectedOrders.has(order.id) ? "已选择排产" : "未选择排产"}>
                          {selectedOrders.has(order.id) ? "✓" : ""}
                        </span>
                      </td>
                      <td>
                        <span className={`color-swatch ${order.deadlineTone}`} aria-label="显示颜色" />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            className="button small ghost"
                            to={`/scheduling/orders/${order.id}${latestScheduleId ? `?schedule_id=${latestScheduleId}` : ""}`}
                          >
                            详情
                          </Link>
                          <button
                            className="text-danger-action"
                            type="button"
                            disabled={deletingOrderId === order.id || running}
                            onClick={() => handleDeleteOrder(order)}
                          >
                            {deletingOrderId === order.id ? "删除中" : "删除"}
                          </button>
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

      <div className="panel result-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">执行结果</h3>
            <p className="panel-subtitle">
              排产成功后从这里复核订单完工时间，或进入派工分配人员并统计负荷。
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

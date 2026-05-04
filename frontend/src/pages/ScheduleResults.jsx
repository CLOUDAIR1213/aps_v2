import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  exportSchedule,
  getProductionResourceLoad,
  getProductionRisks,
  getProductionSchedules,
  getProductionSchedulingOverview,
  getProductionSchedulingResult,
  lockOrder,
  unlockOrder,
} from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatHours,
  formatPercent,
  getDurationHours
} from "../utils/formatters";

function statusLabel(status) {
  if (status === "bottleneck") {
    return "瓶颈";
  }
  if (status === "idle") {
    return "空闲较多";
  }
  return "正常";
}

function OrderGantt({ orders = [], scheduleId }) {
  if (!orders.length) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">暂无订单级排产数据</h3>
        <p className="empty-state-copy">请先在排产驾驶台执行生产排产。</p>
      </div>
    );
  }

  const timestamps = orders.flatMap((order) => [
    new Date(order.planned_start_time).getTime(),
    new Date(order.planned_end_time).getTime()
  ]);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const totalDuration = Math.max(maxTime - minTime, 1);
  const ticks = Array.from({ length: 6 }, (_, index) => {
    const point = minTime + (totalDuration / 5) * index;
    return formatDateTime(point);
  });

  return (
    <div className="order-gantt-shell">
      <div className="order-gantt-scale">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="order-gantt-list">
        {orders.map((order) => {
          const start = new Date(order.planned_start_time).getTime();
          const end = new Date(order.planned_end_time).getTime();
          const left = ((start - minTime) / totalDuration) * 100;
          const width = Math.max(((end - start) / totalDuration) * 100, 8);
          const delayed = order.status === "delayed";

          return (
            <Link
              className={`order-gantt-row${delayed ? " delayed" : ""}`}
              key={order.work_order_id}
              to={`/scheduling/orders/${order.work_order_id}?schedule_id=${scheduleId}`}
              title={`${order.order_no} / ${order.customer_name} / 预计完成 ${formatDateTime(order.planned_end_time)}`}
            >
              <div className="order-gantt-meta">
                <p className="data-primary">
                  {order.order_no}
                  {order.is_locked ? <StatusBadge tone="info">已锁</StatusBadge> : null}
                </p>
                <p className="data-secondary">{`${order.customer_name} / ${order.product_name}`}</p>
              </div>
              <div className="order-gantt-lane">
                <span
                  className="order-gantt-bar"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <strong>{formatDateTime(order.planned_end_time)}</strong>
                  <em>{delayed ? `延期 ${order.delay_days} 天` : "按期"}</em>
                </span>
              </div>
              <div className="order-gantt-status">
                <StatusBadge tone={delayed ? "danger" : "success"}>
                  {delayed ? "延期" : "正常"}
                </StatusBadge>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScheduleId = searchParams.get("schedule_id") || "";
  const [schedules, setSchedules] = useState([]);
  const [overview, setOverview] = useState(null);
  const [resourceLoad, setResourceLoad] = useState([]);
  const [risks, setRisks] = useState([]);
  const [detailResult, setDetailResult] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(requestedScheduleId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [lockingOrderId, setLockingOrderId] = useState(null);

  const loadData = async (scheduleId = selectedScheduleId) => {
    setLoading(true);
    setError("");
    try {
      const scheduleParams = scheduleId ? { schedule_id: scheduleId } : {};
      const [scheduleData, overviewData, loadData, riskData] = await Promise.all([
        getProductionSchedules(),
        getProductionSchedulingOverview(scheduleParams),
        getProductionResourceLoad(scheduleParams),
        getProductionRisks(scheduleParams)
      ]);
      setSchedules(scheduleData.schedules || []);
      setOverview(overviewData);
      setResourceLoad(loadData.resources || []);
      setRisks(riskData.risks || []);
      setSelectedScheduleId(String(overviewData.schedule_id));
      if (!scheduleId || String(overviewData.schedule_id) !== String(scheduleId)) {
        setSearchParams({ schedule_id: String(overviewData.schedule_id) });
      }
      try {
        setDetailResult(await getProductionSchedulingResult(overviewData.schedule_id));
      } catch {
        setDetailResult(null);
      }
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setSchedules([]);
        setOverview(null);
        setResourceLoad([]);
        setRisks([]);
        setDetailResult(null);
      } else {
        setError(requestError?.response?.data?.detail || "排产总览加载失败。");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(requestedScheduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedScheduleId]);

  const handleLockOrder = async (workOrderId) => {
    setLockingOrderId(workOrderId);
    setError("");
    setMessage("");
    try {
      await lockOrder(selectedScheduleId, workOrderId);
      setMessage("订单已锁定，重排时计划不变。");
      await loadData(selectedScheduleId);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "锁定失败。");
    } finally {
      setLockingOrderId(null);
    }
  };

  const handleUnlockOrder = async (workOrderId) => {
    setLockingOrderId(workOrderId);
    setError("");
    setMessage("");
    try {
      await unlockOrder(selectedScheduleId, workOrderId);
      setMessage("订单已解锁。");
      await loadData(selectedScheduleId);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "解锁失败。");
    } finally {
      setLockingOrderId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await exportSchedule(selectedScheduleId);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `排产结果_${overview?.schedule_no || selectedScheduleId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("导出成功。");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "导出失败。");
    } finally {
      setExporting(false);
    }
  };

  const cards = useMemo(() => {
    return [
      {
        title: "当前方案",
        value: overview?.schedule_no || "--",
        meta: overview?.schedule_name || "暂无排产方案",
        accent: "#205c52"
      },
      {
        title: "总订单数",
        value: overview?.total_orders ?? 0,
        meta: `已排 ${overview?.scheduled_orders ?? 0} 张`,
        accent: "#2d5d8c"
      },
      {
        title: "延期风险",
        value: overview?.delayed_orders ?? 0,
        meta: overview?.delayed_orders ? "需要检查瓶颈资源" : "当前方案交期可控",
        accent: "#c44733"
      },
      {
        title: "平均资源负荷",
        value: formatPercent((overview?.average_resource_utilization || 0) * 100),
        meta: "按资源负荷率平均",
        accent: "#b97012"
      },
      {
        title: "最晚完工",
        value: overview?.latest_finish_time ? formatDateTime(overview.latest_finish_time) : "--",
        meta: "当前方案最终完成时间",
        accent: "#315f88"
      }
    ];
  }, [overview]);

  if (loading) {
    return (
      <section className="page-grid">
        <div className="alert info">正在加载订单级排产总览。</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-grid">
        <div className="alert danger">{error}</div>
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="page-grid">
        <div className="empty-state">
          <h3 className="empty-state-title">暂无排产方案</h3>
          <p className="empty-state-copy">请先导入工单并在排产驾驶台执行生产排产。</p>
          <div className="panel-actions">
            <Link className="button" to="/scheduling">前往排产</Link>
            <Link className="button ghost" to="/work-order-import">导入工单</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid">
      {message ? <div className="alert success">{message}</div> : null}
      {risks.length ? (
        <div className="alert warning">
          当前方案有 {risks.length} 张订单存在延期风险，请优先检查瓶颈资源和交期承诺。
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">订单级排产总览</h3>
            <p className="panel-subtitle">
              默认按订单查看预计开始、预计完成和延期风险。点击订单可下钻，锁定后重排计划不变。
            </p>
          </div>
          <div className="panel-actions">
            <label className="field-label compact-field">
              排产方案
              <select
                className="field-input"
                value={selectedScheduleId}
                onChange={(event) => setSearchParams({ schedule_id: event.target.value })}
              >
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.schedule_no}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button ghost"
              type="button"
              disabled={exporting}
              onClick={handleExport}
            >
              {exporting ? "导出中..." : "导出 Excel"}
            </button>
            <button className="button ghost" type="button" onClick={() => loadData(selectedScheduleId)}>
              刷新
            </button>
          </div>
        </div>
      </div>

      <SummaryCards cards={cards} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">订单级甘特图</h3>
            <p className="panel-subtitle">每个订单只显示一条时间条，点击可下钻到零件和工序解释。</p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost small" to={`/gantt?schedule_id=${overview.schedule_id}`}>查看资源甘特图</Link>
            <Link className="button ghost small" to={`/scheduling/board/${overview.schedule_id}`}>查看生产排班表</Link>
          </div>
        </div>
        <OrderGantt orders={overview.orders} scheduleId={overview.schedule_id} />
      </div>

      {/* Order lock table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">订单锁定管理</h3>
            <p className="panel-subtitle">锁定订单后重排时计划不变，未锁订单将自动避让已锁订单的资源占用。</p>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>客户</th>
                <th>预计完成</th>
                <th>延期</th>
                <th>锁定状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {overview.orders.map((order) => (
                <tr key={order.work_order_id}>
                  <td>
                    <p className="data-primary">{order.order_no}</p>
                    <p className="data-secondary">{order.product_name}</p>
                  </td>
                  <td>{order.customer_name}</td>
                  <td>{formatDateTime(order.planned_end_time)}</td>
                  <td>
                    {order.status === "delayed" ? (
                      <StatusBadge tone="danger">{`延期 ${order.delay_days} 天`}</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">正常</StatusBadge>
                    )}
                  </td>
                  <td>
                    {order.is_locked ? (
                      <StatusBadge tone="info">已锁定</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">未锁定</StatusBadge>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {order.is_locked ? (
                        <button
                          className="button small ghost"
                          type="button"
                          disabled={lockingOrderId === order.work_order_id}
                          onClick={() => handleUnlockOrder(order.work_order_id)}
                        >
                          {lockingOrderId === order.work_order_id ? "处理中..." : "解锁"}
                        </button>
                      ) : (
                        <button
                          className="button small"
                          type="button"
                          disabled={lockingOrderId === order.work_order_id}
                          onClick={() => handleLockOrder(order.work_order_id)}
                        >
                          {lockingOrderId === order.work_order_id ? "处理中..." : "锁定"}
                        </button>
                      )}
                      <Link
                        className="button small ghost"
                        to={`/scheduling/orders/${order.work_order_id}?schedule_id=${overview.schedule_id}`}
                      >
                        详情
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">延期风险列表</h3>
              <p className="panel-subtitle">按延期天数排序，给出原因和建议。</p>
            </div>
          </div>
          {risks.length ? (
            <div className="risk-list">
              {risks.map((risk) => (
                <Link
                  className="risk-row"
                  key={risk.work_order_id}
                  to={`/scheduling/orders/${risk.work_order_id}?schedule_id=${overview.schedule_id}`}
                >
                  <div>
                    <p className="data-primary">{risk.order_no}</p>
                    <p className="data-secondary">{risk.customer_name}</p>
                  </div>
                  <div>
                    <p className="data-primary">{formatDate(risk.due_date)}</p>
                    <p className="data-secondary">交期</p>
                  </div>
                  <div>
                    <p className="data-primary">{formatDateTime(risk.planned_end_time)}</p>
                    <p className="data-secondary">预计完成</p>
                  </div>
                  <StatusBadge tone="danger">{`延期 ${risk.delay_days} 天`}</StatusBadge>
                  <div className="risk-explain">
                    <p className="data-primary">{risk.bottleneck_resource || "关键工序"}</p>
                    <p className="data-secondary">{risk.reason}</p>
                    <p className="data-secondary">{risk.suggestion}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="alert success">暂无延期风险。</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">资源负荷概览</h3>
              <p className="panel-subtitle">用于判断哪些资源忙、哪些资源空。</p>
            </div>
          </div>
          <div className="resource-load-list">
            {resourceLoad.map((resource) => (
              <div className="resource-load-row" key={`${resource.work_center_id}-${resource.machine_id || "external"}`}>
                <div className="resource-load-head">
                  <div>
                    <p className="data-primary">{resource.work_center_name}</p>
                    <p className="data-secondary">{resource.machine_name}</p>
                  </div>
                  <StatusBadge
                    tone={
                      resource.status === "bottleneck"
                        ? "danger"
                        : resource.status === "idle"
                          ? "warning"
                          : "success"
                    }
                  >
                    {statusLabel(resource.status)}
                  </StatusBadge>
                </div>
                <div className="load-bar">
                  <span style={{ width: `${Math.min(resource.utilization * 100, 100)}%` }} />
                </div>
                <p className="data-secondary">
                  {`${formatPercent(resource.utilization * 100)} / ${resource.busy_minutes} 分钟占用 / ${resource.available_minutes} 分钟可用`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">工序级排产明细</h3>
            <p className="panel-subtitle">用于核对具体零件和资源占用。</p>
          </div>
        </div>
        {detailResult?.items?.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>工单</th>
                  <th>零件</th>
                  <th>资源</th>
                  <th>时间窗口</th>
                  <th>时长</th>
                  <th>类型</th>
                </tr>
              </thead>
              <tbody>
                {detailResult.items.map((item) => (
                  <tr key={item.id} className={item.locked ? "row-locked" : ""}>
                    <td>
                      <p className="data-primary">
                        {item.order_no}
                        {item.locked ? <StatusBadge tone="info">锁</StatusBadge> : null}
                      </p>
                      <p className="data-secondary">{item.customer}</p>
                    </td>
                    <td>
                      <p className="data-primary">{item.drawing_no}</p>
                      <p className="data-secondary">{`${item.part_no} / ${item.operation_name}`}</p>
                    </td>
                    <td>
                      <p className="data-primary">{item.work_center_name}</p>
                      <p className="data-secondary">{item.machine_name || "外协"}</p>
                    </td>
                    <td>
                      <p className="data-primary">{formatDateTime(item.start_time)}</p>
                      <p className="data-secondary">{formatDateTime(item.end_time)}</p>
                    </td>
                    <td>{formatHours(getDurationHours(item.start_time, item.end_time))}</td>
                    <td>
                      <StatusBadge tone={item.is_external ? "warning" : "info"}>
                        {item.is_external ? "外协" : "内部"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3 className="empty-state-title">暂无工序明细</h3>
            <p className="empty-state-copy">当前方案没有可展示的工序级排产数据。</p>
          </div>
        )}
      </div>
    </section>
  );
}

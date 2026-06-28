import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  exportConstructionSheets,
  exportWorkOrderTickets,
  getProductionSchedules,
  getWorkCenters,
  getWorkOrderTickets,
  getWorkOrders,
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours } from "../utils/formatters";
import { buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

function minutesToHours(minutes) {
  return formatHours((Number(minutes) || 0) / 60);
}

function getTicketStatusLabel(status) {
  if (status === "ready_to_export") {
    return "可导出";
  }
  if (status === "needs_completion") {
    return "待补足";
  }
  return "待派工";
}

function getTicketTone(status) {
  if (status === "ready_to_export") {
    return "success";
  }
  if (status === "needs_completion") {
    return "warning";
  }
  return "neutral";
}

function allocationText(allocations = []) {
  if (!allocations.length) {
    return "未派工";
  }
  return allocations
    .map((allocation) => `${allocation.person_name} ${allocation.ratio_percent}% / ${minutesToHours(allocation.planned_minutes)}`)
    .join(" / ");
}

function buildParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export default function WorkOrderTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScheduleId = searchParams.get("schedule_id") || "";
  const [schedules, setSchedules] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(requestedScheduleId);
  const [ticketData, setTicketData] = useState(null);
  const [filters, setFilters] = useState({
    work_order_id: "",
    work_center_id: "",
    date_from: "",
    date_to: "",
    ticket_status: "",
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingConstruction, setExportingConstruction] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentSchedule = schedules.find((schedule) => String(schedule.id) === String(selectedScheduleId))
    || ticketData?.schedule
    || null;

  const loadMeta = async () => {
    try {
      const [scheduleData, orderData, centerData] = await Promise.all([
        getProductionSchedules(),
        getWorkOrders(),
        getWorkCenters(),
      ]);
      setSchedules(scheduleData.schedules || []);
      setOrders(orderData || []);
      setWorkCenters(centerData || []);
      return scheduleData.schedules || [];
    } catch {
      setSchedules([]);
      setOrders([]);
      setWorkCenters([]);
      return [];
    }
  };

  const loadTickets = async (scheduleId = selectedScheduleId, nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const scheduleList = schedules.length ? schedules : await loadMeta();
      const resolvedScheduleId = scheduleId || scheduleList[0]?.id;
      if (!resolvedScheduleId) {
        setTicketData(null);
        return;
      }
      const data = await getWorkOrderTickets(resolvedScheduleId, buildParams(nextFilters));
      setTicketData(data);
      setSelectedScheduleId(String(resolvedScheduleId));
      setActiveScheduleId(resolvedScheduleId);
      setSearchParams({ schedule_id: String(resolvedScheduleId) });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "加工单数据加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(requestedScheduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedScheduleId]);

  const summary = useMemo(() => {
    const tasks = ticketData?.tasks || [];
    return tasks.reduce(
      (acc, task) => {
        acc.total += 1;
        acc.minutes += Number(task.planned_minutes) || 0;
        if (task.ticket_status === "ready_to_export") {
          acc.ready += 1;
        } else if (task.ticket_status === "needs_completion") {
          acc.partial += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      },
      { total: 0, ready: 0, partial: 0, pending: 0, minutes: 0 },
    );
  }, [ticketData]);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadTickets(selectedScheduleId, filters);
  };

  const handleScheduleChange = (event) => {
    const value = event.target.value;
    setSelectedScheduleId(value);
    setActiveScheduleId(value);
    loadTickets(value, filters);
  };

  const handleExport = async () => {
    if (!selectedScheduleId || !summary.ready) {
      return;
    }
    setExporting(true);
    setError("");
    setMessage("");
    try {
      const exportFilters = { ...filters };
      delete exportFilters.ticket_status;
      const response = await exportWorkOrderTickets(selectedScheduleId, buildParams(exportFilters));
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `加工单_${currentSchedule?.schedule_no || selectedScheduleId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("加工单已导出，导出记录已写入后台。");
      await loadTickets(selectedScheduleId, filters);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "加工单导出失败。");
    } finally {
      setExporting(false);
    }
  };

  const handleConstructionSheetExport = async () => {
    if (!selectedScheduleId) {
      return;
    }
    setExportingConstruction(true);
    setError("");
    setMessage("");
    try {
      const exportFilters = { ...filters };
      delete exportFilters.ticket_status;
      const response = await exportConstructionSheets(selectedScheduleId, buildParams(exportFilters));
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `施工单_${currentSchedule?.schedule_no || selectedScheduleId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("施工单已导出，按零件生成施工单 Sheet。");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "施工单导出失败。");
    } finally {
      setExportingConstruction(false);
    }
  };

  return (
    <section className="page-grid">
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert danger">{error}</div> : null}

      <CurrentScheduleBanner loading={loading} overview={null} schedule={currentSchedule} />

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">加工单中心</h3>
            <p className="panel-subtitle">加工单按已完整派工任务导出；施工单按零件汇总全部已排产内部工序，排产后即可导出。</p>
          </div>
          <div className="panel-actions">
            <label className="field-label compact-field">
              排产方案
              <select className="field-input" value={selectedScheduleId} onChange={handleScheduleChange}>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.schedule_no}
                  </option>
                ))}
              </select>
            </label>
            <Link className="button ghost" to={buildSchedulePath("/dispatch", selectedScheduleId)}>
              派工与工时
            </Link>
            <button
              className="button ghost"
              type="button"
              onClick={handleConstructionSheetExport}
              disabled={exportingConstruction || !selectedScheduleId}
            >
              {exportingConstruction ? "导出中..." : "导出施工单"}
            </button>
            <button className="button" type="button" onClick={handleExport} disabled={exporting || !summary.ready}>
              {exporting ? "导出中..." : "导出加工单"}
            </button>
          </div>
        </div>

        <form className="table-toolbar dispatch-filter-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-field">
            <span>工单</span>
            <select
              className="field-input"
              value={filters.work_order_id}
              onChange={(event) => setFilters((current) => ({ ...current, work_order_id: event.target.value }))}
            >
              <option value="">全部工单</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>{order.order_no}</option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>工段</span>
            <select
              className="field-input"
              value={filters.work_center_id}
              onChange={(event) => setFilters((current) => ({ ...current, work_center_id: event.target.value }))}
            >
              <option value="">全部工段</option>
              {workCenters.map((center) => (
                <option key={center.id} value={center.id}>{center.name}</option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>开始日期</span>
            <input
              className="field-input"
              type="date"
              value={filters.date_from}
              onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
            />
          </label>
          <label className="toolbar-field">
            <span>结束日期</span>
            <input
              className="field-input"
              type="date"
              value={filters.date_to}
              onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
            />
          </label>
          <label className="toolbar-field">
            <span>加工单状态</span>
            <select
              className="field-input"
              value={filters.ticket_status}
              onChange={(event) => setFilters((current) => ({ ...current, ticket_status: event.target.value }))}
            >
              <option value="">全部状态</option>
              <option value="ready_to_export">可导出</option>
              <option value="needs_completion">待补足</option>
              <option value="pending_dispatch">待派工</option>
            </select>
          </label>
          <div className="toolbar-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        </form>
      </div>

      <div className="compact-summary-strip dispatch-summary-strip">
        <span>任务总数：<strong>{summary.total}</strong></span>
        <span>可导出：<strong>{summary.ready}</strong></span>
        <span>待补足：<strong>{summary.partial}</strong></span>
        <span>待派工：<strong>{summary.pending}</strong></span>
        <span>计划工时：<strong>{minutesToHours(summary.minutes)}</strong></span>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">加工单候选</h3>
            <p className="panel-subtitle">加工单号按排产方案和任务 ID 生成；施工单会按零件分 Sheet，列出该零件全部工序。</p>
          </div>
        </div>
        {loading ? (
          <div className="alert info">正在加载加工单任务。</div>
        ) : !ticketData ? (
          <div className="empty-state">
            <h3 className="empty-state-title">暂无排产方案</h3>
            <p className="empty-state-copy">请先完成排产和派工。</p>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>加工单</th>
                  <th>任务</th>
                  <th>资源</th>
                  <th>计划时间</th>
                  <th>工时</th>
                  <th>人员</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {ticketData.tasks.map((task) => (
                  <tr key={task.schedule_item_id}>
                    <td>
                      <p className="data-primary">JG-{currentSchedule?.schedule_no || selectedScheduleId}-{task.schedule_item_id}</p>
                      <p className="data-secondary">{task.customer || "--"}</p>
                    </td>
                    <td>
                      <p className="data-primary">{task.order_no} / {task.operation_name}</p>
                      <p className="data-secondary">{task.drawing_no} / {task.part_name}</p>
                      {task.requirement_note ? (
                        <StatusBadge tone="warning" title={task.requirement_note}>加工要求</StatusBadge>
                      ) : null}
                    </td>
                    <td>
                      <p className="data-primary">{task.work_center_name}</p>
                      <p className="data-secondary">{task.machine_name || "--"}</p>
                    </td>
                    <td>
                      <p className="data-primary">{formatDateTime(task.planned_start)}</p>
                      <p className="data-secondary">{formatDateTime(task.planned_end)}</p>
                    </td>
                    <td>{minutesToHours(task.planned_minutes)}</td>
                    <td>
                      <p className="data-secondary">{allocationText(task.allocations)}</p>
                    </td>
                    <td>
                      <StatusBadge tone={getTicketTone(task.ticket_status)}>
                        {getTicketStatusLabel(task.ticket_status)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!ticketData.tasks.length ? (
              <div className="alert info">当前筛选条件下没有加工单任务。</div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

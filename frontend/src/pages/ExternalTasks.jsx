import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  exportExternalWorkOrders,
  getExternalTasks,
  getProductionSchedules,
  getWorkCenters,
  updateExternalTask
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours } from "../utils/formatters";
import { buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

const STATUS_LABELS = {
  pending: "待发出",
  sent: "已发出",
  returned: "已返回",
  exception: "异常"
};

const STATUS_TONES = {
  pending: "warning",
  sent: "info",
  returned: "success",
  exception: "danger"
};

function toLocalInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function isoFromLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

export default function ExternalTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScheduleId = searchParams.get("schedule_id") || "";
  const [schedules, setSchedules] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(requestedScheduleId);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ work_center_id: "", external_status: "", order_no: "", vendor_name: "" });
  const [editing, setEditing] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const externalCenters = useMemo(
    () => workCenters.filter((center) => center.is_external),
    [workCenters]
  );

  const loadData = async (scheduleId = selectedScheduleId, nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const [scheduleData, centerData] = await Promise.all([
        getProductionSchedules(),
        getWorkCenters()
      ]);
      const nextSchedules = scheduleData.schedules || [];
      const resolvedScheduleId = scheduleId || nextSchedules[0]?.id || "";
      setSchedules(nextSchedules);
      setWorkCenters(centerData);
      if (!resolvedScheduleId) {
        setData(null);
        return;
      }
      const params = Object.fromEntries(
        Object.entries({ ...nextFilters, schedule_id: resolvedScheduleId })
          .filter(([, value]) => value !== "" && value !== null)
      );
      const nextData = await getExternalTasks(params);
      setData(nextData);
      setSelectedScheduleId(String(resolvedScheduleId));
      setActiveScheduleId(resolvedScheduleId);
      setSearchParams({ schedule_id: String(resolvedScheduleId) });
      setEditing(
        Object.fromEntries(
          (nextData.tasks || []).map((task) => [
            task.schedule_item_id,
            {
              external_status: task.external_status,
              external_expected_return_at: toLocalInputValue(task.expected_return_at),
              external_note: task.external_note || ""
            }
          ])
        )
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "外协任务加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(requestedScheduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedScheduleId]);

  const tasks = data?.tasks || [];
  const vendorOptions = useMemo(() => {
    const labels = new Set(tasks.map((task) => task.vendor_name || "未指定供应商"));
    return [...labels].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [tasks]);

  const externalSummaryItems = useMemo(() => {
    const pending = tasks.filter((task) => task.external_status === "pending").length;
    const exceptions = tasks.filter((task) => task.external_status === "exception").length;
    const hours = tasks.reduce((sum, task) => sum + (Number(task.planned_duration_hours) || 0), 0);
    const latest = tasks.reduce((max, task) => {
      const time = new Date(task.expected_return_at).getTime();
      return Number.isFinite(time) ? Math.max(max, time) : max;
    }, 0);
    return [
      { title: "外协任务", value: tasks.length, meta: `${pending} 个待发出`, accent: "#2d5d8c" },
      { title: "计划周期", value: formatHours(hours), meta: "按当前方案汇总", accent: "#b97012" },
      { title: "异常", value: exceptions, meta: exceptions ? "需要处理" : "无异常", accent: exceptions ? "#c44733" : "#205c52" },
      { title: "最晚返回", value: latest ? formatDateTime(latest) : "--", meta: "影响后续内部工序", accent: "#7d567e" }
    ];
  }, [tasks]);

  const patchEditing = (taskId, patch) => {
    setEditing((current) => ({
      ...current,
      [taskId]: { ...(current[taskId] || {}), ...patch }
    }));
  };

  const handleSave = async (task) => {
    const draft = editing[task.schedule_item_id] || {};
    setSavingId(task.schedule_item_id);
    setError("");
    setMessage("");
    try {
      await updateExternalTask(task.schedule_item_id, {
        external_status: draft.external_status,
        external_expected_return_at: isoFromLocal(draft.external_expected_return_at),
        external_note: draft.external_note || null
      });
      setMessage("外协任务已更新，后续计划已重算。");
      await loadData(selectedScheduleId, filters);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "外协任务更新失败。");
    } finally {
      setSavingId(null);
    }
  };

  const buildExportParams = () => Object.fromEntries(
    Object.entries({ ...filters, schedule_id: selectedScheduleId })
      .filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );

  const handleExport = async () => {
    if (!selectedScheduleId || !tasks.length) {
      return;
    }
    setExporting(true);
    setError("");
    setMessage("");
    try {
      const response = await exportExternalWorkOrders(buildExportParams());
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `外协工单_${data?.schedule?.schedule_no || selectedScheduleId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("外协工单已导出。");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "外协工单导出失败。");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="page-grid">
      <CurrentScheduleBanner
        schedule={data?.schedule}
      />
      <div className="page-actions-row">
        <Link className="button ghost" to={buildSchedulePath("/schedule-results", selectedScheduleId)}>
          订单完工表
        </Link>
        <Link className="button ghost" to="/work-centers">
          外协工段配置
        </Link>
      </div>

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">外协队列筛选</h3>
            <p className="panel-subtitle">按当前排产方案维护外协送出、返回和异常。</p>
          </div>
        </div>
        <div className="table-toolbar external-task-toolbar">
          <label className="toolbar-field">
            <span>排产方案</span>
            <select
              className="field-input"
              value={selectedScheduleId}
              onChange={(event) => loadData(event.target.value, filters)}
            >
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.schedule_no}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>外协工段</span>
            <select
              className="field-input"
              value={filters.work_center_id}
              onChange={(event) => setFilters({ ...filters, work_center_id: event.target.value })}
            >
              <option value="">全部</option>
              {externalCenters.map((center) => (
                <option key={center.id} value={center.id}>{center.name}</option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>状态</span>
            <select
              className="field-input"
              value={filters.external_status}
              onChange={(event) => setFilters({ ...filters, external_status: event.target.value })}
            >
              <option value="">全部</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>供应商</span>
            <select
              className="field-input"
              value={filters.vendor_name}
              onChange={(event) => setFilters({ ...filters, vendor_name: event.target.value })}
            >
              <option value="">全部供应商</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>订单号</span>
            <input
              className="field-input"
              value={filters.order_no}
              onChange={(event) => setFilters({ ...filters, order_no: event.target.value })}
            />
          </label>
          <div className="toolbar-actions">
            <button
              className="button ghost"
              type="button"
              onClick={handleExport}
              disabled={exporting || !selectedScheduleId || !tasks.length}
            >
              {exporting ? "导出中..." : "导出外协工单"}
            </button>
            <button className="button" type="button" onClick={() => loadData(selectedScheduleId, filters)}>
              查询
            </button>
          </div>
        </div>
        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <CompactSummaryStrip className="external-summary-strip" items={externalSummaryItems} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">外协任务列表</h3>
            <p className="panel-subtitle">预计返回时间会影响后续内部工序和父件工序。</p>
          </div>
        </div>
        {loading ? <div className="data-state-copy">加载中...</div> : null}
        <div className="table-shell">
          <table className="data-table external-task-table">
            <thead>
              <tr>
                <th>订单 / 零件</th>
                <th>供应商 / 外协工段</th>
                <th>计划送出</th>
                <th>预计返回</th>
                <th>状态</th>
                <th>加工要求 / 外协备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const draft = editing[task.schedule_item_id] || {};
                return (
                  <tr key={task.schedule_item_id}>
                    <td>
                      <p className="data-primary">{task.order_no}</p>
                      <p className="data-secondary">{`${task.part_no} / ${task.drawing_no}`}</p>
                      <p className="data-secondary">{task.part_name}</p>
                    </td>
                    <td>
                      <p className="data-primary">{task.vendor_name || "未指定供应商"}</p>
                      <p className="data-secondary">{task.work_center_name}</p>
                      <p className="data-secondary">{`${task.external_capacity_slots} 并发 / ${formatHours(task.planned_duration_hours)}`}</p>
                    </td>
                    <td>{formatDateTime(task.planned_send_at)}</td>
                    <td>
                      <input
                        className="field-input table-input"
                        type="datetime-local"
                        value={draft.external_expected_return_at || ""}
                        onChange={(event) => patchEditing(task.schedule_item_id, { external_expected_return_at: event.target.value })}
                      />
                    </td>
                    <td>
                      <StatusBadge tone={STATUS_TONES[task.external_status] || "neutral"}>
                        {STATUS_LABELS[task.external_status] || task.external_status}
                      </StatusBadge>
                      <select
                        className="field-input table-select"
                        value={draft.external_status || task.external_status}
                        onChange={(event) => patchEditing(task.schedule_item_id, { external_status: event.target.value })}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {task.requirement_note ? (
                        <p className="data-secondary" title={task.requirement_note}>
                          加工要求：{task.requirement_note}
                        </p>
                      ) : (
                        <p className="data-secondary">加工要求：无</p>
                      )}
                      <input
                        className="field-input table-input"
                        aria-label="外协备注"
                        value={draft.external_note || ""}
                        onChange={(event) => patchEditing(task.schedule_item_id, { external_note: event.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        className="button small"
                        type="button"
                        disabled={savingId === task.schedule_item_id}
                        onClick={() => handleSave(task)}
                      >
                        {savingId === task.schedule_item_id ? "保存中..." : "保存"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="data-state-copy">当前筛选条件下没有外协任务。</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

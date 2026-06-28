import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getScheduleBoard,
  getProductionSchedules,
  getProductionSchedulingOverview,
  getWorkCenters,
  getWorkOrders
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours } from "../utils/formatters";
import { buildSchedulePath, getActiveScheduleId, setActiveScheduleId } from "../utils/scheduleContext";

const viewModes = [
  { value: "by_person", label: "人员" },
  { value: "by_work_center", label: "工段" },
  { value: "by_machine", label: "设备" }
];

function toDateInputValue(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

export default function ScheduleBoard() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [overview, setOverview] = useState(null);
  const [workCenters, setWorkCenters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [rowType, setRowType] = useState("all");
  const [filters, setFilters] = useState({
    work_center: "",
    start_date: "",
    days: 14,
    order_id: "",
    view_mode: "by_person"
  });

  const resolveDefaultStartDate = async (currentScheduleId) => {
    const scheduleData = await getProductionSchedules();
    const schedules = scheduleData.schedules || [];
    const schedule = schedules.find((item) => String(item.id) === String(currentScheduleId));
    return toDateInputValue(schedule?.start_time) || "";
  };

  const loadBoard = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      if (!scheduleId) {
        const scheduleData = await getProductionSchedules();
        const schedules = scheduleData.schedules || [];
        const activeScheduleId = getActiveScheduleId();
        const currentSchedule = schedules.find((schedule) => String(schedule.id) === String(activeScheduleId))
          || schedules[0];
        if (!currentSchedule) {
          setBoard(null);
          setOverview(null);
          setError("");
          return;
        }
        navigate(`/scheduling/board/${currentSchedule.id}`, { replace: true });
        return;
      }
      const effectiveFilters = { ...nextFilters };
      if (!effectiveFilters.start_date) {
        effectiveFilters.start_date = await resolveDefaultStartDate(scheduleId);
      }
      const params = Object.fromEntries(
        Object.entries(effectiveFilters).filter(([, value]) => value !== "" && value !== null)
      );
      const data = await getScheduleBoard(scheduleId, params);
      let overviewData = null;
      try {
        overviewData = await getProductionSchedulingOverview({ schedule_id: scheduleId });
      } catch {
        overviewData = null;
      }
      setBoard(data);
      setOverview(overviewData);
      setActiveScheduleId(scheduleId);
      setSelectedGroup("all");
      if (effectiveFilters.start_date !== nextFilters.start_date) {
        setFilters((previous) => ({ ...previous, start_date: effectiveFilters.start_date }));
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "排班表加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [centerData, orderData] = await Promise.all([getWorkCenters(), getWorkOrders()]);
        setWorkCenters(centerData);
        setOrders(orderData);
      } catch {
        setWorkCenters([]);
        setOrders([]);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  const groups = useMemo(() => {
    const map = new Map();
    board?.rows?.forEach((row) => {
      map.set(row.group_key, row.group_label);
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => {
        if (filters.view_mode !== "by_person") {
          return String(a.label).localeCompare(String(b.label), "zh-Hans-CN");
        }
        if (a.key === "person:unassigned") {
          return -1;
        }
        if (b.key === "person:unassigned") {
          return 1;
        }
        return String(a.label).localeCompare(String(b.label), "zh-Hans-CN");
      });
  }, [board, filters.view_mode]);

  const rows = useMemo(() => {
    const allRows = board?.rows || [];
    const normalizedQuery = query.trim().toLowerCase();
    return allRows
      .filter((row) => {
        if (selectedGroup !== "all" && row.group_key !== selectedGroup) {
          return false;
        }
        if (rowType === "late" && !row.is_late) {
          return false;
        }
        if (rowType === "external" && !row.is_external) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return [
          row.order_no,
          row.drawing_no,
          row.part_no,
          row.part_name,
          row.customer_name,
          row.machine_name,
          row.person_name
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (filters.view_mode === "by_person") {
          const aUnassigned = a.group_key === "person:unassigned" ? 0 : 1;
          const bUnassigned = b.group_key === "person:unassigned" ? 0 : 1;
          return aUnassigned - bUnassigned
            || String(a.group_label).localeCompare(String(b.group_label), "zh-Hans-CN")
            || new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime();
        }
        return String(a.group_label).localeCompare(String(b.group_label), "zh-Hans-CN")
          || new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime();
      });
  }, [board, selectedGroup, query, rowType, filters.view_mode]);

  const handleQuickDays = (days) => {
    const nextFilters = { ...filters, days };
    setFilters(nextFilters);
    loadBoard(nextFilters);
  };

  const activeGroupLabel = useMemo(() => {
    if (selectedGroup === "all") {
      return "全部分组";
    }
    return groups.find((group) => group.key === selectedGroup)?.label || "当前分组";
  }, [groups, selectedGroup]);

  const handleSubmit = (event) => {
    event.preventDefault();
    loadBoard(filters);
  };

  const visibleHours = rows.reduce(
    (sum, row) => sum + row.daily_cells.reduce((cellSum, cell) => cellSum + cell.hours, 0),
    0
  );
  const lateRows = rows.filter((row) => row.is_late).length;
  const externalRows = rows.filter((row) => row.is_external).length;

  return (
    <section className="page-grid">
      <CurrentScheduleBanner loading={loading} overview={overview} schedule={board?.schedule} />

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">生产排班表</h3>
            <p className="panel-subtitle">
              默认按人员复核每天任务，工段和设备视图保留为辅助查看。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to={buildSchedulePath("/schedule-results", scheduleId)}>
              回到结果
            </Link>
            <Link className="button ghost" to={buildSchedulePath("/dispatch", scheduleId)}>
              派工与工时
            </Link>
            <Link className="button ghost" to={buildSchedulePath("/gantt", scheduleId)}>
              查看甘特图
            </Link>
          </div>
        </div>

        <form className="table-toolbar board-filter-toolbar" onSubmit={handleSubmit}>
          <label className="toolbar-field">
            <span>视图</span>
            <select
              className="field-input"
              value={filters.view_mode}
              onChange={(event) => {
                const nextFilters = { ...filters, view_mode: event.target.value };
                setFilters(nextFilters);
                setSelectedGroup("all");
                loadBoard(nextFilters);
              }}
            >
              {viewModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>工段</span>
            <select
              className="field-input"
              value={filters.work_center}
              onChange={(event) => setFilters({ ...filters, work_center: event.target.value })}
            >
              <option value="">全部工段</option>
              {workCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>工单</span>
            <select
              className="field-input"
              value={filters.order_id}
              onChange={(event) => setFilters({ ...filters, order_id: event.target.value })}
            >
              <option value="">全部工单</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_no}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>日期跨度</span>
            <input
              className="field-input"
              type="number"
              min="1"
              max="90"
              value={filters.days}
              onChange={(event) => setFilters({ ...filters, days: event.target.value })}
            />
          </label>
          <label className="toolbar-field">
            <span>搜索</span>
            <input
              className="field-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="图号、工单、零件、人员"
            />
          </label>
          <div className="toolbar-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        </form>

        <div className="board-toolbar">
          <div className="board-tool-group">
            <span className="tool-label">日期跨度</span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                className={`filter-chip${Number(filters.days) === days ? " active" : ""}`}
                type="button"
                onClick={() => handleQuickDays(days)}
              >
                {days}天
              </button>
            ))}
          </div>
          <div className="board-tool-group">
            <span className="tool-label">任务状态</span>
            {[
              { key: "all", label: "全部" },
              { key: "late", label: "逾期" },
              { key: "external", label: "外协" }
            ].map((item) => (
              <button
                key={item.key}
                className={`filter-chip${rowType === item.key ? " active" : ""}`}
                type="button"
                onClick={() => setRowType(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <div className="compact-summary-strip board-summary-strip">
        <span>可见任务：<strong>{rows.length}</strong><small>{board?.schedule?.schedule_no || "--"}</small></span>
        <span>可见工时：<strong>{formatHours(visibleHours)}</strong></span>
        <span>外协任务：<strong>{externalRows}</strong></span>
        <span>逾期任务：<strong>{lateRows}</strong></span>
      </div>

      <div className="panel board-matrix-panel">
        <div className="board-matrix-header">
          <div>
            <h3 className="panel-title">排班矩阵</h3>
            <p className="panel-subtitle">
              {activeGroupLabel} / {rows.length} 条任务 / {formatHours(visibleHours)}
            </p>
          </div>
          <div className="board-legend">
            <span><i className="legend-dot normal" />有工时</span>
            <span><i className="legend-dot rest" />休息日</span>
            <span><i className="legend-dot external" />外协</span>
            <span><i className="legend-dot late" />逾期</span>
          </div>
        </div>

        <div className="board-tabs">
          <button
            className={`filter-chip${selectedGroup === "all" ? " active" : ""}`}
            type="button"
            onClick={() => setSelectedGroup("all")}
          >
            全部 <span className="chip-count">{board?.rows?.length || 0}</span>
          </button>
          {groups.map((group) => {
            const count = board?.rows?.filter((row) => row.group_key === group.key).length || 0;
            return (
              <button
                key={group.key}
                className={`filter-chip${selectedGroup === group.key ? " active" : ""}`}
                type="button"
                onClick={() => setSelectedGroup(group.key)}
              >
                {group.label} <span className="chip-count">{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="alert info">正在生成排班矩阵。</div>
        ) : !board ? (
          <div className="empty-state">
            <h3 className="empty-state-title">暂无排班数据</h3>
            <p className="empty-state-copy">请先运行生产排产。</p>
          </div>
        ) : (
          <div className="board-shell board-matrix-scroll">
            <table className="board-table">
              <thead>
                <tr>
                  <th className="board-sticky board-info-col">任务信息</th>
                  <th className="board-meta-col">客户</th>
                  <th className="board-meta-col">数量</th>
                  <th className="board-meta-col">工时</th>
                  <th className="board-meta-col">交期</th>
                  <th className="board-meta-col">人员/设备</th>
                  {board.date_columns.map((column) => (
                    <th
                      key={column.date}
                      className={`board-date-col${column.is_workday ? "" : " rest-day"}`}
                    >
                      <span>{toDateInputValue(column.date).slice(5)}</span>
                      <small>{column.weekday}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.group_key}-${row.schedule_item_id}`}
                    className={`${row.is_external ? "external-row" : ""} ${row.is_late ? "late-row" : ""}`}
                  >
                    <td className="board-sticky board-info-col">
                      <p className="data-primary">{row.drawing_no}</p>
                      <p className="data-secondary">{`${row.part_no} / ${row.part_name}`}</p>
                      <p className="data-secondary">{`${row.operation_name} / ${toDateInputValue(row.planned_start)}-${toDateInputValue(row.planned_end)}`}</p>
                      <div className="board-badges">
                        <StatusBadge tone="info">{row.order_no}</StatusBadge>
                        {row.requirement_note ? (
                          <StatusBadge tone="warning" title={row.requirement_note}>加工要求</StatusBadge>
                        ) : null}
                        {row.is_external ? <StatusBadge tone="warning">外协</StatusBadge> : null}
                        {row.is_late ? <StatusBadge tone="danger">逾期</StatusBadge> : null}
                      </div>
                    </td>
                    <td className="board-meta-col">{row.customer_name}</td>
                    <td className="board-meta-col">{row.quantity}</td>
                    <td className="board-meta-col">{formatHours(row.duration_hours)}</td>
                    <td className="board-meta-col">
                      <span>{toDateInputValue(row.due_date)}</span>
                    </td>
                    <td className="board-meta-col">
                      <p className="data-primary">{row.person_name || "未派工"}</p>
                      <p className="data-secondary">{row.machine_name || (row.is_external ? "外协" : "设备仅展示")}</p>
                    </td>
                    {row.daily_cells.map((cell, index) => {
                      const column = board.date_columns[index];
                      return (
                        <td
                          key={`${row.schedule_item_id}-${cell.date}`}
                          className={`board-cell${column?.is_workday ? "" : " rest-day"}`}
                          title={`订单：${row.order_no} / 工序：${row.operation_name} / 时间：${formatDateTime(row.planned_start)} - ${formatDateTime(row.planned_end)}`}
                        >
                          {cell.hours > 0 ? (
                            <span
                              className="board-hours"
                              style={{ "--hours-strength": Math.min(cell.hours / 8, 1) }}
                            >
                              {formatHours(cell.hours)}
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

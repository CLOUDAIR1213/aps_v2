import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getScheduleBoard,
  getWorkCenters,
  getWorkOrders,
  importPersonnel
} from "../api/production";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours } from "../utils/formatters";

const viewModes = [
  { value: "by_work_center", label: "按工段" },
  { value: "by_machine", label: "按设备" },
  { value: "by_person", label: "按人员" }
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
  const [board, setBoard] = useState(null);
  const [workCenters, setWorkCenters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [personnelFile, setPersonnelFile] = useState(null);
  const [personnelMessage, setPersonnelMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [rowType, setRowType] = useState("all");
  const [filters, setFilters] = useState({
    work_center: "",
    start_date: "",
    days: 14,
    order_id: "",
    view_mode: "by_work_center"
  });

  const loadBoard = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== null)
      );
      const data = await getScheduleBoard(scheduleId, params);
      setBoard(data);
      setSelectedGroup("all");
      if (!nextFilters.start_date && data.date_columns?.[0]?.date) {
        setFilters((previous) => ({ ...previous, start_date: data.date_columns[0].date }));
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
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [board]);

  const rows = useMemo(() => {
    const allRows = board?.rows || [];
    const normalizedQuery = query.trim().toLowerCase();
    return allRows.filter((row) => {
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
    });
  }, [board, selectedGroup, query, rowType]);

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

  const handleImportPersonnel = async () => {
    if (!personnelFile) {
      setPersonnelMessage("请先选择人员排班 Excel。");
      return;
    }
    setPersonnelMessage("");
    try {
      const result = await importPersonnel(personnelFile);
      setPersonnelMessage(
        `人员导入完成：${result.imported_people} 人，关联 ${result.linked_work_centers} 个工段。`
      );
      await loadBoard(filters);
    } catch (requestError) {
      setPersonnelMessage(requestError?.response?.data?.detail || "人员导入失败。");
    }
  };

  const visibleHours = rows.reduce(
    (sum, row) => sum + row.daily_cells.reduce((cellSum, cell) => cellSum + cell.hours, 0),
    0
  );
  const lateRows = rows.filter((row) => row.is_late).length;
  const externalRows = rows.filter((row) => row.is_external).length;

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">生产排班表</h3>
            <p className="panel-subtitle">
              参考 Excel 排班计划表展示：左侧固定任务信息，右侧按日期拆分每日占用工时。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to="/schedule-results">
              回到结果
            </Link>
            <Link className="button ghost" to="/gantt">
              查看甘特图
            </Link>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label">
            工段
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
          <label className="field-label">
            开始日期
            <input
              className="field-input"
              type="date"
              value={filters.start_date}
              onChange={(event) => setFilters({ ...filters, start_date: event.target.value })}
            />
          </label>
          <label className="field-label">
            天数
            <input
              className="field-input"
              type="number"
              min="1"
              max="90"
              value={filters.days}
              onChange={(event) => setFilters({ ...filters, days: event.target.value })}
            />
          </label>
          <label className="field-label">
            工单
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
          <label className="field-label">
            视图
            <select
              className="field-input"
              value={filters.view_mode}
              onChange={(event) => setFilters({ ...filters, view_mode: event.target.value })}
            >
              {viewModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "加载中..." : "刷新排班表"}
            </button>
          </div>
        </form>

        <div className="board-toolbar">
          <label className="field-label board-search">
            搜索任务
            <input
              className="field-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="图号、工单、零件、人员"
            />
          </label>
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

        <div className="personnel-import">
          <label className="field-label">
            人员表导入
            <input
              className="field-input"
              type="file"
              accept=".xlsm,.xlsx"
              onChange={(event) => setPersonnelFile(event.target.files?.[0] || null)}
            />
          </label>
          <button className="button ghost" type="button" onClick={handleImportPersonnel}>
            导入机台人员
          </button>
          {personnelMessage ? <span className="data-secondary">{personnelMessage}</span> : null}
        </div>

        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <div className="summary-grid">
        <div className="metric-card" style={{ "--metric-accent": "#205c52" }}>
          <p className="metric-label">可见任务</p>
          <p className="metric-value">{rows.length}</p>
          <p className="metric-meta">{board?.schedule?.schedule_no || "--"}</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#2d5d8c" }}>
          <p className="metric-label">可见工时</p>
          <p className="metric-value">{formatHours(visibleHours)}</p>
          <p className="metric-meta">按当前日期范围统计</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#b97012" }}>
          <p className="metric-label">外协任务</p>
          <p className="metric-value">{externalRows}</p>
          <p className="metric-meta">以黄色标签显示</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#c44733" }}>
          <p className="metric-label">逾期任务</p>
          <p className="metric-value">{lateRows}</p>
          <p className="metric-meta">以红色标签显示</p>
        </div>
      </div>

      <div className="panel">
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
          <div className="board-shell">
            <table className="board-table">
              <thead>
                <tr>
                  <th className="board-sticky board-info-col">任务信息</th>
                  <th className="board-meta-col">客户</th>
                  <th className="board-meta-col">数量</th>
                  <th className="board-meta-col">工时</th>
                  <th className="board-meta-col">交期</th>
                  <th className="board-meta-col">设备/人员</th>
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
                    key={row.schedule_item_id}
                    className={`${row.is_external ? "external-row" : ""} ${row.is_late ? "late-row" : ""}`}
                  >
                    <td className="board-sticky board-info-col">
                      <p className="data-primary">{row.drawing_no}</p>
                      <p className="data-secondary">{`${row.part_no} / ${row.part_name}`}</p>
                      <p className="data-secondary">{`${row.group_label} / ${toDateInputValue(row.planned_start)}-${toDateInputValue(row.planned_end)}`}</p>
                      <div className="board-badges">
                        <StatusBadge tone="info">{row.order_no}</StatusBadge>
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
                      <p className="data-primary">{row.machine_name || "外协"}</p>
                      <p className="data-secondary">{row.person_name || "未分配"}</p>
                    </td>
                    {row.daily_cells.map((cell, index) => {
                      const column = board.date_columns[index];
                      return (
                        <td
                          key={`${row.schedule_item_id}-${cell.date}`}
                          className={`board-cell${column?.is_workday ? "" : " rest-day"}`}
                          title={`${formatDateTime(row.planned_start)} - ${formatDateTime(row.planned_end)}`}
                        >
                          {cell.hours > 0 ? (
                            <span
                              className="board-hours"
                              style={{ "--hours-strength": Math.min(cell.hours / 8, 1) }}
                            >
                              {cell.hours}
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

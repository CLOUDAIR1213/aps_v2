import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  exportManagementDashboard,
  getManagementDashboard,
  getProductionSchedules,
  getProductionSchedulingOverview,
  updateManagementIssueState,
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatPercent } from "../utils/formatters";
import { buildScheduleBoardPath, buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

const riskTypeLabels = {
  order_delay: "订单延期",
  due_soon: "临近交期",
  resource_bottleneck: "资源瓶颈",
  operation_blocking: "关键工序阻塞",
  external_risk: "外协影响",
};

const riskLevelLabels = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

const statusLabels = {
  open: "未处理",
  processing: "处理中",
  resolved: "已处理",
  paused: "暂缓",
};

function riskTone(level) {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "info";
}

function stateKey(issue) {
  return `${issue.schedule_id}:${issue.issue_key}`;
}

export default function ManagementDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schedules, setSchedules] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [scheduleOverview, setScheduleOverview] = useState(null);
  const [filters, setFilters] = useState({
    schedule_id: searchParams.get("schedule_id") || "",
    horizon_days: searchParams.get("horizon_days") || "30",
    risk_level: searchParams.get("risk_level") || "",
    risk_type: searchParams.get("risk_type") || "",
    customer: searchParams.get("customer") || "",
    status: searchParams.get("status") || "",
  });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const buildParams = (nextFilters = filters) => {
    return Object.fromEntries(
      Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== null && value !== undefined),
    );
  };

  const loadData = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = buildParams(nextFilters);
      const [scheduleData, dashboardData] = await Promise.all([
        getProductionSchedules(),
        getManagementDashboard(params),
      ]);
      setSchedules(scheduleData.schedules || []);
      setDashboard(dashboardData);
      setActiveScheduleId(dashboardData.schedule.id);
      try {
        setScheduleOverview(await getProductionSchedulingOverview({ schedule_id: dashboardData.schedule.id }));
      } catch {
        setScheduleOverview(null);
      }
      const actualFilters = {
        ...nextFilters,
        schedule_id: String(dashboardData.schedule.id),
      };
      setFilters(actualFilters);
      setSearchParams(buildParams(actualFilters));
      const nextDrafts = {};
      for (const issue of dashboardData.issues || []) {
        nextDrafts[stateKey(issue)] = {
          status: issue.status || "open",
          note: issue.note || "",
        };
      }
      setDrafts(nextDrafts);
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setDashboard(null);
        setScheduleOverview(null);
        setSchedules([]);
      } else {
        setError(requestError?.response?.data?.detail || "交付风险看板加载失败。");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    const summary = dashboard?.summary;
    return [
      {
        title: "高风险问题",
        value: summary?.high_risk_issues ?? 0,
        meta: `共 ${summary?.total_issues ?? 0} 条问题`,
        accent: "#c2412f",
      },
      {
        title: "延期订单",
        value: summary?.delayed_orders ?? 0,
        meta: `${summary?.due_soon_orders ?? 0} 张临近交期`,
        accent: "#b97012",
      },
      {
        title: "瓶颈资源",
        value: summary?.bottleneck_resources ?? 0,
        meta: "按当前方案负荷率识别",
        accent: "#315f88",
      },
      {
        title: "外协风险",
        value: summary?.external_risks ?? 0,
        meta: "外协位于关键路径或贴近交期",
        accent: "#7d567e",
      },
      {
        title: "未处理",
        value: summary?.open_issues ?? 0,
        meta: `${summary?.processing_issues ?? 0} 条处理中`,
        accent: "#205c52",
      },
    ];
  }, [dashboard]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    setMessage("");
    loadData(filters);
  };

  const resetFilters = () => {
    const reset = {
      schedule_id: filters.schedule_id,
      horizon_days: "30",
      risk_level: "",
      risk_type: "",
      customer: "",
      status: "",
    };
    setMessage("");
    loadData(reset);
  };

  const currentSchedule = schedules.find((schedule) => String(schedule.id) === String(filters.schedule_id))
    || dashboard?.schedule
    || null;

  const updateDraft = (issue, key, value) => {
    const draftKey = stateKey(issue);
    setDrafts((current) => ({
      ...current,
      [draftKey]: {
        status: current[draftKey]?.status || issue.status || "open",
        note: current[draftKey]?.note || "",
        [key]: value,
      },
    }));
  };

  const saveIssueState = async (issue) => {
    const draftKey = stateKey(issue);
    const draft = drafts[draftKey] || { status: issue.status || "open", note: issue.note || "" };
    setSavingKey(draftKey);
    setError("");
    setMessage("");
    try {
      await updateManagementIssueState({
        schedule_id: issue.schedule_id,
        issue_key: issue.issue_key,
        status: draft.status,
        note: draft.note,
      });
      setMessage("问题状态已保存。");
      await loadData(filters);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "问题状态保存失败。");
    } finally {
      setSavingKey("");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await exportManagementDashboard(buildParams(filters));
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";\s]+)/i);
      const today = new Date();
      const dateText = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("");
      let downloadName = `交付风险看板_${dashboard?.schedule?.schedule_no || "latest"}_${dateText}.xlsx`;
      if (match && match[1]) {
        try { downloadName = decodeURIComponent(match[1]); } catch { /* keep default */ }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("交付风险 Excel 已导出。");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "交付风险 Excel 导出失败。");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <section className="page-grid">
        <div className="alert info">正在加载交付风险看板。</div>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="page-grid">
        {error ? <div className="alert danger">{error}</div> : null}
        <div className="empty-state">
          <h3 className="empty-state-title">暂无交付风险数据</h3>
          <p className="empty-state-copy">请先导入工单并生成排产方案。</p>
          <div className="panel-actions">
            <Link className="button" to="/scheduling">前往排产</Link>
            <Link className="button ghost" to="/work-order-import">导入工单</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid management-dashboard">
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert danger">{error}</div> : null}
      <CurrentScheduleBanner overview={scheduleOverview} schedule={currentSchedule} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">交付风险看板</h3>
            <p className="panel-subtitle">
              默认查看未来 {dashboard.summary.horizon_days} 天交付风险。问题清单优先，摘要和分布只作为辅助参考。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to={buildSchedulePath("/schedule-results", filters.schedule_id)}>
              订单完工表
            </Link>
            <Link className="button ghost" to={buildSchedulePath("/dispatch", filters.schedule_id)}>
              派工与工时
            </Link>
            <Link className="button ghost" to={buildScheduleBoardPath(filters.schedule_id)}>
              生产排班表
            </Link>
            <Link className="button ghost" to={buildSchedulePath("/gantt", filters.schedule_id)}>
              甘特图
            </Link>
            <button className="button ghost" type="button" onClick={() => loadData(filters)}>
              刷新
            </button>
            <button className="button" type="button" disabled={exporting} onClick={handleExport}>
              {exporting ? "导出中..." : "导出 Excel"}
            </button>
          </div>
        </div>

        <div className="management-filter-grid">
          <label className="field-label">
            排产方案
            <select className="field-input" value={filters.schedule_id} onChange={(e) => updateFilter("schedule_id", e.target.value)}>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.schedule_no}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            时间范围
            <select className="field-input" value={filters.horizon_days} onChange={(e) => updateFilter("horizon_days", e.target.value)}>
              <option value="7">未来 7 天</option>
              <option value="14">未来 14 天</option>
              <option value="30">未来 30 天</option>
              <option value="60">未来 60 天</option>
            </select>
          </label>
          <label className="field-label">
            风险等级
            <select className="field-input" value={filters.risk_level} onChange={(e) => updateFilter("risk_level", e.target.value)}>
              <option value="">全部</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
          </label>
          <label className="field-label">
            问题类型
            <select className="field-input" value={filters.risk_type} onChange={(e) => updateFilter("risk_type", e.target.value)}>
              <option value="">全部</option>
              {dashboard.risk_types.map((type) => (
                <option key={type} value={type}>{riskTypeLabels[type] || type}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            客户
            <select className="field-input" value={filters.customer} onChange={(e) => updateFilter("customer", e.target.value)}>
              <option value="">全部</option>
              {dashboard.customers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            处理状态
            <select className="field-input" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="">全部</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="management-filter-actions">
            <button className="button" type="button" onClick={applyFilters}>筛选</button>
            <button className="button ghost" type="button" onClick={resetFilters}>重置</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">问题清单与处理状态</h3>
            <p className="panel-subtitle">默认先看问题清单。老板关注字段放在前面，处理状态只做轻量记录。</p>
          </div>
        </div>
        {dashboard.issues.length ? (
          <div className="table-shell">
            <table className="data-table management-table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>客户</th>
                  <th>交期</th>
                  <th>预计完成</th>
                  <th>延期天数</th>
                  <th>原因</th>
                  <th>当前处理状态</th>
                  <th>风险</th>
                  <th>定位</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.issues.map((issue) => {
                  const draft = drafts[stateKey(issue)] || { status: issue.status || "open", note: issue.note || "" };
                  return (
                    <tr key={issue.issue_key}>
                      <td>
                        <p className="data-primary">{issue.order_no || issue.work_center_name || "资源问题"}</p>
                        {issue.product_name ? <p className="data-secondary">{issue.product_name}</p> : null}
                      </td>
                      <td>
                        <p className="data-primary">{issue.customer_name || "--"}</p>
                        <p className="data-secondary">{issue.machine_name || issue.operation_name || "--"}</p>
                        {issue.utilization !== null && issue.utilization !== undefined ? (
                          <p className="data-secondary">{formatPercent(issue.utilization * 100)}</p>
                        ) : null}
                      </td>
                      <td>
                        <p className="data-primary">{issue.due_date ? formatDateTime(issue.due_date) : "--"}</p>
                      </td>
                      <td>
                        <p className="data-primary">{issue.planned_end_time ? formatDateTime(issue.planned_end_time) : "--"}</p>
                      </td>
                      <td>
                        {issue.delay_days > 0 ? <StatusBadge tone="danger">{`延期 ${issue.delay_days} 天`}</StatusBadge> : null}
                        {issue.delay_days <= 0 ? <span className="muted">0 天</span> : null}
                      </td>
                      <td>
                        <p className="data-primary">{issue.reason}</p>
                        <p className="data-secondary">{issue.suggestion}</p>
                      </td>
                      <td>
                        <div className="management-state-editor">
                          <select className="field-input" value={draft.status} onChange={(e) => updateDraft(issue, "status", e.target.value)}>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <textarea
                            className="field-input"
                            rows="2"
                            value={draft.note}
                            onChange={(e) => updateDraft(issue, "note", e.target.value)}
                            placeholder="处理备注"
                          />
                          <button
                            className="button small"
                            type="button"
                            disabled={savingKey === stateKey(issue)}
                            onClick={() => saveIssueState(issue)}
                          >
                            {savingKey === stateKey(issue) ? "保存中..." : "保存"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <StatusBadge tone={riskTone(issue.risk_level)}>{riskLevelLabels[issue.risk_level]}</StatusBadge>
                        <p className="data-primary">{riskTypeLabels[issue.risk_type] || issue.risk_type}</p>
                        <p className="data-secondary">{issue.title}</p>
                      </td>
                      <td>
                        <div className="row-actions">
                          {issue.links.order_detail ? <Link className="button small ghost" to={issue.links.order_detail}>订单</Link> : null}
                          <Link className="button small ghost" to={issue.links.schedule_board}>生产排班表</Link>
                          <Link className="button small ghost" to={issue.links.gantt}>甘特</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3 className="empty-state-title">暂无匹配问题</h3>
            <p className="empty-state-copy">调整筛选条件查看其他风险或已处理问题。</p>
          </div>
        )}
      </div>

      <div className="management-supporting">
        {dashboard.summary.high_risk_issues > 0 ? (
          <div className="alert danger">
            当前方案存在 {dashboard.summary.high_risk_issues} 条高风险问题，建议先处理延期、瓶颈和外协关键路径。
          </div>
        ) : null}

        <SummaryCards cards={cards} />

        <div className="split-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">最紧急问题</h3>
                <p className="panel-subtitle">辅助查看前 8 条，不替代上方完整问题清单。</p>
              </div>
            </div>
            {dashboard.issues.length ? (
              <div className="management-issue-list">
                {dashboard.issues.slice(0, 8).map((issue) => (
                  <div className={`management-issue-card ${issue.risk_level}`} key={issue.issue_key}>
                    <div className="management-issue-main">
                      <div>
                        <div className="management-issue-badges">
                          <StatusBadge tone={riskTone(issue.risk_level)}>{riskLevelLabels[issue.risk_level]}</StatusBadge>
                          <StatusBadge tone="info">{riskTypeLabels[issue.risk_type] || issue.risk_type}</StatusBadge>
                          <StatusBadge tone={issue.status === "resolved" ? "success" : issue.status === "processing" ? "warning" : "neutral"}>
                            {statusLabels[issue.status] || issue.status}
                          </StatusBadge>
                        </div>
                        <h4 className="management-issue-title">{issue.title}</h4>
                        <p className="data-secondary">{issue.reason}</p>
                      </div>
                      <div className="management-issue-meta">
                        <p className="data-primary">{issue.order_no || issue.work_center_name || "资源问题"}</p>
                        <p className="data-secondary">{issue.customer_name || issue.machine_name || "--"}</p>
                        <p className="data-secondary">{issue.planned_end_time ? `预计 ${formatDateTime(issue.planned_end_time)}` : ""}</p>
                      </div>
                    </div>
                    <div className="row-actions">
                      {issue.links.order_detail ? <Link className="button small ghost" to={issue.links.order_detail}>订单</Link> : null}
                      <Link className="button small ghost" to={issue.links.schedule_board}>生产排班表</Link>
                      <Link className="button small ghost" to={issue.links.gantt}>甘特</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert success">当前筛选条件下暂无交付风险问题。</div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">风险分布</h3>
                <p className="panel-subtitle">当前筛选结果的处理状态和问题类型。</p>
              </div>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-key">高 / 中 / 低</span>
                <span className="detail-value">
                  {dashboard.summary.high_risk_issues} / {dashboard.summary.medium_risk_issues} / {dashboard.summary.low_risk_issues}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">未处理 / 处理中</span>
                <span className="detail-value">
                  {dashboard.summary.open_issues} / {dashboard.summary.processing_issues}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">已处理 / 暂缓</span>
                <span className="detail-value">
                  {dashboard.summary.resolved_issues} / {dashboard.summary.paused_issues}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">瓶颈资源</span>
                <span className="detail-value">{dashboard.summary.bottleneck_resources}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">外协风险</span>
                <span className="detail-value">{dashboard.summary.external_risks}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

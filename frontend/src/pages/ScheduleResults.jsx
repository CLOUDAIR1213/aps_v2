import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getProductionSchedulingResult } from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours, getDurationHours } from "../utils/formatters";

export default function ScheduleResults() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        setResult(await getProductionSchedulingResult());
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setResult(null);
        } else {
          setError(requestError?.response?.data?.detail || "排产结果加载失败。");
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const items = result?.items || [];
  const cards = useMemo(() => {
    const start = items.length
      ? Math.min(...items.map((item) => new Date(item.start_time).getTime()))
      : null;
    const end = items.length
      ? Math.max(...items.map((item) => new Date(item.end_time).getTime()))
      : null;
    const horizon = start !== null && end !== null ? getDurationHours(start, end) : 0;
    return [
      { title: "排产明细", value: items.length, meta: "零件-工序时间块", accent: "#205c52" },
      {
        title: "资源负荷",
        value: result?.resource_load?.length || 0,
        meta: "内部设备与外协资源",
        accent: "#2d5d8c"
      },
      { title: "排产窗口", value: formatHours(horizon), meta: "最早开始到最晚结束", accent: "#b97012" },
      {
        title: "逾期工单",
        value: result?.late_orders?.length || 0,
        meta: result?.late_orders?.length ? "需要调整资源或交期" : "当前方案交期可控",
        accent: "#c44733"
      }
    ];
  }, [items, result]);

  if (loading) {
    return (
      <section className="page-grid">
        <div className="alert info">正在加载排产结果。</div>
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

  if (!result) {
    return (
      <section className="page-grid">
        <div className="empty-state">
          <h3 className="empty-state-title">暂无排产方案</h3>
          <p className="empty-state-copy">请先导入工单并在排产驾驶台执行生产排产。</p>
          <Link className="button" to="/scheduling">
            前往排产
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid">
      {result.late_orders.length ? (
        <div className="alert warning">
          当前方案有 {result.late_orders.length} 张工单超过交期，请优先检查瓶颈资源。
        </div>
      ) : null}

      <SummaryCards cards={cards} />

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">生产排产明细</h3>
              <p className="panel-subtitle">按资源顺序展示每个零件工序的开始和结束时间。</p>
            </div>
            <Link className="link-inline" to="/gantt">
              查看甘特图
            </Link>
          </div>

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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="data-primary">{item.order_no}</p>
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
        </div>

        <div className="sidebar-stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">方案摘要</h3>
                <p className="panel-subtitle">用于调度员和老板快速判断方案质量。</p>
              </div>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-key">方案编号</span>
                <span className="detail-value">{result.schedule.schedule_no}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">状态</span>
                <StatusBadge tone="info">{result.schedule.status}</StatusBadge>
              </div>
              <div className="detail-row">
                <span className="detail-key">创建时间</span>
                <span className="detail-value">{formatDateTime(result.schedule.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">资源负荷排行</h3>
                <p className="panel-subtitle">先看工时最高的资源。</p>
              </div>
            </div>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>资源</th>
                  <th>任务</th>
                  <th>负荷</th>
                </tr>
              </thead>
              <tbody>
                {result.resource_load.map((row) => (
                  <tr key={`${row.work_center_id}-${row.machine_id || "external"}`}>
                    <td>
                      <div className="data-primary">{row.work_center_name}</div>
                      <div className="data-secondary">{row.machine_name}</div>
                    </td>
                    <td>{row.task_count}</td>
                    <td>{formatHours(row.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

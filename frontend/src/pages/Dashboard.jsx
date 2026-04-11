import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboardSummary } from "../api/dashboard";
import { getOrders } from "../api/order";
import { getLatestSchedulingResult } from "../api/scheduling";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatDeadlineLabel,
  formatHours,
  getDeadlineTone,
  getDurationHours
} from "../utils/formatters";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryData, ordersData] = await Promise.all([
          getDashboardSummary(),
          getOrders()
        ]);

        setSummary(summaryData);
        setOrders(ordersData);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.detail ||
            "\u9996\u9875\u6570\u636e\u52a0\u8f7d\u5931\u8d25\u3002"
        );
      }

      try {
        const latestData = await getLatestSchedulingResult();
        setLatestResult(latestData);
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setLatestResult(null);
        } else {
          setError(
            requestError?.response?.data?.detail ||
              "\u6700\u65b0\u6392\u4ea7\u65b9\u6848\u52a0\u8f7d\u5931\u8d25\u3002"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const pendingOrders = orders
    .filter((order) => order.status === "pending")
    .sort((left, right) => {
      const dueGap = new Date(left.due_date).getTime() - new Date(right.due_date).getTime();
      if (dueGap !== 0) {
        return dueGap;
      }

      return right.priority - left.priority;
    });

  const urgentOrderCount = pendingOrders.filter(
    (order) => getDeadlineTone(order.due_date) !== "success"
  ).length;

  const latestItems = latestResult?.items || [];
  const scheduleStart =
    latestItems.length > 0
      ? Math.min(...latestItems.map((item) => new Date(item.start_time).getTime()))
      : null;
  const scheduleEnd =
    latestItems.length > 0
      ? Math.max(...latestItems.map((item) => new Date(item.end_time).getTime()))
      : null;
  const horizonHours =
    scheduleStart !== null && scheduleEnd !== null
      ? getDurationHours(scheduleStart, scheduleEnd)
      : 0;

  const cards = [
    {
      title: "\u8bbe\u5907\u603b\u6570",
      value: summary?.machine_count ?? 0,
      meta: "\u8d44\u6e90\u6c60\u89c4\u6a21",
      accent: "#205c52"
    },
    {
      title: "\u8ba2\u5355\u603b\u6570",
      value: summary?.order_count ?? 0,
      meta: "\u5f53\u524d\u7cfb\u7edf\u8ba2\u5355",
      accent: "#2d5d8c"
    },
    {
      title: "\u5f85\u6392\u4ea7\u8ba2\u5355",
      value: summary?.pending_order_count ?? 0,
      meta: urgentOrderCount
        ? `${urgentOrderCount} \u4e2a\u4ea4\u671f\u9700\u8981\u4f18\u5148\u5173\u6ce8`
        : "\u961f\u5217\u4ea4\u671f\u76f8\u5bf9\u7a33\u5b9a",
      accent: "#b97012"
    },
    {
      title: "\u5df2\u6392\u4ea7\u8ba2\u5355",
      value: summary?.scheduled_order_count ?? 0,
      meta: latestItems.length
        ? `\u6700\u65b0\u65b9\u6848 ${latestItems.length} \u6761\u660e\u7ec6`
        : "\u6682\u65e0\u6700\u65b0\u6392\u4ea7\u65b9\u6848",
      accent: "#7d567e"
    }
  ];

  return (
    <section className="page-grid">
      {error ? <div className="alert danger">{error}</div> : null}

      {!loading && urgentOrderCount > 0 ? (
        <div className="alert warning">
          {`\u5f53\u524d\u6709 ${urgentOrderCount} \u4e2a\u5f85\u6392\u4ea7\u8ba2\u5355\u5df2\u903e\u671f\u6216 48 \u5c0f\u65f6\u5185\u5230\u671f\uff0c\u8bf7\u4f18\u5148\u68c0\u67e5\u6392\u4ea7\u961f\u5217\u3002`}
        </div>
      ) : null}

      <SummaryCards cards={cards} loading={loading} />

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                {"\u5173\u952e\u8ba2\u5355\u76d1\u63a7"}
              </h3>
              <p className="panel-subtitle">
                {"\u6309\u4ea4\u671f\u548c\u4f18\u5148\u7ea7\u6392\u5e8f\uff0c\u5148\u770b\u6700\u9700\u8981\u6392\u4ea7\u7684\u5f85\u6392\u4ea7\u8ba2\u5355\u3002"}
              </p>
            </div>
            <Link className="link-inline" to="/orders">
              {"\u8fdb\u5165\u8ba2\u5355\u7ba1\u7406"}
            </Link>
          </div>

          {loading ? (
            <div className="alert info">
              {"\u6b63\u5728\u52a0\u8f7d\u8ba2\u5355\u548c\u6392\u4ea7\u6982\u89c8\u3002"}
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state-title">
                {"\u5f53\u524d\u6ca1\u6709\u5f85\u6392\u4ea7\u8ba2\u5355"}
              </h3>
              <p className="empty-state-copy">
                {"\u53ef\u4ee5\u5148\u5f55\u5165\u65b0\u8ba2\u5355\uff0c\u6216\u76f4\u63a5\u68c0\u67e5\u5df2\u751f\u6548\u7684\u6392\u4ea7\u7ed3\u679c\u3002"}
              </p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{"\u8ba2\u5355"}</th>
                    <th>{"\u4ea7\u54c1"}</th>
                    <th>{"\u4f18\u5148\u7ea7"}</th>
                    <th>{"\u4ea4\u671f"}</th>
                    <th>{"\u72b6\u6001"}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.slice(0, 6).map((order) => (
                    <tr key={order.id}>
                      <td>
                        <p className="data-primary">{order.order_no}</p>
                        <p className="data-secondary">{`${order.quantity} pcs`}</p>
                      </td>
                      <td>
                        <p className="data-primary">{order.product_name}</p>
                        <p className="data-secondary">{formatDate(order.due_date)}</p>
                      </td>
                      <td>
                        <StatusBadge
                          tone={order.priority >= 2 ? "danger" : order.priority >= 1 ? "warning" : "neutral"}
                        >
                          {`P${order.priority}`}
                        </StatusBadge>
                      </td>
                      <td>
                        <p className="data-primary">{formatDateTime(order.due_date)}</p>
                        <p className="data-secondary">{formatDeadlineLabel(order.due_date)}</p>
                      </td>
                      <td>
                        <StatusBadge tone={getDeadlineTone(order.due_date)}>
                          {getDeadlineTone(order.due_date) === "danger"
                            ? "\u5df2\u903e\u671f"
                            : getDeadlineTone(order.due_date) === "warning"
                              ? "\u9700\u5c3d\u5feb\u6392\u4ea7"
                              : "\u53ef\u63a7"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sidebar-stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  {"\u6700\u65b0\u6392\u4ea7\u65b9\u6848"}
                </h3>
                <p className="panel-subtitle">
                  {"\u5feb\u901f\u5224\u65ad\u662f\u5426\u5df2\u7ecf\u5f62\u6210\u53ef\u590d\u76d8\u7684\u6392\u4ea7\u7ed3\u679c\u3002"}
                </p>
              </div>
              <Link className="link-inline" to="/schedule-results">
                {"\u67e5\u770b\u8be6\u60c5"}
              </Link>
            </div>

            {!latestResult ? (
              <div className="empty-state">
                <h3 className="empty-state-title">
                  {"\u6682\u65e0\u6392\u4ea7\u65b9\u6848"}
                </h3>
                <p className="empty-state-copy">
                  {"\u8bf7\u5148\u5728\u6392\u4ea7\u9a7e\u9a76\u53f0\u751f\u6210\u4efb\u52a1\u5e76\u6267\u884c\u89c4\u5219\u6392\u4ea7\u3002"}
                </p>
              </div>
            ) : (
              <div className="detail-list">
                <div className="detail-row">
                  <span className="detail-key">{"\u65b9\u6848\u7f16\u53f7"}</span>
                  <span className="detail-value">{latestResult.schedule.schedule_no}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">{"\u521b\u5efa\u65f6\u95f4"}</span>
                  <span className="detail-value">
                    {formatDateTime(latestResult.schedule.created_at)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">{"\u6392\u4ea7\u4efb\u52a1"}</span>
                  <span className="detail-value">{latestItems.length}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">{"\u6392\u4ea7\u7a97\u53e3"}</span>
                  <span className="detail-value">
                    {latestItems.length ? formatHours(horizonHours) : "--"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  {"\u4eca\u65e5\u5de5\u4f5c\u6307\u5357"}
                </h3>
                <p className="panel-subtitle">
                  {"\u5bf9\u8fd9\u4e2a demo \u7684\u6700\u77ed\u64cd\u4f5c\u8def\u5f84\u8fdb\u884c\u63d0\u9192\u3002"}
                </p>
              </div>
            </div>

            <div className="checklist">
              <div className="checklist-row">
                <div className="checklist-copy">
                  <p className="checklist-title">
                    {"\u68c0\u67e5\u5f85\u6392\u4ea7\u8ba2\u5355"}
                  </p>
                  <p className="checklist-meta">
                    {"\u786e\u8ba4\u8ba2\u5355\u4f18\u5148\u7ea7\u548c\u4ea4\u671f\u5408\u7406\u3002"}
                  </p>
                </div>
                <StatusBadge tone={pendingOrders.length ? "warning" : "success"}>
                  {pendingOrders.length ? `\u961f\u5217 ${pendingOrders.length}` : "\u5df2\u6e05\u7a7a"}
                </StatusBadge>
              </div>
              <div className="checklist-row">
                <div className="checklist-copy">
                  <p className="checklist-title">
                    {"\u8fdb\u5165\u6392\u4ea7\u9a7e\u9a76\u53f0"}
                  </p>
                  <p className="checklist-meta">
                    {"\u751f\u6210\u4efb\u52a1\u540e\u518d\u8fd0\u884c\u89c4\u5219\u6392\u4ea7\u3002"}
                  </p>
                </div>
                <Link className="link-inline" to="/scheduling">
                  {"\u73b0\u5728\u8fdb\u5165"}
                </Link>
              </div>
              <div className="checklist-row">
                <div className="checklist-copy">
                  <p className="checklist-title">
                    {"\u590d\u76d8\u673a\u53f0\u8d1f\u8377"}
                  </p>
                  <p className="checklist-meta">
                    {"\u6392\u4ea7\u540e\u53bb\u7ed3\u679c\u9875\u548c\u7518\u7279\u56fe\u68c0\u67e5\u74f6\u9888\u3002"}
                  </p>
                </div>
                <StatusBadge tone={latestResult ? "info" : "neutral"}>
                  {latestResult ? "\u5df2\u6709\u65b9\u6848" : "\u5f85\u751f\u6210"}
                </StatusBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

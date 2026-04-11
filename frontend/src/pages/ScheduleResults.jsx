import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getOrders } from "../api/order";
import { getLatestSchedulingResult } from "../api/scheduling";
import ScheduleTable from "../components/ScheduleTable";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import {
  formatDateTime,
  formatDeadlineLabel,
  formatHours,
  getDeadlineTone,
  getDurationHours
} from "../utils/formatters";

const statusMap = {
  draft: "\u8349\u7a3f",
  running: "\u6392\u4ea7\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  failed: "\u5931\u8d25"
};

export default function ScheduleResults() {
  const [result, setResult] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [resultData, orderData] = await Promise.all([
          getLatestSchedulingResult(),
          getOrders()
        ]);

        setResult(resultData);
        setOrders(orderData);
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setResult(null);
        } else {
          setError(
            requestError?.response?.data?.detail ||
              "\u6392\u4ea7\u7ed3\u679c\u52a0\u8f7d\u5931\u8d25\u3002"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <section className="page-grid">
        <div className="alert info">
          {"\u6b63\u5728\u52a0\u8f7d\u6700\u65b0\u6392\u4ea7\u65b9\u6848\u3002"}
        </div>
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

  if (!result?.schedule) {
    return (
      <section className="page-grid">
        <div className="empty-state">
          <h3 className="empty-state-title">
            {"\u6682\u65e0\u6392\u4ea7\u7ed3\u679c"}
          </h3>
          <p className="empty-state-copy">
            {"\u8bf7\u5148\u5728\u6392\u4ea7\u9a7e\u9a76\u53f0\u751f\u6210\u4efb\u52a1\u5e76\u8fd0\u884c\u89c4\u5219\u6392\u4ea7\u3002"}
          </p>
          <Link className="button" to="/scheduling">
            {"\u524d\u5f80\u6392\u4ea7\u9a7e\u9a76\u53f0"}
          </Link>
        </div>
      </section>
    );
  }

  const orderMap = Object.fromEntries(orders.map((order) => [order.id, order]));
  const items = result.items.map((item) => {
    const order = orderMap[item.order_id];

    return {
      ...item,
      product_name: order?.product_name || "--",
      order_priority: order?.priority ?? 0,
      dueDateLabel: formatDeadlineLabel(order?.due_date),
      deadlineTone: getDeadlineTone(order?.due_date)
    };
  });

  const machineCount = new Set(items.map((item) => item.machine_id)).size;
  const orderEndMap = new Map();

  items.forEach((item) => {
    const current = orderEndMap.get(item.order_id);
    const endTime = new Date(item.end_time).getTime();
    if (!current || endTime > current.endTime) {
      orderEndMap.set(item.order_id, {
        endTime,
        order: orderMap[item.order_id]
      });
    }
  });

  const lateOrders = Array.from(orderEndMap.values()).filter(({ endTime, order }) => {
    if (!order?.due_date) {
      return false;
    }

    return endTime > new Date(order.due_date).getTime();
  }).length;

  const scheduleStart =
    items.length > 0
      ? Math.min(...items.map((item) => new Date(item.start_time).getTime()))
      : null;
  const scheduleEnd =
    items.length > 0
      ? Math.max(...items.map((item) => new Date(item.end_time).getTime()))
      : null;
  const horizonHours =
    scheduleStart !== null && scheduleEnd !== null
      ? getDurationHours(scheduleStart, scheduleEnd)
      : 0;

  const machineLoad = Array.from(
    items.reduce((map, item) => {
      const existing = map.get(item.machine_id) || {
        machine_name: item.machine_name || item.machine_code || "--",
        machine_code: item.machine_code || "--",
        hours: 0,
        tasks: 0
      };

      existing.hours += getDurationHours(item.start_time, item.end_time);
      existing.tasks += 1;
      map.set(item.machine_id, existing);
      return map;
    }, new Map()).values()
  ).sort((left, right) => right.hours - left.hours);

  const cards = [
    {
      title: "\u6392\u4ea7\u4efb\u52a1",
      value: items.length,
      meta: "\u6700\u65b0\u65b9\u6848\u660e\u7ec6\u884c\u6570",
      accent: "#205c52"
    },
    {
      title: "\u8986\u76d6\u8bbe\u5907",
      value: machineCount,
      meta: "\u5df2\u8fdb\u5165\u65b9\u6848\u7684\u673a\u53f0\u6570",
      accent: "#2d5d8c"
    },
    {
      title: "\u6392\u4ea7\u7a97\u53e3",
      value: formatHours(horizonHours),
      meta: "\u6309\u6700\u65e9\u5f00\u59cb\u5230\u6700\u665a\u7ed3\u675f\u8ba1\u7b97",
      accent: "#b97012"
    },
    {
      title: "\u8d85\u4ea4\u671f\u8ba2\u5355",
      value: lateOrders,
      meta: lateOrders
        ? "\u9700\u8981\u91cd\u65b0\u68c0\u67e5\u6392\u5e8f\u6216\u4ea4\u671f"
        : "\u6682\u672a\u53d1\u73b0\u8d85\u4ea4\u671f\u8ba2\u5355",
      accent: "#c44733"
    }
  ];

  return (
    <section className="page-grid">
      {lateOrders > 0 ? (
        <div className="alert warning">
          {`\u6700\u65b0\u65b9\u6848\u4e2d\u6709 ${lateOrders} \u4e2a\u8ba2\u5355\u7ed3\u675f\u65f6\u95f4\u665a\u4e8e\u4ea4\u671f\uff0c\u5efa\u8bae\u7ed3\u5408\u7518\u7279\u56fe\u91cd\u65b0\u68c0\u67e5\u74f6\u9888\u673a\u53f0\u3002`}
        </div>
      ) : null}

      <SummaryCards cards={cards} />

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                {"\u6392\u4ea7\u660e\u7ec6"}
              </h3>
              <p className="panel-subtitle">
                {"\u8868\u683c\u662f\u6392\u4ea7\u7ed3\u679c\u7684\u4e3b\u4f53\uff0c\u5148\u770b\u8bbe\u5907\u987a\u5e8f\u3001\u65f6\u95f4\u7a97\u548c\u4ea4\u671f\u6807\u8bb0\u3002"}
              </p>
            </div>
            <Link className="link-inline" to="/gantt">
              {"\u540c\u6b65\u67e5\u770b\u7518\u7279\u56fe"}
            </Link>
          </div>

          <ScheduleTable items={items} />
        </div>

        <div className="sidebar-stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  {"\u65b9\u6848\u6458\u8981"}
                </h3>
                <p className="panel-subtitle">
                  {"\u4f9b\u53d1\u5e03\u524d\u5feb\u901f\u786e\u8ba4\u3002"}
                </p>
              </div>
            </div>

            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-key">{"\u65b9\u6848\u7f16\u53f7"}</span>
                <span className="detail-value">{result.schedule.schedule_no}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">{"\u65b9\u6848\u540d\u79f0"}</span>
                <span className="detail-value">{result.schedule.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">{"\u72b6\u6001"}</span>
                <StatusBadge tone="info">
                  {statusMap[result.schedule.status] || result.schedule.status}
                </StatusBadge>
              </div>
              <div className="detail-row">
                <span className="detail-key">{"\u521b\u5efa\u65f6\u95f4"}</span>
                <span className="detail-value">
                  {formatDateTime(result.schedule.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  {"\u8bbe\u5907\u8d1f\u8377"}
                </h3>
                <p className="panel-subtitle">
                  {"\u6392\u4ea7\u540e\u6700\u503c\u5f97\u770b\u7684\u5c31\u662f\u74f6\u9888\u673a\u53f0\u3002"}
                </p>
              </div>
            </div>

            <table className="mini-table">
              <thead>
                <tr>
                  <th>{"\u8bbe\u5907"}</th>
                  <th>{"\u4efb\u52a1"}</th>
                  <th>{"\u8d1f\u8377"}</th>
                </tr>
              </thead>
              <tbody>
                {machineLoad.map((machine) => (
                  <tr key={machine.machine_code}>
                    <td>
                      <div className="data-primary">{machine.machine_name}</div>
                      <div className="data-secondary">{machine.machine_code}</div>
                    </td>
                    <td>{machine.tasks}</td>
                    <td>{formatHours(machine.hours)}</td>
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

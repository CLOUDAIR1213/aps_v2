import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getMachines } from "../api/machine";
import { getOrders } from "../api/order";
import {
  generateTasks,
  getLatestSchedulingResult,
  getScheduleTasks,
  runScheduling
} from "../api/scheduling";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import {
  formatDateTime,
  formatDeadlineLabel,
  formatHours,
  getDeadlineTone
} from "../utils/formatters";

const filters = [
  { key: "all", label: "\u5168\u90e8\u961f\u5217" },
  { key: "urgent", label: "\u4ea4\u671f\u98ce\u9669" },
  { key: "high", label: "\u9ad8\u4f18\u5148\u7ea7" }
];

export default function Scheduling() {
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [taskData, orderData, machineData] = await Promise.all([
        getScheduleTasks(),
        getOrders(),
        getMachines()
      ]);

      setTasks(taskData);
      setOrders(orderData);
      setMachines(machineData);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "\u6392\u4ea7\u9a7e\u9a76\u53f0\u6570\u636e\u52a0\u8f7d\u5931\u8d25\u3002"
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

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    setError("");
    setMessage("");

    try {
      const data = await generateTasks();
      setMessage(
        `\u5df2\u91cd\u65b0\u751f\u6210 ${data.length} \u6761\u5f85\u6392\u4ea7\u4efb\u52a1\uff0c\u65e7\u7684 pending \u961f\u5217\u5df2\u88ab\u5237\u65b0\u3002`
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "\u4efb\u52a1\u751f\u6210\u5931\u8d25\u3002"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunScheduling = async () => {
    const confirmed = window.confirm(
      "\u786e\u8ba4\u73b0\u5728\u6267\u884c\u89c4\u5219\u6392\u4ea7\u5417\uff1f"
    );

    if (!confirmed) {
      return;
    }

    setIsScheduling(true);
    setError("");
    setMessage("");

    try {
      const data = await runScheduling();
      setLatestResult(data);
      setMessage(
        `\u6392\u4ea7\u5b8c\u6210\uff0c\u5df2\u751f\u6210 ${data?.items?.length || 0} \u6761\u6392\u4ea7\u660e\u7ec6\u3002`
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "\u6392\u4ea7\u6267\u884c\u5931\u8d25\u3002"
      );
    } finally {
      setIsScheduling(false);
    }
  };

  const orderMap = Object.fromEntries(orders.map((order) => [order.id, order]));
  const machineMap = Object.fromEntries(machines.map((machine) => [machine.id, machine]));

  const taskRows = tasks
    .map((task) => {
      const order = orderMap[task.order_id];
      const machine = machineMap[task.machine_id];
      const deadlineTone = getDeadlineTone(order?.due_date);

      return {
        ...task,
        order_no: order?.order_no || `#${task.order_id}`,
        product_name: order?.product_name || "--",
        order_priority: order?.priority ?? 0,
        due_date: order?.due_date,
        deadlineTone,
        deadlineLabel: formatDeadlineLabel(order?.due_date),
        machine_name: machine?.name || `M-${task.machine_id}`,
        machine_code: machine?.code || "--"
      };
    })
    .sort((left, right) => {
      if (right.order_priority !== left.order_priority) {
        return right.order_priority - left.order_priority;
      }

      const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.due_date
        ? new Date(right.due_date).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return left.seq_no - right.seq_no;
    });

  const filteredRows = taskRows.filter((row) => {
    if (filter === "urgent") {
      return row.deadlineTone !== "success";
    }

    if (filter === "high") {
      return row.order_priority >= 2;
    }

    return true;
  });

  const queueHours = taskRows.reduce((sum, task) => sum + task.process_time, 0);
  const coveredMachines = new Set(taskRows.map((task) => task.machine_id)).size;
  const coveredOrders = new Set(taskRows.map((task) => task.order_id)).size;
  const urgentRows = taskRows.filter((task) => task.deadlineTone !== "success").length;

  const cards = [
    {
      title: "\u5f85\u6392\u4ea7\u4efb\u52a1",
      value: taskRows.length,
      meta: coveredOrders
        ? `${coveredOrders} \u4e2a\u8ba2\u5355\u5df2\u5c55\u5f00`
        : "\u6682\u65e0\u961f\u5217",
      accent: "#205c52"
    },
    {
      title: "\u961f\u5217\u603b\u8d1f\u8377",
      value: formatHours(queueHours),
      meta: "\u57fa\u4e8e process time + setup \u63a8\u7b97",
      accent: "#2d5d8c"
    },
    {
      title: "\u8986\u76d6\u8bbe\u5907",
      value: coveredMachines,
      meta: machines.length
        ? `${machines.length} \u53f0\u53ef\u7528\u8bbe\u5907`
        : "\u6682\u65e0\u8bbe\u5907\u4e3b\u6570\u636e",
      accent: "#b97012"
    },
    {
      title: "\u4ea4\u671f\u98ce\u9669",
      value: urgentRows,
      meta: urgentRows
        ? "\u5efa\u8bae\u5148\u68c0\u67e5\u8fd9\u4e9b\u8ba2\u5355\u7684\u673a\u53f0\u6392\u961f"
        : "\u76ee\u524d\u961f\u5217\u672a\u89c1\u660e\u663e\u4ea4\u671f\u98ce\u9669",
      accent: "#c44733"
    }
  ];

  const latestItems = latestResult?.items || [];

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">
              {"\u6392\u4ea7\u64cd\u4f5c"}
            </h3>
            <p className="panel-subtitle">
              {"\u5148\u5237\u65b0 pending \u961f\u5217\uff0c\u518d\u6267\u884c\u89c4\u5219\u6392\u4ea7\u3002\u4fdd\u6301\u5728\u540c\u4e00\u4e2a\u9875\u9762\u5b8c\u6210\u51c6\u5907\u3001\u6267\u884c\u548c\u590d\u76d8\u5165\u53e3\u3002"}
            </p>
          </div>
          <div className="panel-actions">
            <button
              type="button"
              className="button"
              onClick={handleGenerateTasks}
              disabled={isGenerating || isScheduling}
            >
              {isGenerating ? "\u751f\u6210\u4e2d..." : "\u751f\u6210\u5f85\u6392\u4ea7\u4efb\u52a1"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={handleRunScheduling}
              disabled={isGenerating || isScheduling}
            >
              {isScheduling ? "\u6392\u4ea7\u4e2d..." : "\u6267\u884c\u89c4\u5219\u6392\u4ea7"}
            </button>
            <Link className="button ghost" to="/schedule-results">
              {"\u67e5\u770b\u7ed3\u679c"}
            </Link>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
        {!error && urgentRows > 0 ? (
          <div className="alert warning">
            {`\u961f\u5217\u4e2d\u6709 ${urgentRows} \u6761\u4efb\u52a1\u5c5e\u4e8e\u4ea4\u671f\u98ce\u9669\uff0c\u8bf7\u5728\u6267\u884c\u6392\u4ea7\u524d\u5148\u786e\u8ba4\u673a\u53f0\u8d1f\u8377\u3002`}
          </div>
        ) : null}
      </div>

      <SummaryCards cards={cards} loading={loading} />

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                {"\u5f85\u6392\u4ea7\u961f\u5217"}
              </h3>
              <p className="panel-subtitle">
                {"\u6309\u4f18\u5148\u7ea7\u548c\u4ea4\u671f\u6392\u5e8f\uff0c\u8ba9\u8c03\u5ea6\u5458\u5728 3 \u79d2\u5185\u770b\u5230\u6700\u91cd\u8981\u7684\u4efb\u52a1\u3002"}
              </p>
            </div>

            <div className="filter-row">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`filter-chip${filter === item.key ? " active" : ""}`}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="alert info">
              {"\u6b63\u5728\u52a0\u8f7d\u6392\u4ea7\u961f\u5217\u3002"}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state-title">
                {"\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u4efb\u52a1"}
              </h3>
              <p className="empty-state-copy">
                {"\u53ef\u4ee5\u5c1d\u8bd5\u91cd\u65b0\u751f\u6210\u4efb\u52a1\uff0c\u6216\u5207\u6362\u961f\u5217\u7b5b\u9009\u89c6\u56fe\u3002"}
              </p>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{"\u8ba2\u5355"}</th>
                    <th>{"\u5de5\u5e8f"}</th>
                    <th>{"\u8bbe\u5907"}</th>
                    <th>{"\u6279\u91cf / \u8d1f\u8377"}</th>
                    <th>{"\u4ea4\u671f"}</th>
                    <th>{"\u72b6\u6001"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <p className="data-primary">{row.order_no}</p>
                        <p className="data-secondary">{row.product_name}</p>
                      </td>
                      <td>
                        <p className="data-primary">{row.task_name}</p>
                        <p className="data-secondary">{`Seq ${row.seq_no}`}</p>
                      </td>
                      <td>
                        <p className="data-primary">{row.machine_name}</p>
                        <p className="data-secondary">{row.machine_code}</p>
                      </td>
                      <td>
                        <p className="data-primary">{`${row.quantity} pcs`}</p>
                        <p className="data-secondary">{formatHours(row.process_time)}</p>
                      </td>
                      <td>
                        <p className="data-primary">{formatDateTime(row.due_date)}</p>
                        <p className="data-secondary">{row.deadlineLabel}</p>
                      </td>
                      <td>
                        <div className="detail-list">
                          <StatusBadge
                            tone={
                              row.order_priority >= 2
                                ? "danger"
                                : row.order_priority >= 1
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {`P${row.order_priority}`}
                          </StatusBadge>
                          <StatusBadge tone={row.deadlineTone}>
                            {row.deadlineTone === "danger"
                              ? "\u5df2\u903e\u671f"
                              : row.deadlineTone === "warning"
                                ? "\u7d27\u8feb"
                                : "\u53ef\u63a7"}
                          </StatusBadge>
                        </div>
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
                  {"\u6392\u4ea7\u51c6\u5907\u5ea6"}
                </h3>
                <p className="panel-subtitle">
                  {"\u8fd0\u884c\u4e4b\u524d\u786e\u8ba4\u961f\u5217\u548c\u8d44\u6e90\u662f\u5426\u5c31\u7eea\u3002"}
                </p>
              </div>
            </div>

            <div className="checklist">
              <div className="checklist-row">
                <div className="checklist-copy">
                  <p className="checklist-title">
                    {"\u5f85\u6392\u4ea7\u4efb\u52a1"}
                  </p>
                  <p className="checklist-meta">
                    {"\u9700\u8981\u5148\u7531\u8ba2\u5355 + \u5de5\u827a\u8def\u7ebf\u5c55\u5f00\u751f\u6210\u3002"}
                  </p>
                </div>
                <StatusBadge tone={taskRows.length ? "success" : "warning"}>
                  {taskRows.length ? `\u5df2\u751f\u6210 ${taskRows.length}` : "\u672a\u751f\u6210"}
                </StatusBadge>
              </div>
              <div className="checklist-row">
                <div className="checklist-copy">
                  <p className="checklist-title">
                    {"\u673a\u53f0\u8986\u76d6"}
                  </p>
                  <p className="checklist-meta">
                    {"\u68c0\u67e5\u961f\u5217\u662f\u5426\u6d89\u53ca\u5408\u7406\u7684\u673a\u53f0\u8d44\u6e90\u3002"}
                  </p>
                </div>
                <StatusBadge tone={coveredMachines ? "info" : "warning"}>
                  {coveredMachines ? `${coveredMachines} \u53f0\u8bbe\u5907` : "\u5f85\u68c0\u67e5"}
                </StatusBadge>
              </div>
              <div className="checklist-row">
                <div className="checklist-copy">
                  <p className="checklist-title">
                    {"\u6700\u65b0\u65b9\u6848"}
                  </p>
                  <p className="checklist-meta">
                    {"\u53ef\u4f5c\u4e3a\u65b0\u4e00\u8f6e\u6392\u4ea7\u7684\u5bf9\u6bd4\u57fa\u51c6\u3002"}
                  </p>
                </div>
                <StatusBadge tone={latestResult ? "success" : "neutral"}>
                  {latestResult ? "\u5df2\u6709\u53c2\u8003" : "\u6682\u65e0"}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  {"\u6700\u65b0\u6392\u4ea7\u5feb\u7167"}
                </h3>
                <p className="panel-subtitle">
                  {"\u5728\u4e0d\u79bb\u5f00\u5f53\u524d\u9875\u9762\u7684\u60c5\u51b5\u4e0b\u67e5\u770b\u4e0a\u4e00\u6b21\u6267\u884c\u7ed3\u679c\u3002"}
                </p>
              </div>
              <Link className="link-inline" to="/gantt">
                {"\u6253\u5f00\u7518\u7279\u56fe"}
              </Link>
            </div>

            {!latestResult ? (
              <div className="empty-state">
                <h3 className="empty-state-title">
                  {"\u6682\u65e0\u6392\u4ea7\u7ed3\u679c"}
                </h3>
                <p className="empty-state-copy">
                  {"\u6267\u884c\u89c4\u5219\u6392\u4ea7\u540e\uff0c\u8fd9\u91cc\u4f1a\u7acb\u5373\u51fa\u73b0\u65b9\u6848\u6982\u89c8\u3002"}
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
                  <span className="detail-key">{"\u6392\u4ea7\u660e\u7ec6"}</span>
                  <span className="detail-value">{latestItems.length}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">{"\u7ed3\u679c\u9875"}</span>
                  <Link className="link-inline" to="/schedule-results">
                    {"\u7acb\u5373\u6253\u5f00"}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

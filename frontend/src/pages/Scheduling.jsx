import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getProductionOperations,
  getProductionSchedulingResult,
  getWorkOrders,
  runProductionScheduling
} from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import {
  formatDateTime,
  formatDeadlineLabel,
  formatHours,
  getDeadlineTone
} from "../utils/formatters";

const filters = [
  { key: "all", label: "全部任务" },
  { key: "late", label: "交期风险" },
  { key: "external", label: "外协相关" }
];

export default function Scheduling() {
  const [operations, setOperations] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [operationData, orderData] = await Promise.all([
        getProductionOperations(),
        getWorkOrders()
      ]);
      setOperations(operationData);
      setWorkOrders(orderData);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "排产队列加载失败。");
    }

    try {
      setLatestResult(await getProductionSchedulingResult());
    } catch (requestError) {
      if (requestError?.response?.status !== 404) {
        setError(requestError?.response?.data?.detail || "最新方案加载失败。");
      }
      setLatestResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRun = async () => {
    if (!window.confirm("确认按当前队列执行生产排产吗？")) {
      return;
    }
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const result = await runProductionScheduling();
      setLatestResult(result);
      setMessage(`排产完成，生成 ${result.items.length} 条时间明细。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "排产执行失败。");
    } finally {
      setRunning(false);
    }
  };

  const rows = useMemo(() => {
    return operations
      .map((operation) => ({
        ...operation,
        deadlineTone: getDeadlineTone(operation.due_date),
        deadlineLabel: formatDeadlineLabel(operation.due_date),
        isExternal: /外|表面处理/.test(operation.work_center_name || "")
      }))
      .filter((operation) => {
        if (filter === "late") {
          return operation.deadlineTone !== "success";
        }
        if (filter === "external") {
          return operation.isExternal;
        }
        return true;
      })
      .sort((left, right) => {
        const leftDue = new Date(left.due_date).getTime();
        const rightDue = new Date(right.due_date).getTime();
        if (leftDue !== rightDue) {
          return leftDue - rightDue;
        }
        return left.seq_no - right.seq_no;
      });
  }, [operations, filter]);

  const totalHours = operations.reduce((sum, operation) => sum + operation.duration_hours, 0);
  const resourceCount = new Set(operations.map((operation) => operation.work_center_id)).size;
  const riskCount = operations.filter((operation) => getDeadlineTone(operation.due_date) !== "success").length;
  const cards = [
    {
      title: "待排工序",
      value: operations.length,
      meta: `${workOrders.filter((item) => item.status === "pending").length} 张待排工单`,
      accent: "#205c52"
    },
    {
      title: "队列工时",
      value: formatHours(totalHours),
      meta: "按 Excel 工序列工时汇总",
      accent: "#2d5d8c"
    },
    {
      title: "资源覆盖",
      value: resourceCount,
      meta: "涉及的工段/设备资源",
      accent: "#b97012"
    },
    {
      title: "交期风险",
      value: riskCount,
      meta: riskCount ? "建议优先排程或调整交期" : "当前未见明显风险",
      accent: "#c44733"
    }
  ];

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">生产排产驾驶台</h3>
            <p className="panel-subtitle">
              队列来自已确认导入的工艺表，系统会按依赖、资源空闲和固定班制计算时间。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to="/work-order-import">
              导入工单
            </Link>
            <button className="button secondary" type="button" disabled={running} onClick={handleRun}>
              {running ? "排产中..." : "执行生产排产"}
            </button>
            <Link className="button ghost" to="/schedule-results">
              查看结果
            </Link>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <SummaryCards cards={cards} loading={loading} />

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">待排工序队列</h3>
              <p className="panel-subtitle">按交期和工序顺序展示，排产时还会考虑前后置依赖。</p>
            </div>
            <div className="filter-row">
              {filters.map((item) => (
                <button
                  key={item.key}
                  className={`filter-chip${filter === item.key ? " active" : ""}`}
                  type="button"
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="alert info">正在加载队列。</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-state-title">暂无待排任务</h3>
              <p className="empty-state-copy">先在工单导入页上传工艺表并确认入库。</p>
              <Link className="button" to="/work-order-import">
                去导入工单
              </Link>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>工单</th>
                    <th>零件</th>
                    <th>工序资源</th>
                    <th>工时</th>
                    <th>交期</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <p className="data-primary">{row.order_no}</p>
                        <p className="data-secondary">{`P${workOrders.find((item) => item.id === row.work_order_id)?.priority ?? 0}`}</p>
                      </td>
                      <td>
                        <p className="data-primary">{row.drawing_no}</p>
                        <p className="data-secondary">{`${row.part_no} / ${row.part_name}`}</p>
                      </td>
                      <td>
                        <p className="data-primary">{row.work_center_name}</p>
                        <p className="data-secondary">{`Seq ${row.seq_no}`}</p>
                      </td>
                      <td>{formatHours(row.duration_hours)}</td>
                      <td>
                        <p className="data-primary">{formatDateTime(row.due_date)}</p>
                        <p className="data-secondary">{row.deadlineLabel}</p>
                      </td>
                      <td>
                        <StatusBadge tone={row.deadlineTone}>
                          {row.deadlineTone === "danger"
                            ? "已逾期"
                            : row.deadlineTone === "warning"
                              ? "紧迫"
                              : "可控"}
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
                <h3 className="panel-title">最新方案</h3>
                <p className="panel-subtitle">每次排产都会保留一个历史方案。</p>
              </div>
            </div>
            {latestResult ? (
              <div className="detail-list">
                <div className="detail-row">
                  <span className="detail-key">方案编号</span>
                  <span className="detail-value">{latestResult.schedule.schedule_no}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">明细</span>
                  <span className="detail-value">{latestResult.items.length}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">逾期工单</span>
                  <StatusBadge tone={latestResult.late_orders.length ? "danger" : "success"}>
                    {latestResult.late_orders.length}
                  </StatusBadge>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h3 className="empty-state-title">暂无方案</h3>
                <p className="empty-state-copy">运行排产后这里会显示最新结果。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  commitWorkOrderImport,
  previewWorkOrderImport
} from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";

function toLocalInputValue(date = new Date()) {
  const next = new Date(date);
  next.setDate(next.getDate() + 14);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
}

export default function WorkOrderImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState({
    order_no: "",
    customer: "FUBEI",
    product_name: "焊接结构件",
    quantity: 1,
    priority: 1,
    due_date: toLocalInputValue()
  });

  const cards = useMemo(() => {
    const summary = preview?.summary || {};
    return [
      {
        title: "部件 / 零件",
        value: summary.part_count || 0,
        meta: `${summary.assembly_count || 0} 个上级部件 / ${summary.child_part_count || 0} 个子件`,
        accent: "#205c52"
      },
      {
        title: "工序任务",
        value: summary.operation_count || 0,
        meta: `${summary.work_center_count || 0} 个资源工段`,
        accent: "#2d5d8c"
      },
      {
        title: "总工时",
        value: `${summary.total_hours || 0}h`,
        meta: "来自工艺表非空数字工序列",
        accent: "#b97012"
      },
      {
        title: "校验问题",
        value: (summary.error_count || 0) + (summary.warning_count || 0),
        meta: `${summary.error_count || 0} 个错误 / ${summary.warning_count || 0} 个提醒`,
        accent: "#c44733"
      }
    ];
  }, [preview]);

  const handlePreview = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("请先选择工艺表文件。");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await previewWorkOrderImport(file);
      setPreview(data);
      setOrder((previous) => ({
        ...previous,
        order_no: previous.order_no || file.name.replace(/\.(xlsm|xlsx)$/i, "")
      }));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "工艺表解析失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) {
      return;
    }
    setCommitting(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        order: {
          ...order,
          quantity: Number(order.quantity),
          priority: Number(order.priority),
          due_date: new Date(order.due_date).toISOString()
        },
        preview,
        create_missing_work_centers: true
      };
      const result = await commitWorkOrderImport(payload);
      setMessage(
        `导入完成：${result.part_count} 个零件、${result.operation_count} 道工序、${result.dependency_count} 条依赖。`
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "确认导入失败。");
    } finally {
      setCommitting(false);
    }
  };

  const blockingErrors = preview?.issues?.filter((issue) => issue.severity === "error") || [];
  const topOperations = preview?.operations?.slice(0, 12) || [];
  const topParts = preview?.parts?.filter((part) => part.operation_count > 0).slice(0, 10) || [];

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">工艺表上传与订单信息</h3>
            <p className="panel-subtitle">
              上传 .xlsm/.xlsx 后先解析预览，确认订单信息和校验问题后再写入系统。
            </p>
          </div>
          <Link className="button ghost" to="/work-centers">
            资源配置
          </Link>
        </div>

        <form className="form-grid" onSubmit={handlePreview}>
          <label className="field-label">
            工艺表
            <input
              className="field-input"
              type="file"
              accept=".xlsm,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <label className="field-label">
            订单号
            <input
              className="field-input"
              value={order.order_no}
              onChange={(event) => setOrder({ ...order, order_no: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            客户
            <input
              className="field-input"
              value={order.customer}
              onChange={(event) => setOrder({ ...order, customer: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            产品名称
            <input
              className="field-input"
              value={order.product_name}
              onChange={(event) => setOrder({ ...order, product_name: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            数量
            <input
              className="field-input"
              type="number"
              min="1"
              value={order.quantity}
              onChange={(event) => setOrder({ ...order, quantity: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            优先级
            <input
              className="field-input"
              type="number"
              min="0"
              value={order.priority}
              onChange={(event) => setOrder({ ...order, priority: event.target.value })}
            />
          </label>
          <label className="field-label">
            交期
            <input
              className="field-input"
              type="datetime-local"
              value={order.due_date}
              onChange={(event) => setOrder({ ...order, due_date: event.target.value })}
              required
            />
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "解析中..." : "解析预览"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={handleCommit}
              disabled={!preview || committing || blockingErrors.length > 0}
            >
              {committing ? "入库中..." : "确认导入"}
            </button>
          </div>
        </form>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      {preview ? (
        <>
          <SummaryCards cards={cards} />

          <div className="split-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">解析出的工序任务</h3>
                  <p className="panel-subtitle">只展示前 12 条，完整任务会在确认导入后进入排产队列。</p>
                </div>
              </div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>零件</th>
                      <th>工序 / 资源</th>
                      <th>工时</th>
                      <th>来源</th>
                      <th>类型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOperations.map((operation) => (
                      <tr key={`${operation.part_no}-${operation.seq_no}-${operation.source_row}`}>
                        <td>
                          <p className="data-primary">{operation.drawing_no}</p>
                          <p className="data-secondary">{`${operation.part_no} ${operation.part_name}`}</p>
                        </td>
                        <td>
                          <p className="data-primary">{operation.work_center_name}</p>
                          <p className="data-secondary">{`Seq ${operation.seq_no}`}</p>
                        </td>
                        <td>{`${operation.duration_hours}h`}</td>
                        <td>{`R${operation.source_row} / C${operation.source_col}`}</td>
                        <td>
                          <StatusBadge tone={operation.is_external ? "warning" : "info"}>
                            {operation.is_external ? "外协" : "内部"}
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
                    <h3 className="panel-title">零件任务概览</h3>
                    <p className="panel-subtitle">按工时较明确的零件预览。</p>
                  </div>
                </div>
                <div className="detail-list">
                  {topParts.map((part) => (
                    <div className="detail-row" key={`${part.no}-${part.drawing_no}`}>
                      <span>
                        <span className="data-primary">{part.drawing_no}</span>
                        <span className="data-secondary">{`${part.no} / ${part.name}`}</span>
                      </span>
                      <span className="detail-value">{`${part.operation_count} 道 / ${part.total_hours}h`}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3 className="panel-title">导入校验</h3>
                    <p className="panel-subtitle">错误会阻止入库，提醒会自动处理或创建资源。</p>
                  </div>
                </div>
                <div className="detail-list">
                  {(preview.issues || []).slice(0, 10).map((issue, index) => (
                    <div className="detail-row" key={`${issue.message}-${index}`}>
                      <span className="detail-key">
                        {issue.row ? `R${issue.row}` : issue.column ? `C${issue.column}` : "全局"}
                      </span>
                      <span className="detail-value">
                        <StatusBadge tone={issue.severity === "error" ? "danger" : "warning"}>
                          {issue.message}
                        </StatusBadge>
                      </span>
                    </div>
                  ))}
                  {preview.issues?.length === 0 ? (
                    <div className="alert success">没有发现阻塞性问题。</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

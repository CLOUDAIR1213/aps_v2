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

function isMissingMappingIssue(issue) {
  return issue?.severity === "error" && (
    issue.field === "work_center" ||
    issue.message?.includes("尚未配置映射规则") ||
    issue.message?.includes("未配置映射")
  );
}

export default function WorkOrderImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoCreateMissingMappings, setAutoCreateMissingMappings] = useState(false);
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
        title: "产能工时（按零件数量折算）",
        value: `${summary.total_capacity_hours ?? summary.total_hours ?? 0}h`,
        meta: `Excel 单件工时 ${summary.total_hours || 0}h`,
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
      setAutoCreateMissingMappings(false);
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
    if (hasMissingMappings && !autoCreateMissingMappings) {
      setError("发现未配置映射的工序，请选择自动添加，或先去工序映射页面手工配置。");
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
        create_missing_work_centers: autoCreateMissingMappings
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

  const topOperations = preview?.operations?.slice(0, 12) || [];
  const topParts = preview?.parts?.filter((part) => part.operation_count > 0).slice(0, 10) || [];
  const partQuantityByNo = useMemo(
    () => new Map((preview?.parts || []).map((part) => [part.no, Number(part.quantity || 1)])),
    [preview]
  );
  const unmappedCount = preview?.operations?.filter((op) => !op.mapped).length || 0;
  const unmappedNames = [...new Set(preview?.operations?.filter((op) => !op.mapped).map((op) => op.work_center_name).filter(Boolean) || [])];
  const mappingErrors = preview?.issues?.filter(isMissingMappingIssue) || [];
  const otherBlockingErrors = preview?.issues?.filter(
    (issue) => issue.severity === "error" && !isMissingMappingIssue(issue)
  ) || [];
  const blockingErrors = autoCreateMissingMappings
    ? otherBlockingErrors
    : [...otherBlockingErrors, ...mappingErrors];
  const hasMissingMappings = unmappedCount > 0 || mappingErrors.length > 0;
  const missingMappingCount = unmappedCount || mappingErrors.length;
  const missingMappingText = unmappedNames.length > 0
    ? unmappedNames.join("、")
    : `${mappingErrors.length} 个工序列`;

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
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setPreview(null);
                setMessage("");
                setError("");
                setAutoCreateMissingMappings(false);
              }}
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
              {committing
                ? "入库中..."
                : autoCreateMissingMappings && hasMissingMappings
                  ? "自动补齐并导入"
                  : "确认导入"}
            </button>
          </div>
        </form>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      {preview ? (
        <>
          <SummaryCards cards={cards} />

          {hasMissingMappings ? (
            <div className={`import-mapping-choice ${autoCreateMissingMappings ? "selected" : ""}`}>
              <div>
                <h3 className="data-state-title">发现未配置的工序映射</h3>
                <p className="data-state-copy">
                  有 {missingMappingCount} 道工序未配置映射规则：{missingMappingText}。
                  可在本次导入时自动新增同名工段和映射，也可以先到
                  <Link className="link-inline" to="/operation-mappings"> 工序映射 </Link>
                  页面手工配置。
                </p>
              </div>
              <div className="import-mapping-actions">
                <button
                  className={`button small ${autoCreateMissingMappings ? "" : "ghost"}`}
                  type="button"
                  onClick={() => {
                    setAutoCreateMissingMappings((value) => !value);
                    setError("");
                  }}
                >
                  {autoCreateMissingMappings ? "已选择自动添加" : "自动添加缺失映射"}
                </button>
                <Link className="button small ghost" to="/operation-mappings">
                  手工配置
                </Link>
              </div>
            </div>
          ) : null}

          <div className="split-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">解析出的工序任务</h3>
                  <p className="panel-subtitle">只展示前 12 条；Excel 数字按单件工时入库，排产时按零件数量折算产能工时。</p>
                </div>
              </div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>零件</th>
                      <th>工序 / 资源</th>
                      <th>单件 / 产能工时（按零件数量折算）</th>
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
                        <td>
                          {`${operation.duration_hours}h / ${
                            Math.round(
                              operation.duration_hours *
                                Math.max(partQuantityByNo.get(operation.part_no) || 1, 1) *
                                1000
                            ) / 1000
                          }h`}
                        </td>
                        <td>{`R${operation.source_row} / C${operation.source_col}`}</td>
                        <td>
                          <StatusBadge tone={operation.is_external ? "warning" : "info"}>
                            {operation.is_external ? "外协" : "内部"}
                          </StatusBadge>
                          {" "}
                          <StatusBadge tone={operation.mapped ? "success" : "danger"}>
                            {operation.mapped ? "已映射" : "未映射"}
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
                    <p className="panel-subtitle">按零件数量折算产能工时。</p>
                  </div>
                </div>
                <div className="detail-list">
                  {topParts.map((part) => (
                    <div className="detail-row" key={`${part.no}-${part.drawing_no}`}>
                      <span>
                        <span className="data-primary">{part.drawing_no}</span>
                        <span className="data-secondary">{`${part.no} / ${part.name}`}</span>
                      </span>
                      <span className="detail-value">
                        {`${part.operation_count} 道 / ${part.total_hours}h 单件 / ${
                          part.capacity_hours ?? Math.round(part.total_hours * Math.max(part.quantity || 1, 1) * 1000) / 1000
                        }h 产能（按零件数量折算）`}
                      </span>
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
                      <StatusBadge
                        tone={
                          issue.severity === "error"
                            ? autoCreateMissingMappings && isMissingMappingIssue(issue)
                              ? "warning"
                              : "danger"
                            : "warning"
                        }
                      >
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

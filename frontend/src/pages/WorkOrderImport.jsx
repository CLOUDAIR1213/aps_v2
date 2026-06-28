import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  commitWorkOrderImport,
  getWorkCenters,
  previewWorkOrderImport
} from "../api/production";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
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

function groupOperationsByPart(operations) {
  const groups = new Map();
  for (const op of operations) {
    if (!groups.has(op.part_no)) {
      groups.set(op.part_no, {
        part_no: op.part_no,
        drawing_no: op.drawing_no,
        part_name: op.part_name,
        items: []
      });
    }
    groups.get(op.part_no).items.push(op);
  }
  for (const group of groups.values()) {
    group.items.sort((a, b) => a.seq_no - b.seq_no);
  }
  return [...groups.values()];
}

function isMappingIssueCovered(issue, overrides) {
  return isMissingMappingIssue(issue) && Object.keys(overrides).some((name) => issue.message?.includes(name));
}

const TEMPLATE_KEY = "aps_import_template";

function loadTemplate() {
  try {
    const saved = localStorage.getItem(TEMPLATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveTemplate(order) {
  try {
    const { order_no, due_date, ...rest } = order;
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(rest));
  } catch {}
}

export default function WorkOrderImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoCreateMissingMappings, setAutoCreateMissingMappings] = useState(false);
  const [order, setOrder] = useState(() => {
    const saved = loadTemplate();
    return {
      order_no: "",
      customer: "FUBEI",
      product_name: "焊接结构件",
      quantity: 1,
      priority: 1,
      due_date: toLocalInputValue(),
      ...(saved || {})
    };
  });

  const [showAllOps, setShowAllOps] = useState(false);
  const [showAllParts, setShowAllParts] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [mappingOverrides, setMappingOverrides] = useState({});
  const [existingCenters, setExistingCenters] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [operationsPanelHeight, setOperationsPanelHeight] = useState(null);
  const sidebarStackRef = useRef(null);

  useEffect(() => {
    getWorkCenters()
      .then((data) => setExistingCenters(data || []))
      .catch(() => {});
  }, []);

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
        title: "外协任务",
        value: summary.external_task_count || 0,
        meta: `${summary.external_total_hours || 0}h 产能 / 空白跳过 ${summary.external_blank_skipped_count || 0}`,
        accent: "#7d567e"
      },
      {
        title: "校验问题",
        value: (summary.error_count || 0) + (summary.warning_count || 0),
        meta: `${summary.error_count || 0} 个错误 / ${summary.warning_count || 0} 个提醒`,
        accent: "#c44733"
      },
      {
        title: "导入备注",
        value: summary.note_count || 0,
        meta: "来自 Excel 基础信息备注列",
        accent: "#6f6242"
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
    setImportResult(null);

    try {
      const data = await previewWorkOrderImport(file);
      setPreview(data);
      setAutoCreateMissingMappings(false);
      setMappingOverrides({});
      setShowAllOps(false);
      setShowAllParts(false);
      setShowAllIssues(false);
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
    if (mappingSelectionIncomplete) {
      setError("发现未配置映射的工序，请选择已有工段或自动添加，或先去工序映射页面手工配置。");
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
        create_missing_work_centers: autoCreateMissingMappings,
        mapping_overrides: mappingOverrides
      };
      const result = await commitWorkOrderImport(payload);
      setImportResult(result);
      setMessage(
        `导入完成：${result.part_count} 个零件、${result.operation_count} 道工序、${result.dependency_count} 条依赖。`
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "确认导入失败。");
    } finally {
      setCommitting(false);
    }
  };

  const handleMappingOverride = (originalName, selectedId) => {
    setMappingOverrides((prev) => {
      const next = { ...prev };
      if (selectedId) {
        next[originalName] = Number(selectedId);
      } else {
        delete next[originalName];
      }
      return next;
    });
  };

  const allOperations = preview?.operations || [];
  const allParts = preview?.parts || [];
  const partQuantityByNo = useMemo(
    () => new Map(allParts.map((part) => [part.no, Number(part.quantity || 1)])),
    [allParts]
  );
  const notedParts = useMemo(() => allParts.filter((part) => part.note), [allParts]);

  const allUnmappedNames = [
    ...new Set(allOperations.filter((op) => !op.mapped).map((op) => op.work_center_name).filter(Boolean))
  ];
  const unresolvedUnmappedNames = allUnmappedNames.filter((name) => !mappingOverrides[name]);
  const mappingErrors = preview?.issues?.filter(isMissingMappingIssue) || [];
  const otherBlockingErrors = preview?.issues?.filter(
    (issue) => issue.severity === "error" && !isMissingMappingIssue(issue)
  ) || [];
  const unresolvedMappingErrors = mappingErrors.filter(
    (issue) => !autoCreateMissingMappings && !isMappingIssueCovered(issue, mappingOverrides)
  );
  const blockingErrors = [...otherBlockingErrors, ...unresolvedMappingErrors];
  const hasMissingMappings = allUnmappedNames.length > 0 || mappingErrors.length > 0;
  const mappingSelectionIncomplete = hasMissingMappings && !autoCreateMissingMappings && unresolvedUnmappedNames.length > 0;

  const activeCenters = useMemo(
    () => existingCenters.filter((center) => center.status === "active").sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")),
    [existingCenters]
  );

  const opGroups = useMemo(() => groupOperationsByPart(allOperations), [allOperations]);
  const displayedOpGroups = showAllOps ? opGroups : opGroups.slice(0, 8);
  const displayedParts = showAllParts ? allParts : allParts.slice(0, 15);

  const sortedIssues = useMemo(() => {
    const issues = preview?.issues || [];
    return [...issues].sort((a, b) => {
      if (a.severity === "error" && b.severity !== "error") return -1;
      if (a.severity !== "error" && b.severity === "error") return 1;
      return 0;
    });
  }, [preview]);
  const displayedIssues = showAllIssues ? sortedIssues : sortedIssues.slice(0, 20);

  useEffect(() => {
    if (!preview || !sidebarStackRef.current) {
      setOperationsPanelHeight(null);
      return undefined;
    }

    const sidebarNode = sidebarStackRef.current;
    const updateHeight = () => {
      if (window.innerWidth <= 900) {
        setOperationsPanelHeight(null);
        return;
      }
      setOperationsPanelHeight(Math.ceil(sidebarNode.getBoundingClientRect().height));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(sidebarNode);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [preview, showAllParts, showAllIssues, displayedParts.length, displayedIssues.length, notedParts.length]);

  return (
    <section className="page-grid">
      <div className="panel compact-page-panel">
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

        <form className="table-toolbar import-toolbar" onSubmit={handlePreview}>
          <label className="toolbar-field import-file-field">
            <span>工艺表</span>
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
                setMappingOverrides({});
                setImportResult(null);
              }}
            />
          </label>
          <label className="toolbar-field">
            <span>订单号</span>
            <input
              className="field-input"
              value={order.order_no}
              onChange={(event) => setOrder({ ...order, order_no: event.target.value })}
              required
            />
          </label>
          <label className="toolbar-field">
            <span>客户</span>
            <input
              className="field-input"
              value={order.customer}
              onChange={(event) => setOrder({ ...order, customer: event.target.value })}
              required
            />
          </label>
          <label className="toolbar-field">
            <span>产品名称</span>
            <input
              className="field-input"
              value={order.product_name}
              onChange={(event) => setOrder({ ...order, product_name: event.target.value })}
              required
            />
          </label>
          <label className="toolbar-field">
            <span>数量</span>
            <input
              className="field-input"
              type="number"
              min="1"
              value={order.quantity}
              onChange={(event) => setOrder({ ...order, quantity: event.target.value })}
              required
            />
          </label>
          <label className="toolbar-field">
            <span>优先级</span>
            <input
              className="field-input"
              type="number"
              min="0"
              value={order.priority}
              onChange={(event) => setOrder({ ...order, priority: event.target.value })}
            />
          </label>
          <label className="toolbar-field">
            <span>交期</span>
            <input
              className="field-input"
              type="datetime-local"
              value={order.due_date}
              onChange={(event) => setOrder({ ...order, due_date: event.target.value })}
              required
            />
          </label>
          <div className="toolbar-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "解析中..." : "解析预览"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={handleCommit}
              disabled={!preview || committing || blockingErrors.length > 0 || mappingSelectionIncomplete}
            >
              {committing
                ? "入库中..."
                : autoCreateMissingMappings && hasMissingMappings
                  ? "自动补齐并导入"
                  : "确认导入"}
            </button>
            <button
              className="button ghost small"
              type="button"
              title="将当前客户、产品名称、数量、优先级保存为下次默认值"
              onClick={() => {
                saveTemplate(order);
                setError("");
                setMessage("已保存为默认模板，下次打开页面自动填充。");
              }}
            >
              保存默认
            </button>
          </div>
        </form>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}

        {importResult ? (
          <div className="import-next-steps">
            <span className="data-primary">导入成功，下一步：</span>
            <Link className="button small ghost" to="/work-orders">查看订单</Link>
            <Link className="button small ghost" to="/scheduling">进入排产</Link>
            <Link className="button small ghost" to="/operation-mappings">工序映射</Link>
          </div>
        ) : null}
      </div>

      {preview ? (
        <>
          <CompactSummaryStrip className="import-summary-strip" items={cards} />

          {hasMissingMappings ? (
            <div className={`import-mapping-choice ${autoCreateMissingMappings ? "selected" : ""}`}>
              <div>
                <h3 className="data-state-title">发现未配置的工序映射</h3>
                <p className="data-state-copy">
                  有 {allUnmappedNames.length} 个工序列未配置映射规则：{allUnmappedNames.join("、") || `${mappingErrors.length} 个工序列`}。
                  可在下方选择已有工段，或自动新增同名工段，也可以先到
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
                    if (!autoCreateMissingMappings) setMappingOverrides({});
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

          {allUnmappedNames.length > 0 && !autoCreateMissingMappings ? (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">选择已有工段映射</h3>
                  <p className="panel-subtitle">为未映射的工序列选择已有工段，或留空使用自动添加。</p>
                </div>
              </div>
              <div className="import-mapping-overrides">
                {allUnmappedNames.map((name) => (
                  <label className="toolbar-field" key={name}>
                    <span>{name}</span>
                    <select
                      className="field-input"
                      value={mappingOverrides[name] || ""}
                      onChange={(event) => handleMappingOverride(name, event.target.value)}
                    >
                      <option value="">-- 未选择（将使用自动添加或报错） --</option>
                      {activeCenters.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name}{center.is_external ? "（外协）" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="split-grid import-preview-grid">
            <div
              className="panel import-operations-panel"
              style={operationsPanelHeight ? { height: operationsPanelHeight, maxHeight: operationsPanelHeight } : undefined}
            >
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">
                    解析出的工序任务
                    <span className="data-secondary" style={{ marginLeft: 8, fontSize: "0.85em" }}>
                      共 {allOperations.length} 条
                    </span>
                  </h3>
                  <p className="panel-subtitle">按零件分组展示；Excel 数字按单件工时入库，排产时按零件数量折算产能工时。</p>
                </div>
                {opGroups.length > 8 ? (
                  <button
                    className="button small ghost"
                    type="button"
                    onClick={() => setShowAllOps((v) => !v)}
                  >
                    {showAllOps ? "收起" : `展开全部 ${opGroups.length} 组`}
                  </button>
                ) : null}
              </div>
              <div className="table-shell import-operations-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>零件</th>
                      <th>工序 / 资源</th>
                      <th>加工要求</th>
                      <th>单件 / 产能工时（按零件数量折算）</th>
                      <th>来源</th>
                      <th>类型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOpGroups.map((group) => (
                      <PartOperationGroup
                        key={group.part_no}
                        group={group}
                        partQuantity={partQuantityByNo.get(group.part_no) || 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sidebar-stack import-preview-sidebar" ref={sidebarStackRef}>
              <div className="panel import-sidebar-panel import-issues-panel">
                <div className="panel-header">
                  <div>
                    <h3 className="panel-title">
                      导入校验
                      <span className="data-secondary" style={{ marginLeft: 8, fontSize: "0.85em" }}>
                        共 {sortedIssues.length} 条
                      </span>
                    </h3>
                    <p className="panel-subtitle">错误会阻止入库，提醒会自动处理或创建资源。</p>
                  </div>
                  {sortedIssues.length > 20 ? (
                    <button
                      className="button small ghost"
                      type="button"
                      onClick={() => setShowAllIssues((v) => !v)}
                    >
                      {showAllIssues ? "收起" : `展开全部 ${sortedIssues.length} 条`}
                    </button>
                  ) : null}
                </div>
                <div className="detail-list import-sidebar-list import-issues-list">
                  {displayedIssues.map((issue, index) => (
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
                  {sortedIssues.length === 0 ? (
                    <div className="alert success">没有发现阻塞性问题。</div>
                  ) : null}
                </div>
              </div>

              <div className="panel import-sidebar-panel import-parts-panel">
                <div className="panel-header">
                  <div>
                    <h3 className="panel-title">
                      零件任务概览
                      <span className="data-secondary" style={{ marginLeft: 8, fontSize: "0.85em" }}>
                        共 {allParts.length} 个
                      </span>
                    </h3>
                    <p className="panel-subtitle">按零件数量折算产能工时。</p>
                  </div>
                  {allParts.length > 15 ? (
                    <button
                      className="button small ghost"
                      type="button"
                      onClick={() => setShowAllParts((v) => !v)}
                    >
                      {showAllParts ? "收起" : `展开全部 ${allParts.length} 个`}
                    </button>
                  ) : null}
                </div>
                <div className="detail-list import-sidebar-list import-parts-list">
                  {displayedParts.map((part) => (
                    <div className="detail-row" key={`${part.no}-${part.drawing_no}`}>
                      <span>
                        <span className="data-primary">{part.drawing_no}</span>
                        <span className="data-secondary">{`${part.no} / ${part.name}`}</span>
                        {part.note ? (
                          <span className="data-secondary import-part-note" title={`备注：${part.note}`}>
                            {`备注：${part.note}`}
                          </span>
                        ) : null}
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

              {notedParts.length > 0 ? (
                <div className="panel import-sidebar-panel import-notes-panel">
                  <div className="panel-header">
                    <div>
                      <h3 className="panel-title">导入备注 ({notedParts.length})</h3>
                      <p className="panel-subtitle">来自 Excel 基础信息区的备注列，按零件行归集。</p>
                    </div>
                  </div>
                  <div className="detail-list import-sidebar-list import-notes-list">
                    {notedParts.map((part) => (
                      <div className="detail-row" key={`${part.no}-${part.drawing_no}-note`}>
                        <span>
                          <span className="data-primary">{part.drawing_no}</span>
                          <span className="data-secondary">{`${part.no} / ${part.name}`}</span>
                        </span>
                        <span className="detail-value">{part.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function PartOperationGroup({ group, partQuantity }) {
  return (
    <>
      <tr className="import-group-header">
        <td colSpan={6}>
          <span className="data-primary">{group.drawing_no}</span>
          <span className="data-secondary">{` ${group.part_no} / ${group.part_name}`}</span>
          <span className="data-secondary">{` — ${group.items.length} 道工序`}</span>
        </td>
      </tr>
      {group.items.map((operation) => (
        <tr key={`${operation.part_no}-${operation.seq_no}-${operation.source_row}`}>
          <td style={{ paddingLeft: 24 }}>
            <p className="data-secondary">{`Seq ${operation.seq_no}`}</p>
          </td>
          <td>
            <p className="data-primary">{operation.work_center_name}</p>
          </td>
          <td>
            {operation.requirement_note ? (
              <StatusBadge tone="warning" title={operation.requirement_note}>
                加工要求
              </StatusBadge>
            ) : (
              <span className="data-secondary">--</span>
            )}
          </td>
          <td>
            {`${operation.duration_hours}h / ${
              Math.round(operation.duration_hours * Math.max(partQuantity, 1) * 1000) / 1000
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
    </>
  );
}

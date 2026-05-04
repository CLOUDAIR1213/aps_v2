import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { getOrderScheduleDetail } from "../api/production";
import StatusBadge from "../components/StatusBadge";
import { formatDate, formatDateTime, formatHours, getDurationHours } from "../utils/formatters";

function buildTimeline(items, startField, endField) {
  const timestamps = items.flatMap((item) => [
    new Date(item[startField]).getTime(),
    new Date(item[endField]).getTime()
  ]);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  return {
    minTime,
    totalDuration: Math.max(maxTime - minTime, 1)
  };
}

function PartTimeline({ parts }) {
  if (!parts.length) {
    return <div className="alert info">暂无零件排产数据。</div>;
  }
  const timeline = buildTimeline(parts, "planned_start_time", "planned_end_time");

  return (
    <div className="part-timeline-list">
      {parts.map((part) => {
        const start = new Date(part.planned_start_time).getTime();
        const end = new Date(part.planned_end_time).getTime();
        const left = ((start - timeline.minTime) / timeline.totalDuration) * 100;
        const width = Math.max(((end - start) / timeline.totalDuration) * 100, 8);
        return (
          <div className="part-timeline-row" key={part.part_id}>
            <div className="part-timeline-meta">
              <p className="data-primary">{part.drawing_no}</p>
              <p className="data-secondary">{`${part.part_no} / ${part.part_name} / 数量 ${part.quantity}`}</p>
            </div>
            <div className="part-timeline-lane">
              <span className="part-timeline-bar" style={{ left: `${left}%`, width: `${width}%` }}>
                {`${formatDateTime(part.planned_start_time)} - ${formatDateTime(part.planned_end_time)}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OperationTimeline({ operations }) {
  if (!operations.length) {
    return <div className="alert info">暂无工序排产数据。</div>;
  }
  const timeline = buildTimeline(operations, "planned_start_time", "planned_end_time");

  return (
    <div className="operation-timeline-list">
      {operations.map((operation) => {
        const start = new Date(operation.planned_start_time).getTime();
        const end = new Date(operation.planned_end_time).getTime();
        const left = ((start - timeline.minTime) / timeline.totalDuration) * 100;
        const width = Math.max(((end - start) / timeline.totalDuration) * 100, 7);
        return (
          <div className="operation-timeline-row" key={operation.operation_id}>
            <div className="operation-timeline-meta">
              <p className="data-primary">{operation.operation_name}</p>
              <p className="data-secondary">{`${operation.part_name} / ${operation.work_center_name}`}</p>
            </div>
            <div className="operation-timeline-lane">
              <span className="operation-timeline-bar" style={{ left: `${left}%`, width: `${width}%` }}>
                {operation.machine_name || "外协"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderScheduleDetail() {
  const { workOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const scheduleId = searchParams.get("schedule_id") || "";
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        setDetail(await getOrderScheduleDetail(workOrderId, scheduleId ? { schedule_id: scheduleId } : {}));
      } catch (requestError) {
        setError(requestError?.response?.data?.detail || "订单排产详情加载失败。");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [workOrderId, scheduleId]);

  const operations = useMemo(() => {
    return (detail?.parts || []).flatMap((part) =>
      part.operations.map((operation) => ({
        ...operation,
        part_id: part.part_id,
        part_no: part.part_no,
        drawing_no: part.drawing_no,
        part_name: part.part_name
      }))
    );
  }, [detail]);

  const lastOperation = useMemo(() => {
    return operations.reduce((latest, operation) => {
      if (!latest) {
        return operation;
      }
      return new Date(operation.planned_end_time) > new Date(latest.planned_end_time)
        ? operation
        : latest;
    }, null);
  }, [operations]);

  if (loading) {
    return (
      <section className="page-grid">
        <div className="alert info">正在加载订单排产详情。</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-grid">
        <div className="alert danger">{error}</div>
        <Link className="button ghost" to={`/schedule-results${scheduleId ? `?schedule_id=${scheduleId}` : ""}`}>
          返回订单总览
        </Link>
      </section>
    );
  }

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">订单排产详情</h3>
            <p className="panel-subtitle">
              从订单下钻到零件和工序，用于解释这个订单为什么排到当前时间。
            </p>
          </div>
          <div className="panel-actions">
            <Link className="button ghost" to={`/schedule-results${scheduleId ? `?schedule_id=${scheduleId}` : ""}`}>
              返回订单总览
            </Link>
            <Link className="button ghost" to="/gantt">
              查看资源甘特图
            </Link>
          </div>
        </div>
      </div>

      <div className="order-detail-summary">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">{detail.order_no}</h3>
              <p className="panel-subtitle">{`${detail.customer_name} / ${detail.product_name}`}</p>
            </div>
            <StatusBadge tone={detail.status === "delayed" ? "danger" : "success"}>
              {detail.status === "delayed" ? `延期 ${detail.delay_days} 天` : "正常"}
            </StatusBadge>
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-key">数量</span>
              <strong>{detail.quantity}</strong>
            </div>
            <div>
              <span className="detail-key">优先级</span>
              <strong>{detail.priority}</strong>
            </div>
            <div>
              <span className="detail-key">交期</span>
              <strong>{formatDate(detail.due_date)}</strong>
            </div>
            <div>
              <span className="detail-key">预计开始</span>
              <strong>{formatDateTime(detail.planned_start_time)}</strong>
            </div>
            <div>
              <span className="detail-key">预计完成</span>
              <strong>{formatDateTime(detail.planned_end_time)}</strong>
            </div>
            <div>
              <span className="detail-key">最后工序</span>
              <strong>{lastOperation ? `${lastOperation.operation_name} / ${lastOperation.work_center_name}` : "--"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">零件级时间轴</h3>
            <p className="panel-subtitle">每个零件从第一道工序到最后一道工序的跨度。</p>
          </div>
        </div>
        <PartTimeline parts={detail.parts} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">工序级时间轴</h3>
            <p className="panel-subtitle">当前订单下所有零件工序的资源占用。</p>
          </div>
        </div>
        <OperationTimeline operations={operations} />
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">工序明细</h3>
              <p className="panel-subtitle">用于核对具体工段、设备和工时。</p>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>零件</th>
                  <th>工序</th>
                  <th>资源</th>
                  <th>时间窗口</th>
                  <th>工时</th>
                  <th>前置工序</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((operation) => (
                  <tr key={operation.operation_id}>
                    <td>
                      <p className="data-primary">{operation.drawing_no}</p>
                      <p className="data-secondary">{operation.part_name}</p>
                    </td>
                    <td>{operation.operation_name}</td>
                    <td>
                      <p className="data-primary">{operation.work_center_name}</p>
                      <p className="data-secondary">{operation.machine_name || "外协"}</p>
                    </td>
                    <td>
                      <p className="data-primary">{formatDateTime(operation.planned_start_time)}</p>
                      <p className="data-secondary">{formatDateTime(operation.planned_end_time)}</p>
                    </td>
                    <td>{formatHours(operation.duration_minutes / 60)}</td>
                    <td>{operation.predecessor_operation_ids.length || "无"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">工序依赖说明</h3>
              <p className="panel-subtitle">第一版展示 FS 前后置关系。</p>
            </div>
          </div>
          {detail.dependencies.length ? (
            <div className="detail-list">
              {detail.dependencies.map((dependency) => (
                <div
                  className="detail-row"
                  key={`${dependency.predecessor_operation_id}-${dependency.successor_operation_id}`}
                >
                  <span className="detail-key">前置 {dependency.predecessor_operation_id}</span>
                  <span className="detail-value">{`后续 ${dependency.successor_operation_id} / ${dependency.dependency_type}`}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert info">当前订单内暂无工序依赖。</div>
          )}
        </div>
      </div>
    </section>
  );
}

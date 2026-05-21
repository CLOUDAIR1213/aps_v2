import StatusBadge from "../StatusBadge";
import { formatDateTime, formatHours, getDurationHours } from "../../utils/formatters";

export default function ScheduleOperationDetail({ items = [] }) {
  return (
    <details className="panel detail-disclosure">
      <summary>
        <div>
          <h3 className="panel-title">查看工序明细</h3>
          <p className="panel-subtitle">默认收起；需要核对零件、资源和时间窗口时再展开。</p>
        </div>
        <span className="button small ghost">展开</span>
      </summary>
      {items.length ? (
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
                <tr key={item.id} className={item.locked ? "row-locked" : ""}>
                  <td>
                    <p className="data-primary">
                      {item.order_no}
                      {item.locked ? <StatusBadge tone="info">锁</StatusBadge> : null}
                    </p>
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
                  <td>{formatHours(item.scheduled_duration_hours ?? getDurationHours(item.start_time, item.end_time))}</td>
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
      ) : (
        <div className="empty-state">
          <h3 className="empty-state-title">暂无工序明细</h3>
          <p className="empty-state-copy">当前方案没有可展示的工序级排产数据。</p>
        </div>
      )}
    </details>
  );
}

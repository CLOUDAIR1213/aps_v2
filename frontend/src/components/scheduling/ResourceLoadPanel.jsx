import StatusBadge from "../StatusBadge";
import { formatPercent } from "../../utils/formatters";

function statusLabel(status) {
  if (status === "bottleneck") {
    return "瓶颈";
  }
  if (status === "idle") {
    return "空闲较多";
  }
  return "正常";
}

function statusTone(status) {
  if (status === "bottleneck") {
    return "danger";
  }
  if (status === "idle") {
    return "warning";
  }
  return "success";
}

export default function ResourceLoadPanel({ resources = [] }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">资源负荷概览</h3>
          <p className="panel-subtitle">放在订单表后面，辅助判断瓶颈资源，不抢首屏。</p>
        </div>
      </div>
      <div className="resource-load-list compact-resource-load">
        {resources.map((resource) => (
          <div className="resource-load-row" key={`${resource.work_center_id}-${resource.machine_id || "external"}`}>
            <div className="resource-load-head">
              <div>
                <p className="data-primary">{resource.work_center_name}</p>
                <p className="data-secondary">{resource.machine_name}</p>
              </div>
              <StatusBadge tone={statusTone(resource.status)}>{statusLabel(resource.status)}</StatusBadge>
            </div>
            <div className="load-bar">
              <span style={{ width: `${Math.min(resource.utilization * 100, 100)}%` }} />
            </div>
            <p className="data-secondary">
              {`${formatPercent(resource.utilization * 100)} / ${resource.busy_minutes} 分钟占用 / ${resource.available_minutes} 分钟可用`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

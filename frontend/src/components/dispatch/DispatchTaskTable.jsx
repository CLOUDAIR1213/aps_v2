import StatusBadge from "../StatusBadge";
import { formatDateTime, formatHours } from "../../utils/formatters";

function minutesToHours(minutes) {
  return formatHours((Number(minutes) || 0) / 60);
}

function allocationText(allocations) {
  if (!allocations?.length) {
    return "未派工";
  }
  return allocations
    .map((allocation) => `${allocation.person_name} ${allocation.ratio_percent}%`)
    .join(" / ");
}

function getAllocationStatusLabel(status) {
  if (status === "assigned") {
    return "已派工";
  }
  if (status === "partial") {
    return "待补足";
  }
  return "未派工";
}

export default function DispatchTaskTable({
  dispatch,
  loading,
  onSelectTask,
  selectedTaskId,
  tasks = [],
}) {
  return (
    <div className="panel dispatch-task-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">任务列表</h3>
          <p className="panel-subtitle">未派工任务优先；保存后自动切到下一条未派工任务。</p>
        </div>
      </div>
      {loading ? (
        <div className="alert info">正在加载派工任务。</div>
      ) : !dispatch ? (
        <div className="empty-state">
          <h3 className="empty-state-title">暂无排产方案</h3>
          <p className="empty-state-copy">请先执行生产排产。</p>
        </div>
      ) : (
        <div className="table-shell dispatch-task-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>任务</th>
                <th>资源</th>
                <th>计划时间</th>
                <th>工时</th>
                <th>派工</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.schedule_item_id}
                  className={selectedTaskId === task.schedule_item_id ? "selected-row" : ""}
                  onClick={() => onSelectTask(task.schedule_item_id)}
                >
                  <td>
                    <p className="data-primary">{task.order_no} / {task.operation_name}</p>
                    <p className="data-secondary">{task.drawing_no} / {task.part_name}</p>
                    {task.requirement_note ? (
                      <StatusBadge tone="warning" title={task.requirement_note}>
                        加工要求
                      </StatusBadge>
                    ) : null}
                  </td>
                  <td>
                    <p className="data-primary">{task.work_center_name}</p>
                    <p className="data-secondary">{task.machine_name || "外协"}</p>
                  </td>
                  <td>
                    <p className="data-primary">{formatDateTime(task.planned_start)}</p>
                    <p className="data-secondary">{formatDateTime(task.planned_end)}</p>
                  </td>
                  <td>{minutesToHours(task.planned_minutes)}</td>
                  <td>
                    <StatusBadge tone={task.allocation_status === "assigned" ? "success" : "warning"}>
                      {getAllocationStatusLabel(task.allocation_status)}
                    </StatusBadge>
                    <p className="data-secondary">{allocationText(task.allocations)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { allocationText };

import StatusBadge from "../StatusBadge";
import { formatDateTime, formatHours } from "../../utils/formatters";
import { allocationText } from "./DispatchTaskTable";

function minutesToHours(minutes) {
  return formatHours((Number(minutes) || 0) / 60);
}

function getStatusLabel(status) {
  if (status === "assigned") {
    return "已派工";
  }
  if (status === "partial") {
    return "待补足";
  }
  return "未派工";
}

function getGroupStatus(group) {
  if (group.assignedCount === group.taskCount) {
    return "assigned";
  }
  if (group.unassignedCount === group.taskCount) {
    return "unassigned";
  }
  return "partial";
}

export default function OperationSummaryDispatchTable({
  dispatch,
  expandedGroupKeys = [],
  groups = [],
  loading,
  onClearSelection,
  onSelectFiltered,
  onSelectTask,
  onToggleGroup,
  onToggleTask,
  onToggleGroupSelection,
  selectedTaskIds = [],
}) {
  const expandedSet = new Set(expandedGroupKeys);
  const selectedSet = new Set(selectedTaskIds);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">按工序汇总</h3>
          <p className="panel-subtitle">仅用于批量派工操作，保存后仍回写到每条原始任务。</p>
        </div>
        <div className="panel-actions">
          <button className="button ghost compact-button" type="button" onClick={onSelectFiltered} disabled={!groups.length}>
            选择当前筛选
          </button>
          <button className="button ghost compact-button" type="button" onClick={onClearSelection} disabled={!selectedTaskIds.length}>
            清空选择
          </button>
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
        <div className="operation-summary-list">
          {groups.map((group) => {
            const groupStatus = getGroupStatus(group);
            const groupSelected = group.tasks.every((task) => selectedSet.has(task.schedule_item_id));
            const groupPartial = !groupSelected && group.tasks.some((task) => selectedSet.has(task.schedule_item_id));
            const expanded = expandedSet.has(group.key);
            return (
              <div className="operation-summary-group" key={group.key}>
                <div className="operation-summary-head">
                  <label className="check-cell">
                    <input
                      checked={groupSelected}
                      type="checkbox"
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = groupPartial;
                        }
                      }}
                      onChange={() => onToggleGroupSelection(group)}
                    />
                  </label>
                  <button className="link-button summary-title-button" type="button" onClick={() => onToggleGroup(group.key)}>
                    <span className="data-primary">{group.workCenterName} / {group.operationName}</span>
                    <span className="data-secondary">{expanded ? "收起原始任务" : "展开原始任务"}</span>
                  </button>
                  <div className="summary-stat">
                    <span>任务数</span>
                    <strong>{group.taskCount}</strong>
                  </div>
                  <div className="summary-stat">
                    <span>总工时</span>
                    <strong>{minutesToHours(group.totalMinutes)}</strong>
                  </div>
                  <div className="summary-stat">
                    <span>涉及订单</span>
                    <strong>{group.orderCount}</strong>
                  </div>
                  <div className="summary-stat">
                    <span>未派/待补/已派</span>
                    <strong>{group.unassignedCount}/{group.partialCount}/{group.assignedCount}</strong>
                  </div>
                  <StatusBadge tone={groupStatus === "assigned" ? "success" : "warning"}>
                    {getStatusLabel(groupStatus)}
                  </StatusBadge>
                </div>
                {expanded ? (
                  <div className="table-shell operation-summary-task-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>选择</th>
                          <th>任务</th>
                          <th>计划时间</th>
                          <th>工时</th>
                          <th>派工</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((task) => (
                          <tr key={task.schedule_item_id} onClick={() => onSelectTask(task.schedule_item_id)}>
                            <td onClick={(event) => event.stopPropagation()}>
                              <input
                                checked={selectedSet.has(task.schedule_item_id)}
                                type="checkbox"
                                onChange={() => onToggleTask(task.schedule_item_id)}
                              />
                            </td>
                            <td>
                              <p className="data-primary">{task.order_no} / {task.part_name}</p>
                              <p className="data-secondary">{task.drawing_no} / {task.part_no}</p>
                            </td>
                            <td>
                              <p className="data-primary">{formatDateTime(task.planned_start)}</p>
                              <p className="data-secondary">{formatDateTime(task.planned_end)}</p>
                            </td>
                            <td>{minutesToHours(task.planned_minutes)}</td>
                            <td>
                              <StatusBadge tone={task.allocation_status === "assigned" ? "success" : "warning"}>
                                {getStatusLabel(task.allocation_status)}
                              </StatusBadge>
                              <p className="data-secondary">{allocationText(task.allocations)}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!groups.length ? (
            <div className="alert info">当前筛选条件下没有可汇总的派工任务。</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

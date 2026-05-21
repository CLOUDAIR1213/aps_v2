import { Fragment } from "react";

import { formatHours } from "../../utils/formatters";

function minutesToHours(minutes) {
  return formatHours((Number(minutes) || 0) / 60);
}

export default function PersonnelWorkloadTable({
  expandedPersonId,
  onTogglePerson,
  workload = [],
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">人员工时汇总</h3>
          <p className="panel-subtitle">按当前方案汇总人员任务数、计划工时和任务明细。</p>
        </div>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>人员</th>
              <th>任务数</th>
              <th>计划工时</th>
              <th>订单</th>
              <th>工段</th>
              <th>明细</th>
            </tr>
          </thead>
          <tbody>
            {workload.map((row) => (
              <Fragment key={row.person_id}>
                <tr>
                  <td>
                    <p className="data-primary">{row.person_name}</p>
                    <p className="data-secondary">{row.employee_no}</p>
                  </td>
                  <td>{row.task_count}</td>
                  <td>{minutesToHours(row.planned_minutes)}</td>
                  <td>{row.order_count}</td>
                  <td>{row.work_center_count}</td>
                  <td>
                    <button
                      className="button ghost compact-button"
                      type="button"
                      onClick={() => onTogglePerson(expandedPersonId === row.person_id ? null : row.person_id)}
                    >
                      {expandedPersonId === row.person_id ? "收起" : "展开"}
                    </button>
                  </td>
                </tr>
                {expandedPersonId === row.person_id ? (
                  <tr key={`${row.person_id}-tasks`} className="workload-detail-row">
                    <td colSpan="6">
                      <div className="workload-task-list">
                        {row.tasks.map((task) => (
                          <div className="workload-task" key={task.schedule_item_id}>
                            <span>{task.order_no}</span>
                            <strong>{task.operation_name}</strong>
                            <span>{task.work_center_name}</span>
                            <span>{task.ratio_percent}% / {minutesToHours(task.planned_minutes)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

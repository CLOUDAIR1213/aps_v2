import {
  formatClock,
  formatDateTime,
  formatHours,
  formatPercent,
  getDurationHours
} from "../utils/formatters";

const ganttColors = ["#205c52", "#2d5d8c", "#a26813", "#9a4f39", "#5f6bb0"];

export default function GanttChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">
          {"\u6682\u65e0\u7518\u7279\u56fe\u6570\u636e"}
        </h3>
        <p className="empty-state-copy">
          {"当前没有可用的排产结果。"}
        </p>
      </div>
    );
  }

  const allTasks = data.flatMap((machine) => machine.tasks);
  const timestamps = allTasks.flatMap((task) => [
    new Date(task.start_time).getTime(),
    new Date(task.end_time).getTime()
  ]);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const totalDuration = Math.max(maxTime - minTime, 1);
  const tickCount = 7;
  const horizonHours = Math.max(totalDuration / 3600000, 0.01);
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const point = minTime + (totalDuration / (tickCount - 1)) * index;
    return {
      label: formatDateTime(point),
      offset: (index / (tickCount - 1)) * 100
    };
  });

  return (
    <div className="table-shell" style={{ padding: "18px" }}>
      <div className="timeline-shell" style={{ "--tick-count": tickCount }}>
        <div className="timeline-scale">
          {ticks.map((tick) => (
            <div key={tick.label} className="timeline-scale-label">
              {tick.label}
            </div>
          ))}
        </div>

        {data.map((machine, machineIndex) => {
          const laneKey = machine.resource_key || machine.person_id || machine.machine_id || `${machine.work_center_id}-${machineIndex}`;
          const resourceName = machine.person_name || machine.machine_name || machine.work_center_name || machine.machine_code || "--";
          const resourceCode = machine.person_id ? machine.work_center_name : (machine.machine_code || (machine.is_external ? "外协" : "--"));
          const machineHours = machine.tasks.reduce(
            (sum, task) => sum + Number(task.scheduled_duration_hours ?? getDurationHours(task.start_time, task.end_time)),
            0
          );

          return (
            <div key={laneKey} className="machine-lane">
              <div className="machine-meta">
                <div>
                  <h3 className="machine-name">
                    {resourceName}
                  </h3>
                  <p className="machine-code">{resourceCode}</p>
                </div>
                <p className="machine-stat">
                  {`任务 ${machine.tasks.length} / 占用 ${formatHours(machineHours)}`}
                </p>
                <p className="machine-stat">
                  {`利用率 ${formatPercent((machineHours / horizonHours) * 100)}`}
                </p>
              </div>

              <div className="gantt-lane">
                {ticks.slice(1, ticks.length - 1).map((tick) => (
                  <span
                    key={`${laneKey}-${tick.offset}`}
                    className="gantt-gridline"
                    style={{ left: `${tick.offset}%` }}
                  />
                ))}

                {machine.tasks.map((task, taskIndex) => {
                  const start = new Date(task.start_time).getTime();
                  const end = new Date(task.end_time).getTime();
                  const left = ((start - minTime) / totalDuration) * 100;
                  const width = Math.max(((end - start) / totalDuration) * 100, 8);
                  const color = ganttColors[(machineIndex + taskIndex) % ganttColors.length];

                  return (
                    <div
                      key={task.schedule_item_id}
                      className="gantt-bar"
                      title={`${task.order_no} ${task.task_name}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                      }}
                    >
                      <p className="gantt-bar-title">{`${task.order_no} / ${task.drawing_no || ""}`}</p>
                      <p className="gantt-bar-meta">
                        {`${task.task_name} / ${formatClock(task.start_time)}-${formatClock(
                          task.end_time
                        )}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="legend-list">
          {allTasks.map((task, index) => (
            <div key={`${task.schedule_item_id}-legend`} className="legend-row">
              <span
                className="legend-color"
                style={{ backgroundColor: ganttColors[index % ganttColors.length] }}
              />
              <div>
                <div className="data-primary">
                  {`${task.order_no} / ${task.drawing_no || task.part_no || ""} / ${task.task_name}`}
                </div>
                <div className="data-secondary">
                  {`${formatDateTime(task.start_time)} - ${formatDateTime(task.end_time)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GanttChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "24px",
          border: "1px solid rgba(20, 33, 29, 0.08)",
          borderRadius: "22px",
          backgroundColor: "#f7f9f8",
          color: "#5e6d66"
        }}
      >
        暂无甘特图数据。
      </div>
    );
  }

  const allTasks = data.flatMap((machine) => machine.tasks);
  const allTimes = allTasks.flatMap((task) => [
    new Date(task.start_time).getTime(),
    new Date(task.end_time).getTime()
  ]);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const totalDuration = Math.max(maxTime - minTime, 1);
  const taskColors = ["#1f5f52", "#295f8f", "#7a6a26", "#7d557d"];

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {data.map((machine, machineIndex) => (
        <div
          key={machine.machine_id}
          style={{
            border: "1px solid rgba(20, 33, 29, 0.08)",
            borderRadius: "24px",
            padding: "22px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,251,250,0.92) 100%)",
            boxShadow: "0 18px 36px rgba(20, 33, 29, 0.05)"
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <strong style={{ fontSize: "18px" }}>
              {machine.machine_name || machine.machine_code}
            </strong>
            <div style={{ color: "#667085", fontSize: "13px", marginTop: "4px" }}>
              {machine.machine_code || "未配置设备编码"}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              height: "86px",
              background:
                "linear-gradient(to right, #f8faf9 0%, #f8faf9 50%, #eef2ef 50%, #eef2ef 100%)",
              backgroundSize: "54px 100%",
              borderRadius: "18px",
              overflow: "hidden",
              border: "1px solid #e5ece8"
            }}
          >
            {machine.tasks.map((task, taskIndex) => {
              const start = new Date(task.start_time).getTime();
              const end = new Date(task.end_time).getTime();
              const left = ((start - minTime) / totalDuration) * 100;
              const width = Math.max(((end - start) / totalDuration) * 100, 8);
              const color = taskColors[(machineIndex + taskIndex) % taskColors.length];

              return (
                <div
                  key={task.schedule_item_id}
                  title={`${task.order_no} ${task.task_name}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: "16px",
                    width: `${width}%`,
                    minWidth: "90px",
                    height: "52px",
                    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                    color: "#ffffff",
                    borderRadius: "14px",
                    padding: "8px 12px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    boxShadow: "0 10px 24px rgba(20, 33, 29, 0.16)"
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {task.order_no}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {task.task_name}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
            {machine.tasks.map((task) => (
              <div
                key={`${task.schedule_item_id}-meta`}
                style={{
                  fontSize: "13px",
                  color: "#475467",
                  padding: "10px 12px",
                  backgroundColor: "#f8faf9",
                  borderRadius: "14px"
                }}
              >
                {task.order_no} / {task.task_name} / {task.start_time} 至 {task.end_time}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

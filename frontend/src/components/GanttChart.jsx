export default function GanttChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #d7dbe2",
          borderRadius: "12px",
          backgroundColor: "#fafbfc"
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

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {data.map((machine) => (
        <div
          key={machine.machine_id}
          style={{
            border: "1px solid #d7dbe2",
            borderRadius: "14px",
            padding: "16px",
            backgroundColor: "#ffffff"
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <strong>{machine.machine_name || machine.machine_code}</strong>
            <div style={{ color: "#667085", fontSize: "13px" }}>
              {machine.machine_code || "未配置机器编码"}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              height: "72px",
              background:
                "linear-gradient(to right, #f8fafc 0%, #f8fafc 50%, #eef2f6 50%, #eef2f6 100%)",
              backgroundSize: "48px 100%",
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid #edf1f5"
            }}
          >
            {machine.tasks.map((task) => {
              const start = new Date(task.start_time).getTime();
              const end = new Date(task.end_time).getTime();
              const left = ((start - minTime) / totalDuration) * 100;
              const width = Math.max(((end - start) / totalDuration) * 100, 8);

              return (
                <div
                  key={task.schedule_item_id}
                  title={`${task.order_no} ${task.task_name}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: "14px",
                    width: `${width}%`,
                    minWidth: "90px",
                    height: "44px",
                    backgroundColor: "#1d4ed8",
                    color: "#ffffff",
                    borderRadius: "10px",
                    padding: "6px 10px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    boxShadow: "0 6px 18px rgba(29, 78, 216, 0.18)"
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
                  padding: "8px 10px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px"
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

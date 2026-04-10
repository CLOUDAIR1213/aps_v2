export default function ScheduleTable({ items = [] }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #d7dbe2",
          borderRadius: "12px",
          backgroundColor: "#fafbfc"
        }}
      >
        暂无排产结果。
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "#ffffff",
          border: "1px solid #d7dbe2",
          borderRadius: "12px",
          overflow: "hidden"
        }}
      >
        <thead style={{ backgroundColor: "#f3f5f7" }}>
          <tr>
            <th style={cellStyle}>订单号</th>
            <th style={cellStyle}>任务名称</th>
            <th style={cellStyle}>设备</th>
            <th style={cellStyle}>开始时间</th>
            <th style={cellStyle}>结束时间</th>
            <th style={cellStyle}>设备顺序号</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={cellStyle}>{item.order_no || "-"}</td>
              <td style={cellStyle}>{item.task_name || "-"}</td>
              <td style={cellStyle}>{item.machine_name || item.machine_code || "-"}</td>
              <td style={cellStyle}>{item.start_time}</td>
              <td style={cellStyle}>{item.end_time}</td>
              <td style={cellStyle}>{item.sequence_on_machine}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle = {
  borderBottom: "1px solid #e6eaf0",
  padding: "12px",
  textAlign: "left",
  fontSize: "14px"
};

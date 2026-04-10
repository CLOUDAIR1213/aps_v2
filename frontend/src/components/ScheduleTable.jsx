export default function ScheduleTable({ items = [] }) {
  if (items.length === 0) {
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
          border: "1px solid rgba(20, 33, 29, 0.08)",
          borderRadius: "24px",
          overflow: "hidden"
        }}
      >
        <thead style={{ backgroundColor: "#f2f5f3" }}>
          <tr>
            <th style={headCellStyle}>订单号</th>
            <th style={headCellStyle}>任务名称</th>
            <th style={headCellStyle}>设备</th>
            <th style={headCellStyle}>开始时间</th>
            <th style={headCellStyle}>结束时间</th>
            <th style={headCellStyle}>设备顺序号</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "#fbfcfb"
              }}
            >
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

const headCellStyle = {
  borderBottom: "1px solid #e8eeea",
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "13px",
  color: "#52615a",
  fontWeight: 600
};

const cellStyle = {
  borderBottom: "1px solid #edf1ee",
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "14px"
};

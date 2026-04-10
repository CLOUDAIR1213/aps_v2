const machineTypeMap = {
  CNC: "数控机床",
  DRILL: "钻床"
};

const machineStatusMap = {
  idle: "空闲",
  busy: "忙碌",
  offline: "停机",
  maintenance: "维护中"
};

export default function MachineTable({ machines = [] }) {
  if (machines.length === 0) {
    return <div style={emptyStyle}>暂无设备数据。</div>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f2f5f3" }}>
          <tr>
            <th style={headCellStyle}>编号</th>
            <th style={headCellStyle}>编码</th>
            <th style={headCellStyle}>名称</th>
            <th style={headCellStyle}>类型</th>
            <th style={headCellStyle}>状态</th>
            <th style={headCellStyle}>日产能</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((machine, index) => (
            <tr
              key={machine.id}
              style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "#fbfcfb"
              }}
            >
              <td style={cellStyle}>{machine.id}</td>
              <td style={cellStyle}>{machine.code}</td>
              <td style={cellStyle}>{machine.name}</td>
              <td style={cellStyle}>{machineTypeMap[machine.type] || machine.type}</td>
              <td style={cellStyle}>{machineStatusMap[machine.status] || machine.status}</td>
              <td style={cellStyle}>{machine.capacity_per_day}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableWrapStyle = {
  overflowX: "auto",
  border: "1px solid rgba(20, 33, 29, 0.08)",
  borderRadius: "24px",
  backgroundColor: "#ffffff",
  boxShadow: "0 18px 36px rgba(20, 33, 29, 0.05)"
};

const headCellStyle = {
  textAlign: "left",
  padding: "14px 16px",
  color: "#52615a",
  fontSize: "13px",
  fontWeight: 600,
  borderBottom: "1px solid #e8eeea"
};

const cellStyle = {
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: "1px solid #edf1ee"
};

const emptyStyle = {
  padding: "24px",
  border: "1px solid rgba(20, 33, 29, 0.08)",
  borderRadius: "22px",
  backgroundColor: "#f7f9f8",
  color: "#5e6d66"
};

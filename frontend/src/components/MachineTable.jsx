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
    return <p>暂无设备数据。</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={cellStyle}>编号</th>
          <th style={cellStyle}>编码</th>
          <th style={cellStyle}>名称</th>
          <th style={cellStyle}>类型</th>
          <th style={cellStyle}>状态</th>
          <th style={cellStyle}>日产能</th>
        </tr>
      </thead>
      <tbody>
        {machines.map((machine) => (
          <tr key={machine.id}>
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
  );
}

const cellStyle = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e7eb"
};

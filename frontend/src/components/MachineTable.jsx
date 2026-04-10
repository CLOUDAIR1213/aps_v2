export default function MachineTable({ machines = [] }) {
  if (machines.length === 0) {
    return <p>No machine data yet.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={cellStyle}>ID</th>
          <th style={cellStyle}>Code</th>
          <th style={cellStyle}>Name</th>
          <th style={cellStyle}>Type</th>
          <th style={cellStyle}>Status</th>
          <th style={cellStyle}>Capacity/Day</th>
        </tr>
      </thead>
      <tbody>
        {machines.map((machine) => (
          <tr key={machine.id}>
            <td style={cellStyle}>{machine.id}</td>
            <td style={cellStyle}>{machine.code}</td>
            <td style={cellStyle}>{machine.name}</td>
            <td style={cellStyle}>{machine.type}</td>
            <td style={cellStyle}>{machine.status}</td>
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

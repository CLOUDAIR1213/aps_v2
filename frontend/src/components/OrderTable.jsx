export default function OrderTable({ orders = [] }) {
  if (orders.length === 0) {
    return <p>No order data yet.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={cellStyle}>ID</th>
          <th style={cellStyle}>Order No</th>
          <th style={cellStyle}>Product</th>
          <th style={cellStyle}>Quantity</th>
          <th style={cellStyle}>Priority</th>
          <th style={cellStyle}>Due Date</th>
          <th style={cellStyle}>Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td style={cellStyle}>{order.id}</td>
            <td style={cellStyle}>{order.order_no}</td>
            <td style={cellStyle}>{order.product_name}</td>
            <td style={cellStyle}>{order.quantity}</td>
            <td style={cellStyle}>{order.priority}</td>
            <td style={cellStyle}>{order.due_date}</td>
            <td style={cellStyle}>{order.status}</td>
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

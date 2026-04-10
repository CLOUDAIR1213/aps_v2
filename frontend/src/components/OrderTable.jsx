const orderStatusMap = {
  pending: "待排产",
  scheduled: "已排产",
  completed: "已完成",
  cancelled: "已取消"
};

export default function OrderTable({ orders = [] }) {
  if (orders.length === 0) {
    return <p>暂无订单数据。</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={cellStyle}>编号</th>
          <th style={cellStyle}>订单号</th>
          <th style={cellStyle}>产品名称</th>
          <th style={cellStyle}>数量</th>
          <th style={cellStyle}>优先级</th>
          <th style={cellStyle}>交期</th>
          <th style={cellStyle}>状态</th>
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
            <td style={cellStyle}>{orderStatusMap[order.status] || order.status}</td>
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

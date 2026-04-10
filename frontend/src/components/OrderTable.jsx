const orderStatusMap = {
  pending: "待排产",
  scheduled: "已排产",
  completed: "已完成",
  cancelled: "已取消"
};

export default function OrderTable({ orders = [] }) {
  if (orders.length === 0) {
    return <div style={emptyStyle}>暂无订单数据。</div>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f2f5f3" }}>
          <tr>
            <th style={headCellStyle}>编号</th>
            <th style={headCellStyle}>订单号</th>
            <th style={headCellStyle}>产品名称</th>
            <th style={headCellStyle}>数量</th>
            <th style={headCellStyle}>优先级</th>
            <th style={headCellStyle}>交期</th>
            <th style={headCellStyle}>状态</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr
              key={order.id}
              style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "#fbfcfb"
              }}
            >
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

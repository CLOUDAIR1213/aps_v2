export default function RoutingForm({
  orders,
  machines,
  selectedOrderId,
  onSelectedOrderChange,
  routingName,
  onRoutingNameChange,
  onCreateRouting,
  routings,
  selectedRoutingId,
  onSelectedRoutingChange,
  operationForm,
  onOperationFormChange,
  onCreateOperation,
  operations,
  loading
}) {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={cardStyle}>
        <h3 style={titleStyle}>新增工艺路线</h3>
        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>订单</span>
            <select
              value={selectedOrderId}
              onChange={(event) => onSelectedOrderChange(event.target.value)}
              style={inputStyle}
            >
              <option value="">请选择订单</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_no}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>工艺路线名称</span>
            <input
              value={routingName}
              onChange={(event) => onRoutingNameChange(event.target.value)}
              placeholder="例如：主工艺路线"
              style={inputStyle}
            />
          </label>
        </div>

        <button type="button" onClick={onCreateRouting} disabled={loading} style={buttonStyle}>
          {loading ? "提交中..." : "新增工艺路线"}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={titleStyle}>新增工序</h3>
        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>工艺路线</span>
            <select
              value={selectedRoutingId}
              onChange={(event) => onSelectedRoutingChange(event.target.value)}
              style={inputStyle}
            >
              <option value="">请选择工艺路线</option>
              {routings.map((routing) => (
                <option key={routing.id} value={routing.id}>
                  {routing.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>工序顺序</span>
            <input
              type="number"
              value={operationForm.seq_no}
              onChange={(event) => onOperationFormChange("seq_no", event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>工序名称</span>
            <input
              value={operationForm.operation_name}
              onChange={(event) => onOperationFormChange("operation_name", event.target.value)}
              placeholder="例如：粗加工"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>设备</span>
            <select
              value={operationForm.machine_id}
              onChange={(event) => onOperationFormChange("machine_id", event.target.value)}
              style={inputStyle}
            >
              <option value="">请选择设备</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.code} / {machine.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>单件工时</span>
            <input
              type="number"
              step="0.1"
              value={operationForm.process_time}
              onChange={(event) => onOperationFormChange("process_time", event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>准备工时</span>
            <input
              type="number"
              step="0.1"
              value={operationForm.setup_time}
              onChange={(event) => onOperationFormChange("setup_time", event.target.value)}
              style={inputStyle}
            />
          </label>
        </div>

        <button type="button" onClick={onCreateOperation} disabled={loading} style={buttonStyle}>
          {loading ? "提交中..." : "新增工序"}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={titleStyle}>当前工艺路线</h3>
        {routings.length === 0 ? <p style={{ margin: 0, color: "#5e6d66" }}>当前订单暂无工艺路线。</p> : null}
        {routings.map((routing) => (
          <div key={routing.id} style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}>
              {routing.name}
            </div>
            <div style={{ color: "#667085", fontSize: "13px", marginBottom: "10px" }}>
              工艺路线编号：{routing.id}
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              {operations
                .filter((operation) => operation.routing_id === routing.id)
                .map((operation) => (
                  <div
                    key={operation.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "16px",
                      backgroundColor: "#f8faf9",
                      fontSize: "14px",
                      color: "#31443c",
                      border: "1px solid #e6ece8"
                    }}
                  >
                    顺序 {operation.seq_no} / {operation.operation_name} / 设备 {operation.machine_id}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  border: "1px solid rgba(20, 33, 29, 0.08)",
  borderRadius: "24px",
  padding: "22px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,251,250,0.92) 100%)",
  boxShadow: "0 18px 40px rgba(20, 33, 29, 0.05)"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "16px"
};

const labelStyle = {
  display: "grid",
  gap: "8px",
  fontSize: "14px",
  color: "#31443c",
  fontWeight: 500
};

const inputStyle = {
  padding: "13px 14px",
  borderRadius: "16px",
  border: "1px solid #d3ddd7",
  backgroundColor: "#f8faf9",
  color: "#14211d",
  outline: "none"
};

const buttonStyle = {
  border: "none",
  borderRadius: "16px",
  padding: "12px 18px",
  background:
    "linear-gradient(135deg, #1f5f52 0%, #2f7a6b 100%)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 14px 26px rgba(31, 95, 82, 0.18)"
};

const titleStyle = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "20px",
  letterSpacing: "-0.02em"
};

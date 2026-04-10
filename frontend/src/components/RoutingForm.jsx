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
        <h3 style={{ marginTop: 0 }}>新增工艺路线</h3>
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
        <h3 style={{ marginTop: 0 }}>新增工序</h3>
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
            <span>机器</span>
            <select
              value={operationForm.machine_id}
              onChange={(event) => onOperationFormChange("machine_id", event.target.value)}
              style={inputStyle}
            >
              <option value="">请选择机器</option>
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
        <h3 style={{ marginTop: 0 }}>当前工艺路线</h3>
        {routings.length === 0 ? <p>当前订单暂无工艺路线。</p> : null}
        {routings.map((routing) => (
          <div key={routing.id} style={{ marginBottom: "14px" }}>
            <div style={{ fontWeight: 600 }}>{routing.name}</div>
            <div style={{ color: "#667085", fontSize: "13px", marginBottom: "8px" }}>
              工艺路线 ID：{routing.id}
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              {operations
                .filter((operation) => operation.routing_id === routing.id)
                .map((operation) => (
                  <div
                    key={operation.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#f8fafc",
                      fontSize: "14px"
                    }}
                  >
                    顺序 {operation.seq_no} / {operation.operation_name} / 机器 {operation.machine_id}
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
  border: "1px solid #d7dbe2",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#ffffff"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  marginBottom: "12px"
};

const labelStyle = {
  display: "grid",
  gap: "6px",
  fontSize: "14px"
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d0d5dd"
};

const buttonStyle = {
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  backgroundColor: "#1d4ed8",
  color: "#ffffff",
  cursor: "pointer"
};

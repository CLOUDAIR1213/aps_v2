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
        <h3 style={{ marginTop: 0 }}>Create Routing</h3>
        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>Order</span>
            <select
              value={selectedOrderId}
              onChange={(event) => onSelectedOrderChange(event.target.value)}
              style={inputStyle}
            >
              <option value="">Select order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_no}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Routing Name</span>
            <input
              value={routingName}
              onChange={(event) => onRoutingNameChange(event.target.value)}
              placeholder="Main Routing"
              style={inputStyle}
            />
          </label>
        </div>

        <button type="button" onClick={onCreateRouting} disabled={loading} style={buttonStyle}>
          {loading ? "Submitting..." : "Create Routing"}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Create Operation</h3>
        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>Routing</span>
            <select
              value={selectedRoutingId}
              onChange={(event) => onSelectedRoutingChange(event.target.value)}
              style={inputStyle}
            >
              <option value="">Select routing</option>
              {routings.map((routing) => (
                <option key={routing.id} value={routing.id}>
                  {routing.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Sequence No</span>
            <input
              type="number"
              value={operationForm.seq_no}
              onChange={(event) => onOperationFormChange("seq_no", event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Operation Name</span>
            <input
              value={operationForm.operation_name}
              onChange={(event) => onOperationFormChange("operation_name", event.target.value)}
              placeholder="Rough Cutting"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Machine</span>
            <select
              value={operationForm.machine_id}
              onChange={(event) => onOperationFormChange("machine_id", event.target.value)}
              style={inputStyle}
            >
              <option value="">Select machine</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.code} / {machine.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Unit Process Time</span>
            <input
              type="number"
              step="0.1"
              value={operationForm.process_time}
              onChange={(event) => onOperationFormChange("process_time", event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Setup Time</span>
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
          {loading ? "Submitting..." : "Create Operation"}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Current Routings</h3>
        {routings.length === 0 ? <p>No routings for this order yet.</p> : null}
        {routings.map((routing) => (
          <div key={routing.id} style={{ marginBottom: "14px" }}>
            <div style={{ fontWeight: 600 }}>{routing.name}</div>
            <div style={{ color: "#667085", fontSize: "13px", marginBottom: "8px" }}>
              Routing ID: {routing.id}
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
                    Seq {operation.seq_no} / {operation.operation_name} / Machine {operation.machine_id}
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

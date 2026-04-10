import { useEffect, useState } from "react";

import { createOrder, getOrders } from "../api/order";
import OrderTable from "../components/OrderTable";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    order_no: "",
    product_name: "",
    quantity: 1,
    priority: 0,
    due_date: "",
    status: "pending"
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders();
      setOrders(data);
      setError("");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createOrder({
        ...form,
        quantity: Number(form.quantity),
        priority: Number(form.priority),
        due_date: new Date(form.due_date).toISOString()
      });
      setForm({
        order_no: "",
        product_name: "",
        quantity: 1,
        priority: 0,
        due_date: "",
        status: "pending"
      });
      setMessage("Order created successfully.");
      await loadOrders();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to create order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <h1>Orders</h1>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={gridStyle}>
          <input
            placeholder="Order No"
            value={form.order_no}
            onChange={(event) => setForm({ ...form, order_no: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="Product Name"
            value={form.product_name}
            onChange={(event) => setForm({ ...form, product_name: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Priority"
            value={form.priority}
            onChange={(event) => setForm({ ...form, priority: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="datetime-local"
            value={form.due_date}
            onChange={(event) => setForm({ ...form, due_date: event.target.value })}
            style={inputStyle}
            required
          />
        </div>
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Submitting..." : "Create Order"}
        </button>
      </form>
      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      {loading ? <p>Loading...</p> : null}
      <OrderTable orders={orders} />
    </section>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginBottom: "12px"
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

const successStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#ecfdf3",
  border: "1px solid #abefc6",
  color: "#027a48"
};

const errorStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#fef3f2",
  border: "1px solid #fecdca",
  color: "#b42318"
};

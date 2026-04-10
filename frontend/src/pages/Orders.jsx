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
        requestError?.response?.data?.detail || "订单数据加载失败。"
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
      setMessage("订单新增成功。");
      await loadOrders();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "订单新增失败。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "22px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          订单管理
        </h1>
        <p style={{ margin: 0, color: "#5e6d66", lineHeight: 1.7 }}>
          管理订单基础信息、优先级与交付时间。
        </p>
      </div>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={gridStyle}>
          <input
            placeholder="订单号"
            value={form.order_no}
            onChange={(event) => setForm({ ...form, order_no: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="产品名称"
            value={form.product_name}
            onChange={(event) => setForm({ ...form, product_name: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="数量"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="优先级"
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
          {submitting ? "提交中..." : "新增订单"}
        </button>
      </form>
      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      {loading ? <p>加载中...</p> : null}
      <OrderTable orders={orders} />
    </section>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "16px"
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

const successStyle = {
  padding: "14px 16px",
  borderRadius: "18px",
  backgroundColor: "#eef9f2",
  border: "1px solid #bfe4cb",
  color: "#1f6b45"
};

const errorStyle = {
  padding: "14px 16px",
  borderRadius: "18px",
  backgroundColor: "#fff4f2",
  border: "1px solid #f3c7c0",
  color: "#b42318"
};

import { useEffect, useState } from "react";

import MachineTable from "../components/MachineTable";
import { createMachine, getMachines } from "../api/machine";

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "CNC",
    status: "idle",
    capacity_per_day: 480
  });

  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await getMachines();
      setMachines(data);
      setError("");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "设备数据加载失败。"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createMachine({
        ...form,
        capacity_per_day: Number(form.capacity_per_day)
      });
      setForm({
        code: "",
        name: "",
        type: "CNC",
        status: "idle",
        capacity_per_day: 480
      });
      setMessage("设备新增成功。");
      await loadMachines();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "设备新增失败。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "22px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          设备管理
        </h1>
        <p style={{ margin: 0, color: "#5e6d66", lineHeight: 1.7 }}>
          统一维护设备基础信息与产能配置。
        </p>
      </div>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={gridStyle}>
          <input
            placeholder="设备编码"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="设备名称"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="类型"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="日产能"
            value={form.capacity_per_day}
            onChange={(event) =>
              setForm({ ...form, capacity_per_day: event.target.value })
            }
            style={inputStyle}
            required
          />
        </div>
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "提交中..." : "新增设备"}
        </button>
      </form>
      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      {loading ? <p>加载中...</p> : null}
      <MachineTable machines={machines} />
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

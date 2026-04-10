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
        requestError?.response?.data?.detail || "Failed to load machines."
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
      setMessage("Machine created successfully.");
      await loadMachines();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to create machine."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <h1>Machines</h1>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={gridStyle}>
          <input
            placeholder="Machine Code"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="Machine Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="Type"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Capacity Per Day"
            value={form.capacity_per_day}
            onChange={(event) =>
              setForm({ ...form, capacity_per_day: event.target.value })
            }
            style={inputStyle}
            required
          />
        </div>
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Submitting..." : "Create Machine"}
        </button>
      </form>
      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      {loading ? <p>Loading...</p> : null}
      <MachineTable machines={machines} />
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

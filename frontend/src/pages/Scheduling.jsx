import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { generateTasks, runScheduling } from "../api/scheduling";

export default function Scheduling() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [taskCount, setTaskCount] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    setError("");
    setMessage("");

    try {
      const data = await generateTasks();
      setTaskCount(data.length);
      setMessage(`Tasks generated successfully. ${data.length} pending tasks created.`);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to generate tasks."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun = async () => {
    const confirmed = window.confirm("Run rule-based scheduling now?");
    if (!confirmed) {
      return;
    }

    setIsScheduling(true);
    setError("");
    setMessage("");

    try {
      const data = await runScheduling();
      const itemCount = data?.items?.length || 0;
      setMessage(`Scheduling completed. ${itemCount} schedule items created.`);
      navigate("/schedule-results");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to run scheduling."
      );
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "16px", maxWidth: "900px" }}>
      <div>
        <h1>Scheduling</h1>
        <p style={{ color: "#667085", lineHeight: 1.6 }}>
          Generate pending tasks first, then run scheduling. After success, open the
          results page or gantt page to review the latest plan.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={handleGenerateTasks}
          disabled={isGenerating || isScheduling}
          style={primaryButtonStyle}
        >
          {isGenerating ? "Generating..." : "Generate Tasks"}
        </button>

        <button
          type="button"
          onClick={handleRun}
          disabled={isGenerating || isScheduling}
          style={secondaryButtonStyle}
        >
          {isScheduling ? "Scheduling..." : "Run Scheduling"}
        </button>
      </div>

      {taskCount !== null ? (
        <div style={infoCardStyle}>Latest generated task count: {taskCount}</div>
      ) : null}

      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={infoCardStyle}>
        <div style={{ fontWeight: 600, marginBottom: "8px" }}>Instructions</div>
        <div style={{ color: "#475467", lineHeight: 1.7 }}>
          1. Click "Generate Tasks" to expand pending orders and routing operations into schedule tasks.
          <br />
          2. Click "Run Scheduling" to build the latest schedule result.
          <br />
          3. Open "Schedule Results" or "Gantt" after scheduling finishes.
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
        <Link to="/schedule-results">Open Schedule Results</Link>
        <Link to="/gantt">Open Gantt</Link>
      </div>
    </section>
  );
}

const primaryButtonStyle = {
  border: "none",
  borderRadius: "10px",
  padding: "10px 18px",
  backgroundColor: "#0f766e",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px"
};

const secondaryButtonStyle = {
  border: "none",
  borderRadius: "10px",
  padding: "10px 18px",
  backgroundColor: "#1d4ed8",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px"
};

const infoCardStyle = {
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid #d7dbe2",
  backgroundColor: "#ffffff"
};

const successStyle = {
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "#ecfdf3",
  border: "1px solid #abefc6",
  color: "#027a48"
};

const errorStyle = {
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "#fef3f2",
  border: "1px solid #fecdca",
  color: "#b42318"
};

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
      setMessage(`任务生成成功，共生成 ${data.length} 条待排产任务。`);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "任务生成失败。"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun = async () => {
    const confirmed = window.confirm("确认现在执行规则排产吗？");
    if (!confirmed) {
      return;
    }

    setIsScheduling(true);
    setError("");
    setMessage("");

    try {
      const data = await runScheduling();
      const itemCount = data?.items?.length || 0;
      setMessage(`排产完成，本次生成 ${itemCount} 条排产明细。`);
      navigate("/schedule-results");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "排产执行失败。"
      );
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "22px", maxWidth: "920px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          排产管理
        </h1>
        <p style={{ color: "#5e6d66", lineHeight: 1.7, margin: 0 }}>
          先生成待排产任务，再执行一键排产。完成后可在结果页和甘特图页面查看最新方案。
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "14px",
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={handleGenerateTasks}
          disabled={isGenerating || isScheduling}
          style={primaryButtonStyle}
        >
          {isGenerating ? "生成中..." : "生成任务"}
        </button>

        <button
          type="button"
          onClick={handleRun}
          disabled={isGenerating || isScheduling}
          style={secondaryButtonStyle}
        >
          {isScheduling ? "排产中..." : "一键排产"}
        </button>
      </div>

      {taskCount !== null ? (
        <div style={infoCardStyle}>最近一次任务生成数量：{taskCount}</div>
      ) : null}

      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={infoCardStyle}>
        <div style={{ fontWeight: 600, marginBottom: "8px" }}>操作说明</div>
        <div style={{ color: "#475467", lineHeight: 1.7 }}>
          1. 点击“生成任务”，根据待排产订单和工艺路线生成待排产任务。
          <br />
          2. 点击“一键排产”，执行规则排产并生成最新排产方案。
          <br />
          3. 排产完成后可前往结果页或甘特图页查看结果。
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
        <Link to="/schedule-results">查看排产结果</Link>
        <Link to="/gantt">查看甘特图</Link>
      </div>
    </section>
  );
}

const primaryButtonStyle = {
  border: "none",
  borderRadius: "16px",
  padding: "12px 20px",
  background: "linear-gradient(135deg, #1f5f52 0%, #2f7a6b 100%)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  boxShadow: "0 14px 26px rgba(31, 95, 82, 0.18)"
};

const secondaryButtonStyle = {
  border: "none",
  borderRadius: "16px",
  padding: "12px 20px",
  background: "linear-gradient(135deg, #295f8f 0%, #3772a8 100%)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  boxShadow: "0 14px 26px rgba(41, 95, 143, 0.18)"
};

const infoCardStyle = {
  padding: "20px",
  borderRadius: "22px",
  border: "1px solid rgba(20, 33, 29, 0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,251,250,0.92) 100%)",
  boxShadow: "0 18px 40px rgba(20, 33, 29, 0.05)"
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

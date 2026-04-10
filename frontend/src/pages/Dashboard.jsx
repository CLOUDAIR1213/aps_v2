import { useEffect, useState } from "react";

import { getDashboardSummary } from "../api/dashboard";
import { getLatestSchedulingResult } from "../api/scheduling";
import SummaryCards from "../components/SummaryCards";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [latestSchedule, setLatestSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryData, latestResult] = await Promise.allSettled([
          getDashboardSummary(),
          getLatestSchedulingResult()
        ]);

        if (summaryData.status === "fulfilled") {
          setSummary(summaryData.value);
        } else {
          throw summaryData.reason;
        }

        if (latestResult.status === "fulfilled") {
          setLatestSchedule(latestResult.value.schedule);
        } else {
          setLatestSchedule(null);
        }
      } catch (requestError) {
        setError(
          requestError?.response?.data?.detail || "Failed to load dashboard summary."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      <div>
        <h1 style={{ marginBottom: "8px" }}>系统看板</h1>
        <p style={{ color: "#667085", margin: 0 }}>
          机械加工行业轻量 APS 排产系统概览。
        </p>
      </div>

      {error ? (
        <div style={errorStyle}>{error}</div>
      ) : (
        <SummaryCards summary={summary} loading={loading} />
      )}

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "20px" }}>
          最近一次排产方案
        </h2>
        {loading ? <p style={{ margin: 0 }}>加载中...</p> : null}
        {!loading && latestSchedule ? (
          <div style={{ display: "grid", gap: "8px" }}>
            <div>
              <strong>方案编号：</strong> {latestSchedule.schedule_no}
            </div>
            <div>
              <strong>方案名称：</strong> {latestSchedule.name}
            </div>
            <div>
              <strong>状态：</strong> {latestSchedule.status}
            </div>
            <div>
              <strong>创建时间：</strong> {latestSchedule.created_at}
            </div>
          </div>
        ) : null}
        {!loading && !latestSchedule ? (
          <div style={{ color: "#667085" }}>
            暂无排产方案，请前往排产页面生成任务并执行排产。
          </div>
        ) : null}
      </div>
    </section>
  );
}

const panelStyle = {
  padding: "18px",
  border: "1px solid #d7dbe2",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)"
};

const errorStyle = {
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "#fef3f2",
  border: "1px solid #fecdca",
  color: "#b42318"
};

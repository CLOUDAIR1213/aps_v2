import { useEffect, useState } from "react";

import { getDashboardSummary } from "../api/dashboard";
import { getLatestSchedulingResult } from "../api/scheduling";
import SummaryCards from "../components/SummaryCards";

const scheduleStatusMap = {
  draft: "草稿",
  running: "排产中",
  completed: "已完成",
  failed: "失败"
};

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
          requestError?.response?.data?.detail || "首页数据加载失败。"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          首页看板
        </h1>
        <p style={{ color: "#5e6d66", margin: 0, lineHeight: 1.7, maxWidth: "640px" }}>
          展示系统核心数据与最近一次排产方案。
        </p>
      </div>

      {error ? (
        <div style={errorStyle}>{error}</div>
      ) : (
        <SummaryCards summary={summary} loading={loading} />
      )}

      <div style={panelStyle}>
        <h2
          style={{
            marginTop: 0,
            marginBottom: "16px",
            fontSize: "20px",
            letterSpacing: "-0.02em"
          }}
        >
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
              <strong>状态：</strong>{" "}
              {scheduleStatusMap[latestSchedule.status] || latestSchedule.status}
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
  padding: "24px",
  border: "1px solid rgba(20, 33, 29, 0.08)",
  borderRadius: "24px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,251,250,0.92) 100%)",
  boxShadow: "0 18px 40px rgba(20, 33, 29, 0.06)"
};

const errorStyle = {
  padding: "16px 18px",
  borderRadius: "18px",
  backgroundColor: "#fff4f2",
  border: "1px solid #f3c7c0",
  color: "#b42318"
};

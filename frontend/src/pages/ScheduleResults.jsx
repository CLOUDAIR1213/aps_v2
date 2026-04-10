import { useEffect, useState } from "react";

import { getLatestSchedulingResult } from "../api/scheduling";
import ScheduleTable from "../components/ScheduleTable";

const scheduleStatusMap = {
  draft: "草稿",
  running: "排产中",
  completed: "已完成",
  failed: "失败"
};

export default function ScheduleResults() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getLatestSchedulingResult();
        setResult(data);
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setResult(null);
        } else {
          setError(
            requestError?.response?.data?.detail || "排产结果加载失败。"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <section><h1>排产结果</h1><p>加载中...</p></section>;
  }

  if (error) {
    return <section><h1>排产结果</h1><p>{error}</p></section>;
  }

  if (!result?.schedule) {
    return (
      <section style={{ display: "grid", gap: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          排产结果
        </h1>
        <div
          style={{
            padding: "22px",
            border: "1px solid rgba(20, 33, 29, 0.08)",
            borderRadius: "22px",
            backgroundColor: "#f7f9f8"
          }}
        >
          暂无排产结果。
        </div>
      </section>
    );
  }

  const { schedule, items } = result;

  return (
    <section style={{ display: "grid", gap: "22px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          排产结果
        </h1>
        <p style={{ color: "#5e6d66", margin: 0, lineHeight: 1.7 }}>
          展示最新一次排产方案及其明细。
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px"
        }}
      >
        <InfoCard label="方案编号" value={schedule.schedule_no} />
        <InfoCard label="方案名称" value={schedule.name} />
        <InfoCard
          label="状态"
          value={scheduleStatusMap[schedule.status] || schedule.status}
        />
        <InfoCard label="创建时间" value={schedule.created_at} />
      </div>

      <ScheduleTable items={items || []} />
    </section>
  );
}

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid rgba(20, 33, 29, 0.08)",
        borderRadius: "22px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,251,250,0.92) 100%)",
        boxShadow: "0 16px 34px rgba(20, 33, 29, 0.05)"
      }}
    >
      <div style={{ color: "#667085", fontSize: "13px", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, lineHeight: 1.5, fontSize: "18px" }}>
        {value || "-"}
      </div>
    </div>
  );
}

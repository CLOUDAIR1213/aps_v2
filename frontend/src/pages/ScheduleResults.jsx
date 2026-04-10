import { useEffect, useState } from "react";

import { getLatestSchedulingResult } from "../api/scheduling";
import ScheduleTable from "../components/ScheduleTable";

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
      <section style={{ display: "grid", gap: "16px" }}>
        <h1>排产结果</h1>
        <div
          style={{
            padding: "20px",
            border: "1px solid #d7dbe2",
            borderRadius: "12px",
            backgroundColor: "#fafbfc"
        }}
      >
          暂无排产结果。
        </div>
      </section>
    );
  }

  const { schedule, items } = result;

  return (
    <section style={{ display: "grid", gap: "18px" }}>
      <div>
        <h1>排产结果</h1>
        <p style={{ color: "#667085" }}>展示最新一次排产方案及其明细。</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px"
        }}
      >
        <InfoCard label="方案编号" value={schedule.schedule_no} />
        <InfoCard label="方案名称" value={schedule.name} />
        <InfoCard label="状态" value={schedule.status} />
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
        padding: "16px",
        border: "1px solid #d7dbe2",
        borderRadius: "12px",
        backgroundColor: "#ffffff"
      }}
    >
      <div style={{ color: "#667085", fontSize: "13px", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, lineHeight: 1.5 }}>{value || "-"}</div>
    </div>
  );
}

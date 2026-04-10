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
            requestError?.response?.data?.detail || "Failed to load scheduling results."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <section><h1>Schedule Results</h1><p>Loading...</p></section>;
  }

  if (error) {
    return <section><h1>Schedule Results</h1><p>{error}</p></section>;
  }

  if (!result?.schedule) {
    return (
      <section style={{ display: "grid", gap: "16px" }}>
        <h1>Schedule Results</h1>
        <div
          style={{
            padding: "20px",
            border: "1px solid #d7dbe2",
            borderRadius: "12px",
            backgroundColor: "#fafbfc"
          }}
        >
          No scheduling result yet.
        </div>
      </section>
    );
  }

  const { schedule, items } = result;

  return (
    <section style={{ display: "grid", gap: "18px" }}>
      <div>
        <h1>Schedule Results</h1>
        <p style={{ color: "#667085" }}>Latest scheduling plan and detailed items.</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px"
        }}
      >
        <InfoCard label="Schedule No" value={schedule.schedule_no} />
        <InfoCard label="Name" value={schedule.name} />
        <InfoCard label="Status" value={schedule.status} />
        <InfoCard label="Created At" value={schedule.created_at} />
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

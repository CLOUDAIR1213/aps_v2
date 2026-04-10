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
        <h1 style={{ marginBottom: "8px" }}>Dashboard</h1>
        <p style={{ color: "#667085", margin: 0 }}>
          Lightweight APS overview for machine shop scheduling.
        </p>
      </div>

      {error ? (
        <div style={errorStyle}>{error}</div>
      ) : (
        <SummaryCards summary={summary} loading={loading} />
      )}

      <div style={panelStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "20px" }}>
          Latest Schedule
        </h2>
        {loading ? <p style={{ margin: 0 }}>Loading...</p> : null}
        {!loading && latestSchedule ? (
          <div style={{ display: "grid", gap: "8px" }}>
            <div>
              <strong>Schedule No:</strong> {latestSchedule.schedule_no}
            </div>
            <div>
              <strong>Name:</strong> {latestSchedule.name}
            </div>
            <div>
              <strong>Status:</strong> {latestSchedule.status}
            </div>
            <div>
              <strong>Created At:</strong> {latestSchedule.created_at}
            </div>
          </div>
        ) : null}
        {!loading && !latestSchedule ? (
          <div style={{ color: "#667085" }}>
            No schedule result yet. Open the Scheduling page to generate tasks and run scheduling.
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

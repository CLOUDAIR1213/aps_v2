import { useEffect, useState } from "react";

import { getGanttData } from "../api/scheduling";
import GanttChart from "../components/GanttChart";

export default function Gantt() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getGanttData();
        setData(response || []);
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setData([]);
        } else {
          setError(
            requestError?.response?.data?.detail || "Failed to load gantt data."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <h1>Gantt</h1>
      <p style={{ color: "#667085" }}>Latest schedule grouped by machine.</p>
      {loading ? <p>Loading...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !error ? <GanttChart data={data} /> : null}
    </section>
  );
}

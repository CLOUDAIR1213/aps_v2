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
            requestError?.response?.data?.detail || "甘特图数据加载失败。"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section style={{ display: "grid", gap: "22px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: "-0.03em" }}>
          甘特图
        </h1>
        <p style={{ color: "#5e6d66", margin: 0, lineHeight: 1.7 }}>
          按设备分组展示最新排产方案。
        </p>
      </div>
      {loading ? <p>加载中...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !error ? <GanttChart data={data} /> : null}
    </section>
  );
}

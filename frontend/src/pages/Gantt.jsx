import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getGanttData, getLatestSchedulingResult } from "../api/scheduling";
import GanttChart from "../components/GanttChart";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours, getDurationHours } from "../utils/formatters";

const statusMap = {
  draft: "\u8349\u7a3f",
  running: "\u6392\u4ea7\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  failed: "\u5931\u8d25"
};

export default function Gantt() {
  const [data, setData] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [ganttData, latestData] = await Promise.all([
          getGanttData(),
          getLatestSchedulingResult()
        ]);

        setData(ganttData || []);
        setLatestResult(latestData);
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setData([]);
          setLatestResult(null);
        } else {
          setError(
            requestError?.response?.data?.detail ||
              "\u7518\u7279\u56fe\u6570\u636e\u52a0\u8f7d\u5931\u8d25\u3002"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const allTasks = data.flatMap((machine) => machine.tasks);
  const ganttStart =
    allTasks.length > 0
      ? Math.min(...allTasks.map((task) => new Date(task.start_time).getTime()))
      : null;
  const ganttEnd =
    allTasks.length > 0
      ? Math.max(...allTasks.map((task) => new Date(task.end_time).getTime()))
      : null;
  const horizonHours =
    ganttStart !== null && ganttEnd !== null
      ? getDurationHours(ganttStart, ganttEnd)
      : 0;

  const cards = [
    {
      title: "\u673a\u53f0\u9053",
      value: data.length,
      meta: "\u6309\u673a\u53f0\u5206\u7ec4\u663e\u793a",
      accent: "#205c52"
    },
    {
      title: "\u6392\u4ea7\u4efb\u52a1",
      value: allTasks.length,
      meta: "\u5168\u90e8\u65f6\u95f4\u6761\u603b\u6570",
      accent: "#2d5d8c"
    },
    {
      title: "\u89c2\u5bdf\u7a97\u53e3",
      value: formatHours(horizonHours),
      meta: "\u6700\u65e9\u5f00\u59cb\u81f3\u6700\u665a\u7ed3\u675f",
      accent: "#b97012"
    },
    {
      title: "\u6700\u65b0\u65b9\u6848",
      value: latestResult?.schedule?.schedule_no || "--",
      meta: latestResult
        ? formatDateTime(latestResult.schedule.created_at)
        : "\u6682\u65e0\u65b9\u6848",
      accent: "#7d567e"
    }
  ];

  return (
    <section className="page-grid">
      {error ? <div className="alert danger">{error}</div> : null}
      <SummaryCards cards={cards} loading={loading} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">
              {"\u673a\u53f0\u65f6\u95f4\u8f74"}
            </h3>
            <p className="panel-subtitle">
              {"\u65f6\u95f4\u8f74\u7684\u4e3b\u8981\u4f5c\u7528\u662f\u627e\u51fa\u74f6\u9888\u3001\u7a7a\u7a97\u548c\u5de5\u5e8f\u987a\u5e8f\u95ee\u9898\uff0c\u800c\u4e0d\u662f\u4ec5\u505a\u88c5\u9970\u5c55\u793a\u3002"}
            </p>
          </div>

          {latestResult ? (
            <StatusBadge tone="info">
              {statusMap[latestResult.schedule.status] || latestResult.schedule.status}
            </StatusBadge>
          ) : null}
        </div>

        {latestResult ? (
          <div className="alert info">
            {`\u65b9\u6848 ${latestResult.schedule.schedule_no} \u521b\u5efa\u4e8e ${formatDateTime(
              latestResult.schedule.created_at
            )} \uff0c\u53ef\u5728\u7ed3\u679c\u9875\u67e5\u770b\u5b8c\u6574\u8868\u683c\u660e\u7ec6\u3002`}
          </div>
        ) : null}

        <div className="panel-actions">
          <Link className="button ghost small" to="/schedule-results">
            {"\u56de\u5230\u6392\u4ea7\u7ed3\u679c"}
          </Link>
          <Link className="button ghost small" to="/scheduling">
            {"\u91cd\u65b0\u6392\u4ea7"}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="alert info">
          {"\u6b63\u5728\u751f\u6210\u673a\u53f0\u65f6\u95f4\u8f74\u89c6\u56fe\u3002"}
        </div>
      ) : (
        <GanttChart data={data} />
      )}
    </section>
  );
}

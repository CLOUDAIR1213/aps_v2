import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getProductionGanttData, getProductionSchedulingResult } from "../api/production";
import GanttChart from "../components/GanttChart";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours, getDurationHours } from "../utils/formatters";

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
          getProductionGanttData(),
          getProductionSchedulingResult()
        ]);
        setData(ganttData || []);
        setLatestResult(latestData);
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setData([]);
          setLatestResult(null);
        } else {
          setError(requestError?.response?.data?.detail || "甘特图数据加载失败。");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const allTasks = data.flatMap((resource) => resource.tasks);
  const ganttStart =
    allTasks.length > 0
      ? Math.min(...allTasks.map((task) => new Date(task.start_time).getTime()))
      : null;
  const ganttEnd =
    allTasks.length > 0
      ? Math.max(...allTasks.map((task) => new Date(task.end_time).getTime()))
      : null;
  const horizonHours =
    ganttStart !== null && ganttEnd !== null ? getDurationHours(ganttStart, ganttEnd) : 0;

  const cards = [
    { title: "资源道", value: data.length, meta: "内部设备与外协资源", accent: "#205c52" },
    { title: "时间块", value: allTasks.length, meta: "零件-工序任务", accent: "#2d5d8c" },
    { title: "观察窗口", value: formatHours(horizonHours), meta: "最早开始至最晚结束", accent: "#b97012" },
    {
      title: "逾期工单",
      value: latestResult?.late_orders?.length || 0,
      meta: latestResult ? latestResult.schedule.schedule_no : "暂无方案",
      accent: "#c44733"
    }
  ];

  return (
    <section className="page-grid">
      {error ? <div className="alert danger">{error}</div> : null}
      <SummaryCards cards={cards} loading={loading} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">资源排产时间轴</h3>
            <p className="panel-subtitle">
              按资源/设备道观察任务顺序、等待和瓶颈，用于判断方案是否可执行。
            </p>
          </div>
          {latestResult ? <StatusBadge tone="info">{latestResult.schedule.status}</StatusBadge> : null}
        </div>

        {latestResult ? (
          <div className="alert info">
            方案 {latestResult.schedule.schedule_no} 创建于 {formatDateTime(latestResult.schedule.created_at)}。
          </div>
        ) : null}

        <div className="panel-actions">
          <Link className="button ghost small" to="/schedule-results">
            回到结果
          </Link>
          <Link className="button ghost small" to="/scheduling">
            重新排产
          </Link>
        </div>
      </div>

      {loading ? <div className="alert info">正在生成资源时间轴。</div> : <GanttChart data={data} />}
    </section>
  );
}

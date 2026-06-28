import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  getProductionGanttData,
  getProductionSchedulingOverview,
  getProductionSchedulingResult
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
import GanttChart from "../components/GanttChart";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatHours, getDurationHours } from "../utils/formatters";
import { buildScheduleBoardPath, buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

export default function Gantt() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scheduleId = searchParams.get("schedule_id");
  const [data, setData] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const ganttParams = scheduleId ? { schedule_id: scheduleId } : {};
        const [ganttData, latestData] = await Promise.all([
          getProductionGanttData(ganttParams),
          getProductionSchedulingResult(scheduleId ? Number(scheduleId) : null)
        ]);
        let overviewData = null;
        try {
          overviewData = await getProductionSchedulingOverview({ schedule_id: latestData.schedule.id });
        } catch {
          overviewData = null;
        }
        setData(ganttData || []);
        setLatestResult(latestData);
        setOverview(overviewData);
        setActiveScheduleId(latestData.schedule.id);
        if (!scheduleId) {
          setSearchParams({ schedule_id: String(latestData.schedule.id) }, { replace: true });
        }
      } catch (requestError) {
        if (requestError?.response?.status === 404) {
          setData([]);
          setLatestResult(null);
          setOverview(null);
        } else {
          setError(requestError?.response?.data?.detail || "甘特图数据加载失败。");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [scheduleId]);

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
    { title: "资源道", value: data.length, meta: "内部人员与外协资源", accent: "#205c52" },
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
      <CurrentScheduleBanner loading={loading} overview={overview} schedule={latestResult?.schedule} />
      <CompactSummaryStrip className="gantt-summary-strip" items={cards} loading={loading} />

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">排产时间轴</h3>
            <p className="panel-subtitle">
              按人员道观察任务顺序、等待和瓶颈；设备仅作为辅助信息保留。
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
          <Link className="button ghost small" to={buildSchedulePath("/schedule-results", scheduleId || latestResult?.schedule?.id)}>
            回到结果
          </Link>
          <Link className="button ghost small" to={buildSchedulePath("/dispatch", scheduleId || latestResult?.schedule?.id)}>
            派工与工时
          </Link>
          <Link className="button ghost small" to={buildScheduleBoardPath(scheduleId || latestResult?.schedule?.id)}>
            生产排班表
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

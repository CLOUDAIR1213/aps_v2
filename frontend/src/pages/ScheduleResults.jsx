import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  deleteWorkOrder,
  exportSchedule,
  getProductionResourceLoad,
  getProductionSchedules,
  getProductionSchedulingOverview,
  getProductionSchedulingResult,
  lockOrder,
  unlockOrder,
} from "../api/production";
import OrderCompletionTable from "../components/scheduling/OrderCompletionTable";
import ResourceLoadPanel from "../components/scheduling/ResourceLoadPanel";
import ScheduleOperationDetail from "../components/scheduling/ScheduleOperationDetail";
import ScheduleSelector from "../components/scheduling/ScheduleSelector";
import {
  formatDateTime,
  formatPercent,
} from "../utils/formatters";
import { setActiveScheduleId } from "../utils/scheduleContext";

export default function ScheduleResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScheduleId = searchParams.get("schedule_id") || "";
  const [schedules, setSchedules] = useState([]);
  const [overview, setOverview] = useState(null);
  const [resourceLoad, setResourceLoad] = useState([]);
  const [detailResult, setDetailResult] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(requestedScheduleId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [lockingOrderId, setLockingOrderId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  const loadData = async (scheduleId = selectedScheduleId) => {
    setLoading(true);
    setError("");
    try {
      const scheduleParams = scheduleId ? { schedule_id: scheduleId } : {};
      const [scheduleData, overviewData, loadData] = await Promise.all([
        getProductionSchedules(),
        getProductionSchedulingOverview(scheduleParams),
        getProductionResourceLoad(scheduleParams)
      ]);
      setSchedules(scheduleData.schedules || []);
      setOverview(overviewData);
      setResourceLoad(loadData.resources || []);
      setSelectedScheduleId(String(overviewData.schedule_id));
      setActiveScheduleId(overviewData.schedule_id);
      if (!scheduleId || String(overviewData.schedule_id) !== String(scheduleId)) {
        setSearchParams({ schedule_id: String(overviewData.schedule_id) });
      }
      try {
        setDetailResult(await getProductionSchedulingResult(overviewData.schedule_id));
      } catch {
        setDetailResult(null);
      }
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setSchedules([]);
        setOverview(null);
        setResourceLoad([]);
        setDetailResult(null);
      } else {
        setError(requestError?.response?.data?.detail || "排产总览加载失败。");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(requestedScheduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedScheduleId]);

  const handleLockOrder = async (workOrderId) => {
    setLockingOrderId(workOrderId);
    setError("");
    setMessage("");
    try {
      await lockOrder(selectedScheduleId, workOrderId);
      setMessage("计划已锁定，后续重排时该订单时间不变。");
      await loadData(selectedScheduleId);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "锁定计划失败。");
    } finally {
      setLockingOrderId(null);
    }
  };

  const handleUnlockOrder = async (workOrderId) => {
    setLockingOrderId(workOrderId);
    setError("");
    setMessage("");
    try {
      await unlockOrder(selectedScheduleId, workOrderId);
      setMessage("计划锁定已取消，该订单后续可参与重排。");
      await loadData(selectedScheduleId);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "取消锁定失败。");
    } finally {
      setLockingOrderId(null);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (
      !window.confirm(
        `确认删除订单「${order.order_no}」？相关零件、工序、排产明细和锁定记录会一并删除。`
      )
    ) {
      return;
    }
    setDeletingOrderId(order.work_order_id);
    setError("");
    setMessage("");
    try {
      await deleteWorkOrder(order.work_order_id);
      setMessage(`订单「${order.order_no}」已删除。`);
      await loadData(selectedScheduleId);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "订单删除失败。");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await exportSchedule(selectedScheduleId);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `排产结果_${overview?.schedule_no || selectedScheduleId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("导出成功。");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "导出失败。");
    } finally {
      setExporting(false);
    }
  };

  const completionSummary = useMemo(() => [
    {
      label: "当前方案",
      value: overview?.schedule_no || "--",
      meta: overview?.schedule_name || "暂无排产方案"
    },
    {
      label: "总订单数",
      value: overview?.total_orders ?? 0,
      meta: `已排 ${overview?.scheduled_orders ?? 0} 张`
    },
    {
      label: "延期订单数",
      value: overview?.delayed_orders ?? 0,
      meta: overview?.delayed_orders ? "优先处理红色订单" : "当前无延期订单"
    },
    {
      label: "最晚完工时间",
      value: overview?.latest_finish_time ? formatDateTime(overview.latest_finish_time) : "--",
      meta: "当前方案最终完成时间"
    },
    {
      label: "平均负荷",
      value: formatPercent((overview?.average_resource_utilization || 0) * 100),
      meta: "按资源负荷率平均"
    }
  ], [overview]);

  if (loading) {
    return (
      <section className="page-grid">
        <div className="alert info">正在加载订单级排产总览。</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-grid">
        <div className="alert danger">{error}</div>
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="page-grid">
        <div className="empty-state">
          <h3 className="empty-state-title">暂无排产方案</h3>
          <p className="empty-state-copy">请先导入工单并在排产驾驶台执行生产排产。</p>
          <div className="panel-actions">
            <Link className="button" to="/scheduling">前往排产</Link>
            <Link className="button ghost" to="/work-order-import">导入工单</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid completion-overview">
      {message ? <div className="alert success">{message}</div> : null}

      <div className="panel completion-hero compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">订单完工表</h3>
            <p className="panel-subtitle">
              按订单看交期、预计开始、预计完成和延期天数。默认按延期、临近交期、高优先级和交期早排序。
            </p>
          </div>
          <ScheduleSelector
            exporting={exporting}
            onExport={handleExport}
            onRefresh={() => loadData(selectedScheduleId)}
            onScheduleChange={(event) => {
              setActiveScheduleId(event.target.value);
              setSearchParams({ schedule_id: event.target.value });
            }}
            schedules={schedules}
            selectedScheduleId={selectedScheduleId}
          />
        </div>

        <div className="compact-summary-strip completion-summary-strip">
          {completionSummary.map((item) => (
            <span key={item.label}>
              {item.label}：<strong>{item.value}</strong>
              <small>{item.meta}</small>
            </span>
          ))}
        </div>
      </div>

      <OrderCompletionTable
        deletingOrderId={deletingOrderId}
        lockingOrderId={lockingOrderId}
        onDeleteOrder={handleDeleteOrder}
        onLockOrder={handleLockOrder}
        onUnlockOrder={handleUnlockOrder}
        orders={overview.orders}
        scheduleId={overview.schedule_id}
      />

      <ResourceLoadPanel resources={resourceLoad} />

      <ScheduleOperationDetail items={detailResult?.items || []} />
    </section>
  );
}

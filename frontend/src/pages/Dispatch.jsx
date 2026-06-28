import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  applyDispatchAutoAssign,
  exportPersonnelWorkload,
  getPersonnel,
  getPersonnelWorkload,
  getProductionSchedules,
  getProductionSchedulingOverview,
  getScheduleDispatch,
  getWorkCenters,
  getWorkOrders,
  previewDispatchAutoAssign,
  saveBatchScheduleItemPersonnelAllocations,
  saveScheduleItemPersonnelAllocations
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import DispatchFilterBar from "../components/dispatch/DispatchFilterBar";
import DispatchTaskTable, { allocationText } from "../components/dispatch/DispatchTaskTable";
import OperationSummaryDispatchTable from "../components/dispatch/OperationSummaryDispatchTable";
import PersonnelAllocationEditor from "../components/dispatch/PersonnelAllocationEditor";
import PersonnelWorkloadTable from "../components/dispatch/PersonnelWorkloadTable";
import { formatHours } from "../utils/formatters";
import { buildScheduleBoardPath, buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

function minutesToHours(minutes) {
  return formatHours((Number(minutes) || 0) / 60);
}

function buildDraft(allocations) {
  return (allocations || []).map((allocation) => ({
    person_id: String(allocation.person_id),
    ratio_percent: String(allocation.ratio_percent)
  }));
}

function getTime(value) {
  const parsed = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function getAllocationPriority(status) {
  if (status === "unassigned") {
    return 0;
  }
  if (status === "partial") {
    return 1;
  }
  return 2;
}

function buildAutoAssignPayload(filters, query) {
  return {
    work_order_id: filters.work_order_id ? Number(filters.work_order_id) : null,
    work_center_id: filters.work_center_id ? Number(filters.work_center_id) : null,
    person_id: filters.person_id ? Number(filters.person_id) : null,
    allocation_status: filters.allocation_status || null,
    query: query.trim() || null
  };
}

function groupOperationTasks(tasks) {
  const groupsByKey = new Map();
  tasks.forEach((task) => {
    const key = `${task.work_center_id}:${task.operation_name || ""}`;
    const group = groupsByKey.get(key) || {
      key,
      workCenterId: task.work_center_id,
      workCenterName: task.work_center_name,
      operationName: task.operation_name,
      tasks: [],
      orderIds: new Set(),
      totalMinutes: 0,
      unassignedCount: 0,
      partialCount: 0,
      assignedCount: 0,
    };
    group.tasks.push(task);
    group.orderIds.add(task.work_order_id);
    group.totalMinutes += Number(task.planned_minutes) || 0;
    if (task.allocation_status === "assigned") {
      group.assignedCount += 1;
    } else if (task.allocation_status === "partial") {
      group.partialCount += 1;
    } else {
      group.unassignedCount += 1;
    }
    groupsByKey.set(key, group);
  });
  return [...groupsByKey.values()]
    .map((group) => ({
      ...group,
      taskCount: group.tasks.length,
      orderCount: group.orderIds.size,
    }))
    .sort((a, b) => (
      b.unassignedCount - a.unassignedCount
      || b.partialCount - a.partialCount
      || a.workCenterName.localeCompare(b.workCenterName, "zh-Hans-CN")
      || a.operationName.localeCompare(b.operationName, "zh-Hans-CN")
    ));
}

export default function Dispatch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScheduleId = searchParams.get("schedule_id") || "";
  const [schedules, setSchedules] = useState([]);
  const [dispatch, setDispatch] = useState(null);
  const [overview, setOverview] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [personnelDirectory, setPersonnelDirectory] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(requestedScheduleId);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewMode, setViewMode] = useState("detail");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState([]);
  const [draft, setDraft] = useState([]);
  const [expandedPersonId, setExpandedPersonId] = useState(null);
  const [filters, setFilters] = useState({
    work_order_id: "",
    work_center_id: "",
    person_id: "",
    allocation_status: ""
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewingAutoAssign, setPreviewingAutoAssign] = useState(false);
  const [applyingAutoAssign, setApplyingAutoAssign] = useState(false);
  const [exportingWorkload, setExportingWorkload] = useState(false);
  const [autoAssignPreview, setAutoAssignPreview] = useState(null);
  const [autoAssignDetailsOpen, setAutoAssignDetailsOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async (scheduleId = selectedScheduleId, nextFilters = filters, nextSelectedTaskId = undefined) => {
    setLoading(true);
    setError("");
    try {
      const scheduleData = await getProductionSchedules();
      const nextSchedules = scheduleData.schedules || [];
      setSchedules(nextSchedules);
      const resolvedScheduleId = scheduleId || nextSchedules[0]?.id;
      if (!resolvedScheduleId) {
        setDispatch(null);
        setOverview(null);
        setWorkload([]);
        return;
      }
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== null)
      );
      const [dispatchData, workloadData] = await Promise.all([
        getScheduleDispatch(resolvedScheduleId, params),
        getPersonnelWorkload({ schedule_id: resolvedScheduleId })
      ]);
      let overviewData = null;
      try {
        overviewData = await getProductionSchedulingOverview({ schedule_id: resolvedScheduleId });
      } catch {
        overviewData = null;
      }
      setDispatch(dispatchData);
      setOverview(overviewData);
      setWorkload(workloadData.rows || []);
      setSelectedScheduleId(String(resolvedScheduleId));
      setActiveScheduleId(resolvedScheduleId);
      setSearchParams({ schedule_id: String(resolvedScheduleId) });
      const firstTaskId = dispatchData.tasks?.[0]?.schedule_item_id || null;
      setSelectedTaskId((current) => {
        if (nextSelectedTaskId !== undefined) {
          return nextSelectedTaskId;
        }
        if (current && dispatchData.tasks?.some((task) => task.schedule_item_id === current)) {
          return current;
        }
        return firstTaskId;
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "派工数据加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [centerData, orderData, personnelData] = await Promise.all([
          getWorkCenters(),
          getWorkOrders(),
          getPersonnel()
        ]);
        setWorkCenters(centerData);
        setOrders(orderData);
        setPersonnelDirectory(personnelData);
      } catch {
        setWorkCenters([]);
        setOrders([]);
        setPersonnelDirectory([]);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    loadData(requestedScheduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedScheduleId]);

  const selectedTask = useMemo(() => {
    return dispatch?.tasks?.find((task) => task.schedule_item_id === selectedTaskId) || null;
  }, [dispatch, selectedTaskId]);

  useEffect(() => {
    if (viewMode === "summary" && selectedTaskIds.length) {
      return;
    }
    setDraft(buildDraft(selectedTask?.allocations));
  }, [selectedTaskId, selectedTask, selectedTaskIds.length, viewMode]);

  const orderDueTimeById = useMemo(() => {
    const map = new Map();
    overview?.orders?.forEach((order) => {
      map.set(order.work_order_id, getTime(order.due_date));
    });
    orders.forEach((order) => {
      if (!map.has(order.id)) {
        map.set(order.id, getTime(order.due_date));
      }
    });
    return map;
  }, [orders, overview]);

  const personnelById = useMemo(() => {
    const map = new Map();
    personnelDirectory.forEach((person) => map.set(String(person.id), person));
    dispatch?.personnel?.forEach((person) => {
      const existing = map.get(String(person.id));
      map.set(String(person.id), { ...person, ...existing });
    });
    return map;
  }, [dispatch, personnelDirectory]);

  const activePersonnel = useMemo(() => {
    return [...personnelById.values()].filter((person) => person.status === "active");
  }, [personnelById]);

  const suggestedPersonnel = useMemo(() => {
    if (!selectedTask) {
      return activePersonnel;
    }
    return [...activePersonnel].sort((a, b) => {
      const aMatched = a.work_centers?.some((center) => center.id === selectedTask.work_center_id) ? 0 : 1;
      const bMatched = b.work_centers?.some((center) => center.id === selectedTask.work_center_id) ? 0 : 1;
      return aMatched - bMatched || String(a.name).localeCompare(String(b.name), "zh-Hans-CN");
    });
  }, [activePersonnel, selectedTask]);

  const mismatchedDraftPeople = useMemo(() => {
    if (!selectedTask) {
      return [];
    }
    return draft
      .map((row) => personnelById.get(String(row.person_id)))
      .filter((person) => (
        person
        && !(person.work_centers || []).some((center) => center.id === selectedTask.work_center_id)
      ));
  }, [draft, personnelById, selectedTask]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (dispatch?.tasks || [])
      .filter((task) => {
        if (!normalized) {
          return true;
        }
        return [
          task.order_no,
          task.customer,
          task.drawing_no,
          task.part_no,
          task.part_name,
          task.operation_name,
          task.work_center_name,
          task.machine_name,
          allocationText(task.allocations)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .sort((a, b) => (
        getAllocationPriority(a.allocation_status) - getAllocationPriority(b.allocation_status)
        || (orderDueTimeById.get(a.work_order_id) ?? Number.POSITIVE_INFINITY)
          - (orderDueTimeById.get(b.work_order_id) ?? Number.POSITIVE_INFINITY)
        || getTime(a.planned_start) - getTime(b.planned_start)
        || a.schedule_item_id - b.schedule_item_id
      ));
  }, [dispatch, orderDueTimeById, query]);

  const operationGroups = useMemo(() => groupOperationTasks(visibleTasks), [visibleTasks]);

  const selectedBatchTasks = useMemo(() => {
    const selectedSet = new Set(selectedTaskIds);
    return visibleTasks.filter((task) => selectedSet.has(task.schedule_item_id));
  }, [selectedTaskIds, visibleTasks]);

  const selectedBatchSummary = useMemo(() => {
    const workCenterNames = new Set();
    const operationNames = new Set();
    const orderIds = new Set();
    let totalMinutes = 0;
    selectedBatchTasks.forEach((task) => {
      workCenterNames.add(task.work_center_name);
      operationNames.add(task.operation_name);
      orderIds.add(task.work_order_id);
      totalMinutes += Number(task.planned_minutes) || 0;
    });
    return {
      taskCount: selectedBatchTasks.length,
      totalMinutes,
      workCenterNames: [...workCenterNames],
      operationNames: [...operationNames],
      orderCount: orderIds.size,
    };
  }, [selectedBatchTasks]);

  const draftTotal = draft.reduce((sum, row) => sum + (Number(row.ratio_percent) || 0), 0);
  const ratioDelta = Math.round((100 - draftTotal) * 1000) / 1000;
  const draftPersonIds = draft.map((row) => row.person_id).filter(Boolean);
  const ratiosValid = draft.every((row) => {
    const ratio = Number(row.ratio_percent);
    return Number.isFinite(ratio) && ratio > 0 && ratio <= 100;
  });
  const canSave =
    (viewMode === "summary" ? selectedBatchTasks.length > 0 : selectedTask) &&
    draft.length > 0 &&
    draftPersonIds.length === draft.length &&
    new Set(draftPersonIds).size === draftPersonIds.length &&
    ratiosValid &&
    Math.abs(ratioDelta) <= 0.001 &&
    suggestedPersonnel.length > 0;

  const addDraftRow = () => {
    setDraft((rows) => [...rows, { person_id: "", ratio_percent: "" }]);
  };

  const updateDraftRow = (index, patch) => {
    setDraft((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeDraftRow = (index) => {
    setDraft((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const distributeEvenly = () => {
    const count = draft.length || 1;
    const base = Math.floor((100 / count) * 100) / 100;
    const next = draft.map((row, index) => ({
      ...row,
      ratio_percent: String(index === count - 1 ? Math.round((100 - base * (count - 1)) * 100) / 100 : base)
    }));
    setDraft(next);
  };

  const assignSingleFull = () => {
    const currentPersonId = draft.find((row) => row.person_id)?.person_id;
    const recommendedPersonId = currentPersonId || suggestedPersonnel[0]?.id || "";
    setDraft([{ person_id: recommendedPersonId ? String(recommendedPersonId) : "", ratio_percent: "100" }]);
  };

  const handleToggleTaskSelection = (scheduleItemId) => {
    setSelectedTaskIds((ids) => (
      ids.includes(scheduleItemId)
        ? ids.filter((id) => id !== scheduleItemId)
        : [...ids, scheduleItemId]
    ));
  };

  const handleToggleGroupSelection = (group) => {
    const groupIds = group.tasks.map((task) => task.schedule_item_id);
    setSelectedTaskIds((ids) => {
      const selectedSet = new Set(ids);
      const allSelected = groupIds.every((id) => selectedSet.has(id));
      if (allSelected) {
        return ids.filter((id) => !groupIds.includes(id));
      }
      groupIds.forEach((id) => selectedSet.add(id));
      return [...selectedSet];
    });
  };

  const handleSelectFilteredTasks = () => {
    setSelectedTaskIds(visibleTasks.map((task) => task.schedule_item_id));
    setViewMode("summary");
  };

  const handleClearBatchSelection = () => {
    setSelectedTaskIds([]);
    setDraft(buildDraft(selectedTask?.allocations));
  };

  const handleToggleGroup = (groupKey) => {
    setExpandedGroupKeys((keys) => (
      keys.includes(groupKey)
        ? keys.filter((key) => key !== groupKey)
        : [...keys, groupKey]
    ));
  };

  const handleSelectTask = (scheduleItemId) => {
    setSelectedTaskId(scheduleItemId);
    if (viewMode === "detail") {
      setSelectedTaskIds([]);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setError("");
    setMessage("");
    if (mode === "detail") {
      setSelectedTaskIds([]);
      setDraft(buildDraft(selectedTask?.allocations));
    } else if (!draft.length) {
      assignSingleFull();
    }
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadData(selectedScheduleId, filters);
  };

  const handleScheduleChange = (event) => {
    const value = event.target.value;
    setSelectedScheduleId(value);
    setActiveScheduleId(value);
    loadData(value, filters);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const allocationPayload = draft.map((row) => ({
        person_id: Number(row.person_id),
        ratio_percent: Number(row.ratio_percent)
      }));
      if (viewMode === "summary") {
        const result = await saveBatchScheduleItemPersonnelAllocations(
          selectedScheduleId,
          {
            schedule_item_ids: selectedBatchTasks.map((task) => task.schedule_item_id),
            allocations: allocationPayload,
            overwrite_assigned: false,
          }
        );
        setMessage(
          `批量派工完成：已处理 ${result.processed_count || 0} 条，跳过 ${result.skipped_count || 0} 条，排产时间不变。`
        );
        setSelectedTaskIds([]);
        await loadData(selectedScheduleId, filters);
        return;
      }

      const result = await saveScheduleItemPersonnelAllocations(
        selectedTask.schedule_item_id,
        allocationPayload
      );
      setMessage("派工分摊已保存，排产时间不变。");
      const currentIndex = visibleTasks.findIndex((task) => task.schedule_item_id === selectedTask.schedule_item_id);
      const orderedCandidates = currentIndex >= 0
        ? [...visibleTasks.slice(currentIndex + 1), ...visibleTasks.slice(0, currentIndex)]
        : visibleTasks;
      const nextTaskId = orderedCandidates.find(
        (task) => (
          task.schedule_item_id !== selectedTask.schedule_item_id
          && task.allocation_status !== "assigned"
        )
      )?.schedule_item_id || null;
      await loadData(selectedScheduleId, filters, nextTaskId);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join("；") : detail || "派工保存失败。");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewAutoAssign = async () => {
    if (!selectedScheduleId) {
      return;
    }
    setPreviewingAutoAssign(true);
    setError("");
    setMessage("");
    setAutoAssignDetailsOpen(false);
    try {
      const preview = await previewDispatchAutoAssign(
        selectedScheduleId,
        buildAutoAssignPayload(filters, query)
      );
      setAutoAssignPreview(preview);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "一键分配预览失败。");
    } finally {
      setPreviewingAutoAssign(false);
    }
  };

  const handleApplyAutoAssign = async () => {
    if (!selectedScheduleId) {
      return;
    }
    setApplyingAutoAssign(true);
    setError("");
    setMessage("");
    try {
      const result = await applyDispatchAutoAssign(
        selectedScheduleId,
        buildAutoAssignPayload(filters, query)
      );
      const processed = result.summary?.processable_count || 0;
      const skipped = result.summary?.skipped_count || 0;
      setAutoAssignPreview(null);
      setAutoAssignDetailsOpen(false);
      setMessage(
        `一键分配完成：已处理 ${processed} 条，跳过 ${skipped} 条，排产时间不变。`
      );
      await loadData(selectedScheduleId, filters);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "一键分配保存失败。");
    } finally {
      setApplyingAutoAssign(false);
    }
  };

  const handleExportWorkload = async () => {
    if (!selectedScheduleId) {
      return;
    }
    setExportingWorkload(true);
    setError("");
    setMessage("");
    try {
      const response = await exportPersonnelWorkload(selectedScheduleId);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `人员工时汇总_${currentSchedule?.schedule_no || selectedScheduleId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("人员工时汇总已导出。");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "人员工时汇总导出失败。");
    } finally {
      setExportingWorkload(false);
    }
  };

  const assignedCount = dispatch?.tasks?.filter((task) => task.allocation_status === "assigned").length || 0;
  const unassignedCount = dispatch?.tasks?.filter((task) => task.allocation_status !== "assigned").length || 0;
  const totalMinutes = dispatch?.tasks?.reduce((sum, task) => sum + task.planned_minutes, 0) || 0;
  const assignedMinutes = dispatch?.tasks?.reduce((sum, task) => sum + task.assigned_minutes, 0) || 0;
  const currentSchedule = schedules.find((schedule) => String(schedule.id) === String(selectedScheduleId))
    || dispatch?.schedule
    || null;

  return (
    <section className="page-grid dispatch-page">
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert danger">{error}</div> : null}

      <CurrentScheduleBanner loading={loading} overview={overview} schedule={currentSchedule} />

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">派工与工时</h3>
            <p className="panel-subtitle">按排产明细把计划工时分摊给在职人员，人员分配只用于派工和负荷统计，不改变排产时间。</p>
          </div>
          <div className="panel-actions">
            <label className="field-label compact-field">
              排产方案
              <select className="field-input" value={selectedScheduleId} onChange={handleScheduleChange}>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.schedule_no}
                  </option>
                ))}
              </select>
            </label>
            <Link className="button ghost" to={buildSchedulePath("/schedule-results", selectedScheduleId)}>
              订单完工表
            </Link>
            <Link className="button ghost" to={buildScheduleBoardPath(selectedScheduleId)}>
              生产排班表
            </Link>
            <Link className="button ghost" to={buildSchedulePath("/work-order-tickets", selectedScheduleId)}>
              加工单中心
            </Link>
            <Link className="button ghost" to={buildSchedulePath("/gantt", selectedScheduleId)}>
              甘特图
            </Link>
            <button
              className="button"
              type="button"
              onClick={handlePreviewAutoAssign}
              disabled={loading || previewingAutoAssign || applyingAutoAssign || !selectedScheduleId}
            >
              {previewingAutoAssign ? "生成预览..." : "一键分配"}
            </button>
          </div>
        </div>

        <DispatchFilterBar
          dispatch={dispatch}
          filters={filters}
          loading={loading}
          onFilterChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          onQueryChange={setQuery}
          onSubmit={handleFilterSubmit}
          orders={orders}
          query={query}
          workCenters={workCenters}
        />
      </div>

      <div className="compact-summary-strip dispatch-summary-strip">
        <span>当前方案：<strong>{currentSchedule?.schedule_no || "--"}</strong><small>{currentSchedule?.name || "排产方案"}</small></span>
        <span>任务总数：<strong>{dispatch?.tasks?.length || 0}</strong></span>
        <span>未派工数：<strong>{unassignedCount}</strong></span>
        <span>已派工数：<strong>{assignedCount}</strong><small>{dispatch?.tasks?.length ? `${Math.round((assignedCount / dispatch.tasks.length) * 100)}%` : "0%"}</small></span>
        <span>已分摊工时：<strong>{minutesToHours(assignedMinutes)}</strong><small>任务工时 {minutesToHours(totalMinutes)}</small></span>
      </div>

      <div className="dispatch-layout">
        <div className="dispatch-main-stack">
          <div className="panel dispatch-view-switcher">
            <div className="segmented-control">
              <button
                className={viewMode === "detail" ? "active" : ""}
                type="button"
                onClick={() => handleViewModeChange("detail")}
              >
                明细视图
              </button>
              <button
                className={viewMode === "summary" ? "active" : ""}
                type="button"
                onClick={() => handleViewModeChange("summary")}
              >
                按工序汇总
              </button>
            </div>
          </div>
          {viewMode === "summary" ? (
            <OperationSummaryDispatchTable
              dispatch={dispatch}
              expandedGroupKeys={expandedGroupKeys}
              groups={operationGroups}
              loading={loading}
              onClearSelection={handleClearBatchSelection}
              onSelectFiltered={handleSelectFilteredTasks}
              onSelectTask={handleSelectTask}
              onToggleGroup={handleToggleGroup}
              onToggleGroupSelection={handleToggleGroupSelection}
              onToggleTask={handleToggleTaskSelection}
              selectedTaskIds={selectedTaskIds}
            />
          ) : (
            <DispatchTaskTable
              dispatch={dispatch}
              loading={loading}
              onSelectTask={handleSelectTask}
              selectedTaskId={selectedTaskId}
              tasks={visibleTasks}
            />
          )}
        </div>

        <PersonnelAllocationEditor
          batchMode={viewMode === "summary"}
          canSave={canSave}
          draft={draft}
          draftPersonIds={draftPersonIds}
          draftTotal={draftTotal}
          mismatchedDraftPeople={mismatchedDraftPeople}
          onAddRow={addDraftRow}
          onAssignSingleFull={assignSingleFull}
          onDistributeEvenly={distributeEvenly}
          onRemoveRow={removeDraftRow}
          onSave={handleSave}
          onUpdateRow={updateDraftRow}
          ratioDelta={ratioDelta}
          ratiosValid={ratiosValid}
          saving={saving}
          selectedBatchSummary={selectedBatchSummary}
          selectedTask={selectedTask}
          suggestedPersonnel={suggestedPersonnel}
        />
      </div>

      <PersonnelWorkloadTable
        exporting={exportingWorkload}
        expandedPersonId={expandedPersonId}
        onExport={handleExportWorkload}
        onTogglePerson={setExpandedPersonId}
        workload={workload}
      />

      {autoAssignPreview ? (
        <div className="modal-overlay" onClick={() => (applyingAutoAssign ? null : setAutoAssignPreview(null))}>
          <div className="modal-panel auto-assign-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h3 className="panel-title">一键分配预览</h3>
                <p className="panel-subtitle">仅处理当前筛选结果中的未派工和待补足任务，已派工任务不会被覆盖。</p>
              </div>
            </div>
            <div className="auto-assign-summary">
              <div className="detail-row">
                <span className="detail-key">可处理</span>
                <span className="detail-value">{autoAssignPreview.summary?.processable_count || 0} 条</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">跳过</span>
                <span className="detail-value">{autoAssignPreview.summary?.skipped_count || 0} 条</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">多人分摊</span>
                <span className="detail-value">{autoAssignPreview.summary?.multi_person_count || 0} 条</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">跨工段兜底</span>
                <span className="detail-value">{autoAssignPreview.summary?.cross_work_center_count || 0} 条</span>
              </div>
            </div>
            <button
              className="button ghost compact-button"
              type="button"
              onClick={() => setAutoAssignDetailsOpen((open) => !open)}
            >
              {autoAssignDetailsOpen ? "收起明细" : "展开明细"}
            </button>
            {autoAssignDetailsOpen ? (
              <div className="auto-assign-preview-list">
                {autoAssignPreview.tasks?.length ? autoAssignPreview.tasks.map((task) => (
                  <div className={`auto-assign-preview-item ${task.skipped ? "skipped" : ""}`} key={task.schedule_item_id}>
                    <div>
                      <p className="data-primary">{task.order_no} / {task.operation_name}</p>
                      <p className="data-secondary">
                        {task.drawing_no} / {task.part_name} / {task.work_center_name} / {minutesToHours(task.planned_minutes)}
                      </p>
                    </div>
                    {task.skipped ? (
                      <span className="badge warning">{task.skip_reason || "已跳过"}</span>
                    ) : (
                      <div className="auto-assign-people">
                        {task.allocations.map((allocation) => (
                          <span className="badge info" key={`${task.schedule_item_id}-${allocation.person_id}`}>
                            {allocation.person_name} {allocation.ratio_percent}%{allocation.cross_work_center ? " / 跨工段" : ""}{allocation.existing ? " / 已有" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="alert info">当前筛选条件下没有可一键分配的任务。</div>
                )}
              </div>
            ) : null}
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={() => setAutoAssignPreview(null)} disabled={applyingAutoAssign}>
                取消
              </button>
              <button
                className="button"
                type="button"
                onClick={handleApplyAutoAssign}
                disabled={applyingAutoAssign || !(autoAssignPreview.summary?.processable_count > 0)}
              >
                {applyingAutoAssign ? "分配中..." : "确认分配"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

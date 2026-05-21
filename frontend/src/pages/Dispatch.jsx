import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  getPersonnel,
  getPersonnelWorkload,
  getProductionSchedules,
  getProductionSchedulingOverview,
  getScheduleDispatch,
  getWorkCenters,
  getWorkOrders,
  saveScheduleItemPersonnelAllocations
} from "../api/production";
import CurrentScheduleBanner from "../components/common/CurrentScheduleBanner";
import DispatchFilterBar from "../components/dispatch/DispatchFilterBar";
import DispatchTaskTable, { allocationText } from "../components/dispatch/DispatchTaskTable";
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
    setDraft(buildDraft(selectedTask?.allocations));
  }, [selectedTaskId, selectedTask]);

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
    return (dispatch?.personnel || []).map((person) => {
      const detail = personnelById.get(String(person.id)) || {};
      return { ...person, ...detail };
    });
  }, [dispatch, personnelById]);

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
        && person.work_centers?.length
        && !person.work_centers.some((center) => center.id === selectedTask.work_center_id)
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

  const draftTotal = draft.reduce((sum, row) => sum + (Number(row.ratio_percent) || 0), 0);
  const ratioDelta = Math.round((100 - draftTotal) * 1000) / 1000;
  const draftPersonIds = draft.map((row) => row.person_id).filter(Boolean);
  const ratiosValid = draft.every((row) => {
    const ratio = Number(row.ratio_percent);
    return Number.isFinite(ratio) && ratio > 0 && ratio <= 100;
  });
  const canSave =
    selectedTask &&
    draft.length > 0 &&
    draftPersonIds.length === draft.length &&
    new Set(draftPersonIds).size === draftPersonIds.length &&
    ratiosValid &&
    Math.abs(ratioDelta) <= 0.001;

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
    if (!selectedTask || !canSave) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveScheduleItemPersonnelAllocations(
        selectedTask.schedule_item_id,
        draft.map((row) => ({
          person_id: Number(row.person_id),
          ratio_percent: Number(row.ratio_percent)
        }))
      );
      setMessage("派工分摊已保存，已自动定位下一条未派工任务。");
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
      setError(requestError?.response?.data?.detail || "派工保存失败。");
    } finally {
      setSaving(false);
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

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">派工与工时</h3>
            <p className="panel-subtitle">按排产明细把计划工时分摊给在职人员，保存时占比必须合计 100%。</p>
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
            <Link className="button ghost" to={buildSchedulePath("/gantt", selectedScheduleId)}>
              甘特图
            </Link>
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

      <div className="summary-grid">
        <div className="metric-card" style={{ "--metric-accent": "#315f88" }}>
          <p className="metric-label">当前方案</p>
          <p className="metric-value metric-value-text">{currentSchedule?.schedule_no || "--"}</p>
          <p className="metric-meta">{currentSchedule?.name || "排产方案"}</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#205c52" }}>
          <p className="metric-label">任务总数</p>
          <p className="metric-value">{dispatch?.tasks?.length || 0}</p>
          <p className="metric-meta">当前筛选结果</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#b97012" }}>
          <p className="metric-label">未派工数</p>
          <p className="metric-value">{unassignedCount}</p>
          <p className="metric-meta">含待补足任务</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#2d5d8c" }}>
          <p className="metric-label">已派工数</p>
          <p className="metric-value">{assignedCount}</p>
          <p className="metric-meta">{dispatch?.tasks?.length ? `${Math.round((assignedCount / dispatch.tasks.length) * 100)}%` : "0%"}</p>
        </div>
        <div className="metric-card" style={{ "--metric-accent": "#315f88" }}>
          <p className="metric-label">已分摊工时</p>
          <p className="metric-value">{minutesToHours(assignedMinutes)}</p>
          <p className="metric-meta">任务工时 {minutesToHours(totalMinutes)}</p>
        </div>
      </div>

      <div className="dispatch-layout">
        <DispatchTaskTable
          dispatch={dispatch}
          loading={loading}
          onSelectTask={setSelectedTaskId}
          selectedTaskId={selectedTaskId}
          tasks={visibleTasks}
        />

        <PersonnelAllocationEditor
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
          selectedTask={selectedTask}
          suggestedPersonnel={suggestedPersonnel}
        />
      </div>

      <PersonnelWorkloadTable
        expandedPersonId={expandedPersonId}
        onTogglePerson={setExpandedPersonId}
        workload={workload}
      />
    </section>
  );
}

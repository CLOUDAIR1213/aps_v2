import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getOperationMappingRules,
  getProductionOperations,
  getProductionSchedules,
  getProductionSchedulingOverview,
  getResourceMachines,
  getScheduleDispatch,
  getWorkCenters,
  getWorkOrders
} from "../api/production";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime } from "../utils/formatters";
import { buildSchedulePath, setActiveScheduleId } from "../utils/scheduleContext";

function statusTone(status) {
  if (status === "ready") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}

function getPrimaryAction({ hasBaseData, hasOrders, hasSchedule, latestScheduleId }) {
  if (!hasBaseData) {
    return {
      label: "去基础配置",
      to: "/setup",
      title: "先把排产前置数据补齐",
      description: "工段、设备和工序映射缺一项，系统就不能稳定生成排产方案。"
    };
  }
  if (!hasOrders) {
    return {
      label: "去工单导入",
      to: "/work-order-import",
      title: "下一步导入工单",
      description: "基础数据已经可用，先把 Excel 工艺表确认入库，再进入排产驾驶台。"
    };
  }
  if (!hasSchedule) {
    return {
      label: "去排产驾驶台",
      to: "/scheduling",
      title: "下一步生成当前排产",
      description: "已有可排订单，但还没有方案。选择订单和开始日期后运行排产。"
    };
  }
  return {
    label: "查看完工时间",
    to: buildSchedulePath("/schedule-results", latestScheduleId),
    title: "下一步复核订单完工表",
      description: "已有当前排产，先从订单预计完工、延期和锁定计划状态开始复核。"
  };
}

export default function Dashboard() {
  const [data, setData] = useState({
    centers: [],
    machines: [],
    mappings: [],
    operations: [],
    orders: [],
    schedules: [],
    overview: null,
    dispatch: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [centers, machines, mappings, operations, orders, scheduleData] = await Promise.all([
          getWorkCenters(),
          getResourceMachines(),
          getOperationMappingRules(),
          getProductionOperations(),
          getWorkOrders(),
          getProductionSchedules()
        ]);

        const schedules = scheduleData.schedules || [];
        const latestSchedule = schedules[0] || null;
        let overview = null;
        let dispatch = null;

        if (latestSchedule?.id) {
          setActiveScheduleId(latestSchedule.id);
          try {
            overview = await getProductionSchedulingOverview({ schedule_id: latestSchedule.id });
          } catch {
            overview = null;
          }
          try {
            dispatch = await getScheduleDispatch(latestSchedule.id);
          } catch {
            dispatch = null;
          }
        }

        setData({ centers, dispatch, machines, mappings, operations, orders, overview, schedules });
      } catch (requestError) {
        setError(requestError?.response?.data?.detail || "计划员工作台加载失败。");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const analysis = useMemo(() => {
    const activeCenters = data.centers.filter((center) => center.status !== "disabled");
    const internalCenters = activeCenters.filter((center) => !center.is_external);
    const activeMachines = data.machines.filter((machine) => machine.status === "active");
    const activeMappings = data.mappings.filter((mapping) => mapping.status !== "disabled");
    const internalWithoutMachine = internalCenters.filter(
      (center) => !activeMachines.some((machine) => machine.work_center_id === center.id)
    );
    const ordersWithOperations = new Set(data.operations.map((operation) => operation.work_order_id));
    const schedulableOrders = data.orders.filter((order) => ordersWithOperations.has(order.id));
    const pendingOperations = data.operations.filter((operation) => operation.status === "pending").length;

    const blockers = [];
    if (!activeCenters.length) {
      blockers.push("未配置启用工段");
    }
    if (internalWithoutMachine.length) {
      blockers.push(`${internalWithoutMachine.length} 个内部工段无启用设备`);
    }
    if (!activeMappings.length) {
      blockers.push("未配置可用工序映射");
    }

    const latestSchedule = data.schedules[0] || null;
    const workflowBlockers = [...blockers];
    if (!schedulableOrders.length) {
      workflowBlockers.push("还没有可排订单");
    }
    const unassignedTasks =
      data.dispatch?.tasks?.filter((task) => task.allocation_status !== "assigned").length ?? 0;
    const delayedOrders = data.overview?.delayed_orders ?? data.overview?.orders?.filter(
      (order) => order.status === "delayed"
    ).length ?? 0;
    const hasBaseData = blockers.length === 0;
    const hasOrders = schedulableOrders.length > 0;
    const hasSchedule = Boolean(latestSchedule);

    return {
      activeMachines,
      blockers,
      canSchedule: hasBaseData && hasOrders,
      delayedOrders,
      hasBaseData,
      hasOrders,
      hasSchedule,
      latestSchedule,
      pendingOperations,
      schedulableOrders,
      unassignedTasks,
      workflowBlockers
    };
  }, [data]);

  const primaryAction = getPrimaryAction({
    hasBaseData: analysis.hasBaseData,
    hasOrders: analysis.hasOrders,
    hasSchedule: analysis.hasSchedule,
    latestScheduleId: analysis.latestSchedule?.id
  });

  const cards = [
    {
      title: "是否可以排产",
      value: analysis.canSchedule ? "可以" : "暂不能",
      meta: analysis.canSchedule ? "可进入排产驾驶台" : "先处理阻塞项",
      accent: analysis.canSchedule ? "#237a57" : "#c2412f"
    },
    {
      title: "阻塞项数量",
      value: analysis.workflowBlockers.length,
      meta: analysis.workflowBlockers.length ? analysis.workflowBlockers[0] : "主流程无硬阻塞",
      accent: analysis.workflowBlockers.length ? "#c2412f" : "#237a57"
    },
    {
      title: "可排订单数",
      value: analysis.schedulableOrders.length,
      meta: `${analysis.pendingOperations} 道待排工序`,
      accent: "#315f88"
    },
    {
      title: "当前排产方案",
      value: analysis.latestSchedule?.schedule_no || "--",
      meta: analysis.latestSchedule ? formatDateTime(analysis.latestSchedule.created_at) : "尚未生成",
      accent: "#1f5d55"
    },
    {
      title: "延期订单数",
      value: analysis.delayedOrders,
      meta: analysis.hasSchedule ? "来自当前方案" : "生成方案后计算",
      accent: analysis.delayedOrders ? "#c2412f" : "#237a57"
    },
    {
      title: "未派工任务数",
      value: analysis.unassignedTasks,
      meta: analysis.hasSchedule ? "当前方案未分摊任务" : "排产后进入派工",
      accent: analysis.unassignedTasks ? "#d97706" : "#237a57"
    }
  ];

  return (
    <section className="page-grid planner-workbench">
      {error ? <div className="alert danger">{error}</div> : null}

      <CompactSummaryStrip className="dashboard-summary-strip" items={cards} loading={loading} />

      <div className="planner-command-panel">
        <div className="planner-command-copy">
          <StatusBadge tone={analysis.canSchedule ? "success" : "danger"}>
            {analysis.canSchedule ? "可排产" : "不可排产"}
          </StatusBadge>
          <h3>{primaryAction.title}</h3>
          <p>{primaryAction.description}</p>
        </div>
        <Link className="button planner-primary-action" to={primaryAction.to}>
          {primaryAction.label}
        </Link>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">主流程状态</h3>
              <p className="panel-subtitle">首页只判断下一步，不再展示综合大屏。</p>
            </div>
          </div>

          <div className="planner-flow-list">
            <div className={`planner-flow-item ${analysis.hasBaseData ? "ready" : "blocked"}`}>
              <span>1</span>
              <div>
                <p className="data-primary">基础配置</p>
                <p className="data-secondary">
                  {analysis.hasBaseData
                    ? `${analysis.activeMachines.length} 台启用设备，工序映射可用`
                    : "工段、设备或工序映射存在阻塞"}
                </p>
              </div>
              <StatusBadge tone={statusTone(analysis.hasBaseData ? "ready" : "blocked")}>
                {analysis.hasBaseData ? "已就绪" : "阻塞"}
              </StatusBadge>
            </div>

            <div className={`planner-flow-item ${analysis.hasOrders ? "ready" : "blocked"}`}>
              <span>2</span>
              <div>
                <p className="data-primary">工单导入</p>
                <p className="data-secondary">{`${analysis.schedulableOrders.length} 张可排订单`}</p>
              </div>
              <StatusBadge tone={statusTone(analysis.hasOrders ? "ready" : "blocked")}>
                {analysis.hasOrders ? "已就绪" : "待导入"}
              </StatusBadge>
            </div>

            <div className={`planner-flow-item ${analysis.hasSchedule ? "ready" : "risk"}`}>
              <span>3</span>
              <div>
                <p className="data-primary">排产方案</p>
                <p className="data-secondary">
                  {analysis.latestSchedule
                    ? `${analysis.latestSchedule.schedule_no} / ${analysis.latestSchedule.status}`
                    : "暂无方案"}
                </p>
              </div>
              <StatusBadge tone={statusTone(analysis.hasSchedule ? "ready" : "risk")}>
                {analysis.hasSchedule ? "已有方案" : "待排产"}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">阻塞项</h3>
              <p className="panel-subtitle">只列影响排产主流程的问题。</p>
            </div>
          </div>

          {analysis.workflowBlockers.length ? (
            <div className="planner-blocker-list">
              {analysis.workflowBlockers.map((blocker) => (
                <div className="planner-blocker-item" key={blocker}>
                  <StatusBadge tone="danger">阻塞</StatusBadge>
                  <p>{blocker}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert success">没有基础数据阻塞。下一步取决于工单和方案状态。</div>
          )}
        </div>
      </div>

      {analysis.latestSchedule ? (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">当前方案</h3>
              <p className="panel-subtitle">后续完工表、派工、排班表和甘特图默认围绕这个方案。</p>
            </div>
            <Link className="link-inline" to={buildSchedulePath("/schedule-results", analysis.latestSchedule.id)}>
              订单完工表
            </Link>
          </div>

          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-key">方案编号</span>
              <span className="detail-value">{analysis.latestSchedule.schedule_no}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">方案名称</span>
              <span className="detail-value">{analysis.latestSchedule.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">创建时间</span>
              <span className="detail-value">{formatDateTime(analysis.latestSchedule.created_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">方案状态</span>
              <StatusBadge tone="info">{analysis.latestSchedule.status}</StatusBadge>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

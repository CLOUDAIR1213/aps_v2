import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getOperationMappingRules,
  getPersonnel,
  getProductionOperations,
  getResourceGroups,
  getResourceMachines,
  getWorkCenters,
  getWorkOrders
} from "../api/production";
import StatusBadge from "../components/StatusBadge";
import SummaryCards from "../components/SummaryCards";
import { formatHours } from "../utils/formatters";

const STATUS_TEXT = {
  ready: "已完成",
  risk: "有风险",
  blocked: "阻塞",
  empty: "未开始"
};

const STATUS_TONE = {
  ready: "success",
  risk: "warning",
  blocked: "danger",
  empty: "neutral"
};

function buildIssue(severity, title, description, to, action) {
  return { action, description, severity, title, to };
}

export default function SetupCenter() {
  const [data, setData] = useState({
    centers: [],
    machines: [],
    personnel: [],
    mappings: [],
    groups: [],
    orders: [],
    operations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [centers, machines, personnel, mappings, groups, orders, operations] = await Promise.all([
          getWorkCenters(),
          getResourceMachines(),
          getPersonnel(),
          getOperationMappingRules(),
          getResourceGroups(),
          getWorkOrders(),
          getProductionOperations()
        ]);

        setData({ centers, groups, machines, mappings, operations, orders, personnel });
      } catch (requestError) {
        setError(requestError?.response?.data?.detail || "基础配置中心加载失败。");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const analysis = useMemo(() => {
    const activeCenters = data.centers.filter((center) => center.status !== "disabled");
    const internalCenters = activeCenters.filter((center) => !center.is_external);
    const externalCenters = activeCenters.filter((center) => center.is_external);
    const activeMachines = data.machines.filter((machine) => machine.status === "active");
    const activePersonnel = data.personnel.filter((person) => person.status !== "disabled");
    const confirmedMappings = data.mappings.filter((mapping) => mapping.status !== "disabled");
    const ordersWithOperations = new Set(data.operations.map((operation) => operation.work_order_id));
    const schedulableOrders = data.orders.filter((order) => ordersWithOperations.has(order.id));
    const totalHours = data.operations.reduce(
      (sum, operation) => sum + Number(operation.effective_duration_hours ?? operation.duration_hours ?? 0),
      0
    );
    const internalWithoutMachine = internalCenters.filter(
      (center) => !activeMachines.some((machine) => machine.work_center_id === center.id)
    );
    const centersWithoutPersonnel = activePersonnel.length ? [] : internalCenters;

    const issues = [];
    if (!data.centers.length) {
      issues.push(buildIssue("blocked", "还没有配置工段", "没有工段时 Excel 工序无法映射，也无法运行排产。", "/work-centers", "配置工段"));
    }
    if (internalWithoutMachine.length) {
      issues.push(buildIssue(
        "blocked",
        "内部工段缺少启用设备",
        `${internalWithoutMachine.map((center) => center.name).join("、")} 没有启用设备，相关工序会阻塞排产。`,
        "/work-centers",
        "补充设备"
      ));
    }
    if (!confirmedMappings.length) {
      issues.push(buildIssue("blocked", "工序映射未确认", "导入 Excel 前需要确认工序列名到系统工段的映射规则。", "/operation-mappings", "确认映射"));
    }
    if (!schedulableOrders.length) {
      issues.push(buildIssue("blocked", "还没有可排工单", "请先导入工艺表并确认入库，系统才能生成待排工序。", "/work-order-import", "导入工单"));
    }
    if (centersWithoutPersonnel.length) {
      issues.push(buildIssue(
        "risk",
        "部分工段缺少人员",
        `${centersWithoutPersonnel.length} 个内部工段没有人员档案。当前不阻塞排产，但会影响后续执行记录。`,
        "/personnel",
        "维护人员"
      ));
    }
    if (!data.groups.length) {
      issues.push(buildIssue("info", "尚未配置资源组", "资源组不阻塞排产，但会影响后续分组筛选和统计。", "/resource-groups", "配置分组"));
    }

    const steps = [
      {
        title: "工段配置",
        description: `${data.centers.length} 个工段，${externalCenters.length} 个外协工段`,
        status: data.centers.length ? "ready" : "blocked",
        to: "/work-centers"
      },
      {
        title: "设备配置",
        description: internalWithoutMachine.length
          ? `${internalWithoutMachine.length} 个内部工段无启用设备`
          : `${activeMachines.length} 台启用设备`,
        status: internalWithoutMachine.length ? "blocked" : activeMachines.length ? "ready" : "risk",
        to: "/work-centers"
      },
      {
        title: "人员配置",
        description: `${activePersonnel.length} 名启用人员`,
        status: centersWithoutPersonnel.length ? "risk" : activePersonnel.length ? "ready" : "risk",
        to: "/personnel"
      },
      {
        title: "工序映射",
        description: `${confirmedMappings.length} 条可用映射`,
        status: confirmedMappings.length ? "ready" : "blocked",
        to: "/operation-mappings"
      },
      {
        title: "工单导入检查",
        description: `${schedulableOrders.length} 张订单，${data.operations.length} 道工序`,
        status: schedulableOrders.length ? "ready" : "blocked",
        to: "/work-order-import"
      },
      {
        title: "运行排产",
        description: `${formatHours(totalHours)} 队列产能工时（按零件数量折算）`,
        status: issues.some((issue) => issue.severity === "blocked") ? "blocked" : "ready",
        to: "/scheduling"
      }
    ];

    const blockedCount = issues.filter((issue) => issue.severity === "blocked").length;
    const riskCount = issues.filter((issue) => issue.severity === "risk").length;
    const readyCount = steps.filter((step) => step.status === "ready").length;
    const score = Math.round((readyCount / steps.length) * 100);

    return {
      activeMachines,
      activePersonnel,
      blockedCount,
      issues,
      riskCount,
      schedulableOrders,
      score,
      steps,
      totalHours
    };
  }, [data]);

  const cards = [
    {
      title: "排产准备度",
      value: `${analysis.score}%`,
      meta: analysis.blockedCount ? `${analysis.blockedCount} 个阻塞项` : "关键数据已就绪",
      accent: analysis.blockedCount ? "#c2412f" : "#237a57"
    },
    {
      title: "工段 / 设备",
      value: `${data.centers.length} / ${analysis.activeMachines.length}`,
      meta: "工段与启用设备",
      accent: "#1f5d55"
    },
    {
      title: "人员档案",
      value: analysis.activePersonnel.length,
      meta: analysis.riskCount ? `${analysis.riskCount} 个风险提醒` : "当前不作为排产硬约束",
      accent: "#315f88"
    },
    {
      title: "可排订单",
      value: analysis.schedulableOrders.length,
      meta: `${data.operations.length} 道工序 / ${formatHours(analysis.totalHours)} 产能工时（按零件数量折算）`,
      accent: "#d97706"
    }
  ];

  return (
    <section className="page-grid setup-center">
      {error ? <div className="alert danger">{error}</div> : null}
      <SummaryCards cards={cards} loading={loading} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">六步配置进度</h3>
            <p className="panel-subtitle">按业务顺序检查排产前置数据。阻塞项处理完后再进入排产驾驶台。</p>
          </div>
          <Link className="button small" to="/scheduling">进入排产驾驶台</Link>
        </div>

        <div className="setup-progress-grid">
          {analysis.steps.map((step, index) => (
            <Link className={`setup-progress-card ${step.status}`} key={step.title} to={step.to}>
              <span className="setup-progress-index">{index + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
              <StatusBadge tone={STATUS_TONE[step.status]}>{STATUS_TEXT[step.status]}</StatusBadge>
            </Link>
          ))}
        </div>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">数据健康检查</h3>
              <p className="panel-subtitle">阻塞、风险、提醒分开处理，避免把所有问题混在一起。</p>
            </div>
          </div>

          {analysis.issues.length ? (
            <div className="health-list">
              {analysis.issues.map((issue) => (
                <div className={`health-item ${issue.severity}`} key={issue.title}>
                  <div>
                    <StatusBadge
                      tone={issue.severity === "blocked" ? "danger" : issue.severity === "risk" ? "warning" : "info"}
                    >
                      {issue.severity === "blocked" ? "阻塞" : issue.severity === "risk" ? "风险" : "提醒"}
                    </StatusBadge>
                    <h4>{issue.title}</h4>
                    <p>{issue.description}</p>
                  </div>
                  <Link className="button small ghost" to={issue.to}>{issue.action}</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <h3 className="empty-state-title">暂无阻塞项</h3>
              <p className="empty-state-copy">基础数据已经具备排产条件，可以进入排产驾驶台。</p>
              <Link className="button" to="/scheduling">进入排产</Link>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">主数据概况</h3>
              <p className="panel-subtitle">这里只做准备度判断，复杂排产计算仍由后端完成。</p>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-key">工段</span>
              <span className="detail-value">{data.centers.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">设备</span>
              <span className="detail-value">{data.machines.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">人员</span>
              <span className="detail-value">{data.personnel.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">映射规则</span>
              <span className="detail-value">{data.mappings.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">资源组</span>
              <span className="detail-value">{data.groups.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">订单</span>
              <span className="detail-value">{data.orders.length}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { buildScheduleBoardPath, buildSchedulePath } from "./utils/scheduleContext";

const navSections = [
  {
    title: "计划员主线",
    items: [
      {
        to: "/",
        label: "运行总览",
        hint: "进入系统后的下一步",
        code: "01"
      },
      {
        to: "/work-order-import",
        label: "工单导入",
        hint: "上传、预览、确认入库",
        code: "02"
      },
      {
        to: "/scheduling",
        label: "排产驾驶台",
        hint: "选择订单并生成方案",
        code: "03"
      },
      {
        to: "/schedule-results",
        label: "订单完工表",
        hint: "预计完工、延期、锁定计划",
        code: "04"
      },
      {
        to: "/dispatch",
        label: "派工与工时",
        hint: "任务分摊到执行人员",
        code: "05"
      },
      {
        to: "/work-order-tickets",
        label: "加工单中心",
        hint: "导出车间执行单据",
        code: "06"
      },
      {
        to: "/external-tasks",
        label: "外协管理",
        hint: "送出、返回和异常",
        code: "07"
      },
      {
        to: "/scheduling/board",
        label: "生产排班表",
        hint: "按日期复核任务排布",
        code: "08"
      },
      {
        to: "/gantt",
        label: "甘特图",
        hint: "设备和外协时间轴",
        code: "09"
      },
      {
        to: "/setup",
        label: "基础配置",
        hint: "工段、设备、人员、映射",
        code: "10"
      }
    ]
  },
  {
    title: "管理查看",
    items: [
      {
        to: "/management-dashboard",
        label: "交付风险看板",
        hint: "老板查看交期风险",
        code: "11"
      }
    ]
  }
];

const pageMeta = {
  "/": {
    eyebrow: "运行总览",
    title: "计划员工作台",
    description: "先判断能不能排产，再把工单、方案、完工时间和派工任务按顺序串起来。",
    focus: "下一步"
  },
  "/setup": {
    eyebrow: "基础配置",
    title: "基础配置",
    description: "集中查看工段、设备、人员、工序映射、工单导入和排产准备度。",
    focus: "排产前置"
  },
  "/work-centers": {
    eyebrow: "基础配置",
    title: "工段与设备配置",
    description: "维护内部工段、外协工段、设备产能和启停状态，决定排产资源边界。",
    focus: "资源可用性"
  },
  "/operation-mappings": {
    eyebrow: "基础配置",
    title: "工序列名到工段映射",
    description: "将 Excel 工艺表的工序列稳定映射到系统工段，避免导入时静默丢失工序。",
    focus: "映射完整性"
  },
  "/personnel": {
    eyebrow: "基础配置",
    title: "执行人员档案",
    description: "维护人员和所属工段，为后续报工、派工和人员视图提供基础数据。",
    focus: "人员覆盖"
  },
  "/resource-groups": {
    eyebrow: "基础配置",
    title: "资源分组管理",
    description: "把工段、设备和人员按业务口径归类，便于后续筛选和统计。",
    focus: "资源组织"
  },
  "/work-order-import": {
    eyebrow: "工单导入",
    title: "工单导入",
    description: "先预览 Excel 工艺表的零件、工序、工时和异常，再确认入库进入排产队列。",
    focus: "导入校验"
  },
  "/scheduling": {
    eyebrow: "排产驾驶台",
    title: "排产驾驶台",
    description: "选择订单范围和开始日期执行排产。每次运行生成新方案，不覆盖历史方案。",
    focus: "排产范围"
  },
  "/schedule-results": {
    eyebrow: "订单完工表",
    title: "订单完工表",
    description: "从订单维度查看预计开始、预计完成、延期天数、瓶颈和锁定计划状态。",
    focus: "完工时间"
  },
  "/dispatch": {
    eyebrow: "派工与工时",
    title: "派工与工时",
    description: "按排产明细分配执行人员，占比合计 100% 后形成计划工时快照。",
    focus: "未派工任务"
  },
  "/work-order-tickets": {
    eyebrow: "加工单中心",
    title: "加工单中心",
    description: "从已完整派工的内部任务生成车间执行加工单，导出时记录筛选范围和任务清单。",
    focus: "执行单据"
  },
  "/external-tasks": {
    eyebrow: "外协管理",
    title: "外协管理",
    description: "维护外协任务的送出、预计返回、实际返回和异常状态，返回时间会参与后续排产重算。",
    focus: "外协队列"
  },
  "/scheduling/orders": {
    eyebrow: "订单完工表",
    title: "订单排产详情",
    description: "下钻到零件和工序，解释预计完成时间、关键路径和前后置依赖。",
    focus: "排产解释"
  },
  "/scheduling/board": {
    eyebrow: "生产排班表",
    title: "生产排班表",
    description: "按工段、设备或人员查看排产方案的日期矩阵，用于复核每日任务、外协和逾期占用。",
    focus: "排班矩阵"
  },
  "/gantt": {
    eyebrow: "甘特图",
    title: "甘特图",
    description: "按设备时间轴查看任务占用、等待和瓶颈，辅助判断方案是否可执行。",
    focus: "资源时间轴"
  },
  "/management-dashboard": {
    eyebrow: "管理查看",
    title: "交付风险看板",
    description: "给老板查看延期、临近交期、瓶颈资源和外协影响，主流程仍以计划员排产和派工为准。",
    focus: "交付风险"
  }
};

const pageActions = {
  "/": [],
  "/setup": [
    { to: "/work-order-import", label: "导入工单" },
    { to: "/scheduling", label: "排产驾驶台", variant: "ghost" }
  ],
  "/work-centers": [
    { to: "/setup", label: "返回基础配置", variant: "ghost" },
    { to: "/operation-mappings", label: "工序映射" }
  ],
  "/operation-mappings": [
    { to: "/setup", label: "返回基础配置", variant: "ghost" },
    { to: "/work-order-import", label: "导入工单" }
  ],
  "/personnel": [
    { to: "/setup", label: "返回基础配置", variant: "ghost" },
    { to: "/resource-groups", label: "资源分组" }
  ],
  "/resource-groups": [
    { to: "/setup", label: "返回基础配置", variant: "ghost" },
    { to: "/scheduling", label: "排产驾驶台" }
  ],
  "/work-order-import": [
    { to: "/setup", label: "基础配置", variant: "ghost" },
    { to: "/scheduling", label: "排产驾驶台" }
  ],
  "/scheduling": [
    { to: "/work-order-import", label: "工单导入", variant: "ghost" },
    { to: "/schedule-results", label: "订单完工表" }
  ],
  "/schedule-results": [
    { to: "/scheduling", label: "重新排产", variant: "ghost" },
    { to: "/dispatch", label: "派工与工时" }
  ],
  "/dispatch": [
    { to: "/schedule-results", label: "订单完工表", variant: "ghost" },
    { to: "/work-order-tickets", label: "加工单中心" }
  ],
  "/work-order-tickets": [
    { to: "/dispatch", label: "派工与工时", variant: "ghost" },
    { to: "/external-tasks", label: "外协管理" }
  ],
  "/external-tasks": [
    { to: "/work-order-tickets", label: "加工单中心", variant: "ghost" },
    { to: "/scheduling/board", label: "生产排班表" }
  ],
  "/scheduling/orders": [
    { to: "/schedule-results", label: "订单完工表", variant: "ghost" },
    { to: "/gantt", label: "甘特图" }
  ],
  "/scheduling/board": [
    { to: "/schedule-results", label: "订单完工表", variant: "ghost" },
    { to: "/gantt", label: "甘特图" }
  ],
  "/gantt": [
    { to: "/schedule-results", label: "订单完工表", variant: "ghost" },
    { to: "/management-dashboard", label: "交付风险看板" }
  ],
  "/management-dashboard": [
    { to: "/schedule-results", label: "订单完工表", variant: "ghost" },
    { to: "/gantt", label: "甘特图" }
  ]
};

const workflowByPath = {
  "/": 0,
  "/setup": 0,
  "/work-centers": 0,
  "/operation-mappings": 0,
  "/personnel": 0,
  "/resource-groups": 0,
  "/work-order-import": 1,
  "/scheduling": 2,
  "/schedule-results": 3,
  "/dispatch": 4,
  "/work-order-tickets": 5,
  "/external-tasks": 5,
  "/scheduling/board": 5,
  "/gantt": 5,
  "/management-dashboard": 5
};

export const workflowSteps = ["基础配置", "工单导入", "排产", "完工表", "派工", "复核"];

export function getNavSections() {
  return navSections;
}

export function getPageMeta(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return pageMeta["/scheduling/orders"];
  }
  if (pathname.startsWith("/scheduling/board")) {
    return pageMeta["/scheduling/board"];
  }
  return pageMeta[pathname] || pageMeta["/"];
}

export function getPageActions(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return pageActions["/scheduling/orders"];
  }
  if (pathname.startsWith("/scheduling/board")) {
    return pageActions["/scheduling/board"];
  }
  return pageActions[pathname] || pageActions["/"];
}

export function getWorkflowIndex(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return 3;
  }
  if (pathname.startsWith("/scheduling/board")) {
    return 5;
  }
  return workflowByPath[pathname] ?? 0;
}

export function getActiveNavPath(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return "/schedule-results";
  }
  if (pathname.startsWith("/scheduling/board")) {
    return "/scheduling/board";
  }
  if (["/work-centers", "/operation-mappings", "/personnel", "/resource-groups"].includes(pathname)) {
    return "/setup";
  }
  return pathname;
}

export function getNavigationTarget(path) {
  if (path === "/schedule-results" || path === "/dispatch" || path === "/work-order-tickets" || path === "/external-tasks" || path === "/gantt" || path === "/management-dashboard") {
    return buildSchedulePath(path);
  }
  if (path === "/scheduling/board") {
    return buildScheduleBoardPath();
  }
  return path;
}

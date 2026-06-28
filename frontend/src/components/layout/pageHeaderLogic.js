import { buildScheduleBoardPath, buildSchedulePath } from "../../utils/scheduleContext.js";

export function resolveActionTo(to) {
  if (["/schedule-results", "/dispatch", "/gantt", "/management-dashboard"].includes(to)) {
    return buildSchedulePath(to);
  }
  if (to === "/scheduling/board") {
    return buildScheduleBoardPath();
  }
  return to;
}

export const productionModules = [
  { to: "/work-order-import", label: "工单导入" },
  { to: "/work-centers", label: "工作中心" },
  { to: "/operation-mappings", label: "工序映射" },
  { to: "/resource-groups", label: "资源分组" },
  { to: "/personnel", label: "人员档案" },
  { to: "/scheduling", label: "排产计划" },
  { to: "/schedule-results", label: "排产结果" },
  { to: "/dispatch", label: "派工任务" },
  { to: "/external-tasks", label: "来料计划" },
  { to: "/scheduling/board", label: "生产日历" }
];

export function getActiveModule(pathname) {
  if (pathname.startsWith("/scheduling/board")) return "/scheduling/board";
  if (pathname.startsWith("/schedule-results")) return "/schedule-results";
  if (pathname.startsWith("/dispatch")) return "/dispatch";
  if (pathname.startsWith("/external-tasks")) return "/external-tasks";
  if (pathname.startsWith("/scheduling")) return "/scheduling";
  if (pathname.startsWith("/work-centers")) return "/work-centers";
  if (pathname.startsWith("/operation-mappings")) return "/operation-mappings";
  if (pathname.startsWith("/personnel")) return "/personnel";
  if (pathname.startsWith("/resource-groups")) return "/resource-groups";
  if (pathname.startsWith("/work-order-import")) return "/work-order-import";
  return "";
}

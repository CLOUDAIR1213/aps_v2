import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import { formatDate } from "./utils/formatters";

const navItems = [
  {
    to: "/",
    code: "DB",
    label: "\u9996\u9875",
    hint: "\u603b\u89c8\u4e0e\u98ce\u9669",
    group: "\u8fd0\u884c\u603b\u89c8"
  },
  {
    to: "/work-order-import",
    code: "IMP",
    label: "工单导入",
    hint: "Excel 预览与入库",
    group: "\u6570\u636e\u51c6\u5907"
  },
  {
    to: "/work-centers",
    code: "CFG",
    label: "资源配置",
    hint: "工段与设备道",
    group: "\u6570\u636e\u51c6\u5907"
  },  {
    to: "/operation-mappings",
    code: "MAP",
    label: "工序映射",
    hint: "Excel 列名到工段",
    group: "数据准备"
  },
  {
    to: "/personnel",
    code: "PER",
    label: "人员档案",
    hint: "花名册与工段关联",
    group: "数据准备"
  },
  {
    to: "/resource-groups",
    code: "RSG",
    label: "资源分组",
    hint: "工段与设备归类",
    group: "数据准备"
  },

  {
    to: "/scheduling",
    code: "SCH",
    label: "\u6392\u4ea7\u9a7e\u9a76\u53f0",
    hint: "\u961f\u5217\u4e0e\u4e00\u952e\u6392\u4ea7",
    group: "\u8ba1\u5212\u6267\u884c"
  },
  {
    to: "/schedule-results",
    code: "OUT",
    label: "订单排产总览",
    hint: "订单完成与延期风险",
    group: "\u8ba1\u5212\u590d\u76d8"
  },
  {
    to: "/gantt",
    code: "GNT",
    label: "\u7518\u7279\u56fe",
    hint: "\u673a\u53f0\u65f6\u95f4\u8f74",
    group: "\u8ba1\u5212\u590d\u76d8"
  },
  {
    to: "/machines",
    code: "MCH",
    label: "\u8bbe\u5907\u7ba1\u7406",
    hint: "\u8d44\u6e90\u4e3b\u6570\u636e",
    group: "\u57fa\u7840\u8d44\u6599"
  },
  {
    to: "/orders",
    code: "ORD",
    label: "\u8ba2\u5355\u7ba1\u7406",
    hint: "\u4ea4\u671f\u4e0e\u4f18\u5148\u7ea7",
    group: "\u57fa\u7840\u8d44\u6599"
  },
  {
    to: "/routings",
    code: "RTE",
    label: "\u5de5\u827a\u8def\u7ebf",
    hint: "\u5de5\u5e8f\u4e0e\u673a\u53f0\u7ea6\u675f",
    group: "\u57fa\u7840\u8d44\u6599"
  }
];

const navGroups = ["\u8fd0\u884c\u603b\u89c8", "\u6570\u636e\u51c6\u5907", "\u8ba1\u5212\u6267\u884c", "\u8ba1\u5212\u590d\u76d8", "\u57fa\u7840\u8d44\u6599"];

const pageMeta = {
  "/": {
    eyebrow: "APS control",
    title: "\u8f7b\u91cf APS \u6392\u4ea7\u4e2d\u63a7",
    description:
      "\u56f4\u7ed5\u8ba2\u5355\u3001\u673a\u53f0\u3001\u5de5\u827a\u548c\u6392\u4ea7\u7ed3\u679c\u5efa\u7acb\u4e00\u4e2a\u53ef\u89c2\u5bdf\u3001\u53ef\u6267\u884c\u7684\u8ba1\u5212\u5de5\u4f5c\u533a\u3002",
    focus: "\u8fd0\u884c\u89c6\u56fe"
  },
  "/work-order-import": {
    eyebrow: "Work order import",
    title: "工单导入与解析确认",
    description:
      "上传工艺表，补充订单信息，先预览零件、工序、工时和异常，再确认进入排产队列。",
    focus: "导入校验"
  },
  "/work-centers": {
    eyebrow: "Resource settings",
    title: "资源工段与设备产能",
    description:
      "维护 Excel 工序列到内部工段、外协资源和设备道的映射，决定排产时的产能约束。",
    focus: "资源模型"
  },
  "/operation-mappings": {
    eyebrow: "Operation mapping",
    title: "工序列名到工段映射",
    description:
      "将 Excel 工艺表的工序列名映射到系统工段，导入时自动识别和分配。",
    focus: "映射配置"
  },
  "/personnel": {
    eyebrow: "Personnel archive",
    title: "人员花名册与工段关联",
    description:
      "查看和管理人员档案，按工段关联分组，支持从排班表批量导入。",
    focus: "人员管理"
  },
  "/resource-groups": {
    eyebrow: "Resource groups",
    title: "资源分组管理",
    description:
      "将工段和设备归类到资源组，便于分组管理和统计。",
    focus: "资源归类"
  },
  "/scheduling": {
    eyebrow: "Scheduling cockpit",
    title: "\u5f85\u6392\u4ea7\u961f\u5217\u4e0e\u6267\u884c\u63a7\u5236",
    description:
      "\u5148\u786e\u8ba4\u961f\u5217\u3001\u4ea4\u671f\u98ce\u9669\u548c\u673a\u53f0\u8986\u76d6\uff0c\u518d\u8fd0\u884c\u89c4\u5219\u6392\u4ea7\uff0c\u907f\u514d\u5728\u65e0\u6570\u636e\u4e0a\u76f4\u63a5\u70b9\u64cd\u4f5c\u3002",
    focus: "\u6392\u4ea7\u51b3\u7b56"
  },
  "/schedule-results": {
    eyebrow: "订单总览",
    title: "订单级排产总览",
    description:
      "默认从订单维度查看预计开始、预计完成、延期风险和资源负荷，再下钻到零件与工序。",
    focus: "订单交付"
  },
  "/scheduling/orders": {
    eyebrow: "订单解释",
    title: "订单排产详情",
    description:
      "从订单下钻到零件和工序，解释预计完成时间、关键工序和前后置依赖。",
    focus: "排产解释"
  },
  "/gantt": {
    eyebrow: "Machine timeline",
    title: "\u673a\u53f0\u6392\u4ea7\u65f6\u95f4\u8f74",
    description:
      "\u6309\u8bbe\u5907\u89c2\u5bdf\u8f6c\u5e8f\u3001\u5360\u7528\u548c\u7a7a\u7a97\uff0c\u4fbf\u4e8e\u5feb\u901f\u8bc6\u522b\u74f6\u9888\u673a\u53f0\u3002",
    focus: "\u673a\u53f0\u89c6\u56fe"
  },
  "/machines": {
    eyebrow: "Master data",
    title: "\u8bbe\u5907\u8d44\u6e90",
    description:
      "\u7ef4\u62a4\u6392\u4ea7\u7684\u57fa\u7840\u673a\u53f0\u4e0e\u4ea7\u80fd\u53c2\u6570\uff0c\u8fd9\u4e9b\u503c\u76f4\u63a5\u51b3\u5b9a\u961f\u5217\u53ef\u7528\u6027\u3002",
    focus: "\u8d44\u6e90\u57fa\u7840"
  },
  "/orders": {
    eyebrow: "Order intake",
    title: "\u8ba2\u5355\u4e0e\u4ea4\u671f",
    description:
      "\u7ef4\u62a4\u8ba2\u5355\u6570\u91cf\u3001\u4f18\u5148\u7ea7\u548c\u4ea4\u671f\uff0c\u4e3a\u5f85\u6392\u4ea7\u4efb\u52a1\u751f\u6210\u63d0\u4f9b\u5165\u53e3\u3002",
    focus: "\u4ea4\u671f\u63a7\u5236"
  },
  "/routings": {
    eyebrow: "Process route",
    title: "\u5de5\u827a\u4e0e\u5de5\u5e8f",
    description:
      "\u7ef4\u62a4\u8ba2\u5355\u7684\u52a0\u5de5\u8def\u5f84\uff0c\u786e\u8ba4\u6bcf\u9053\u5de5\u5e8f\u7684\u673a\u53f0\u6307\u5411\u548c\u52a0\u5de5\u65f6\u957f\u3002",
    focus: "\u5de5\u827a\u7ea6\u675f"
  }
};

const workflowSteps = [
  "\u57fa\u7840\u8d44\u6599",
  "\u5de5\u827a\u8def\u7ebf",
  "\u751f\u6210\u5f85\u6392\u4ea7\u4efb\u52a1",
  "\u8fd0\u884c\u89c4\u5219\u6392\u4ea7",
  "\u590d\u76d8\u673a\u53f0\u7ed3\u679c"
];

const workflowByPath = {
  "/": 4,
  "/machines": 0,
  "/orders": 0,
  "/work-centers": 0,
  "/operation-mappings": 0,
  "/personnel": 0,
  "/resource-groups": 0,
  "/routings": 1,
  "/work-order-import": 2,
  "/scheduling": 3,
  "/schedule-results": 4,
  "/gantt": 4
};

const pageActions = {
  "/": [
    { to: "/work-order-import", label: "\u5bfc\u5165\u5de5\u5355", variant: "" },
    { to: "/scheduling", label: "\u8fdb\u5165\u6392\u4ea7", variant: "ghost" }
  ],
  "/work-order-import": [
    { to: "/work-centers", label: "\u68c0\u67e5\u8d44\u6e90", variant: "ghost" },
    { to: "/scheduling", label: "\u67e5\u770b\u961f\u5217", variant: "" }
  ],
  "/work-centers": [
    { to: "/work-order-import", label: "\u5bfc\u5165\u5de5\u5355", variant: "ghost" },
    { to: "/machines", label: "\u8bbe\u5907\u4e3b\u6570\u636e", variant: "" }
  ],
  "/scheduling": [
    { to: "/work-order-import", label: "\u8865\u5145\u5de5\u5355", variant: "ghost" },
    { to: "/schedule-results", label: "\u67e5\u770b\u7ed3\u679c", variant: "" }
  ],
  "/schedule-results": [
    { to: "/gantt", label: "\u7518\u7279\u56fe", variant: "" },
    { to: "/scheduling", label: "\u91cd\u65b0\u6392\u4ea7", variant: "ghost" }
  ],
  "/scheduling/orders": [
    { to: "/schedule-results", label: "订单总览", variant: "ghost" },
    { to: "/gantt", label: "资源甘特图", variant: "" }
  ],
  "/gantt": [
    { to: "/schedule-results", label: "\u56de\u5230\u7ed3\u679c", variant: "ghost" },
    { to: "/scheduling", label: "\u8c03\u6574\u961f\u5217", variant: "" }
  ],
  "/machines": [
    { to: "/work-centers", label: "\u8d44\u6e90\u914d\u7f6e", variant: "" },
    { to: "/routings", label: "\u5de5\u827a\u8def\u7ebf", variant: "ghost" }
  ],
  "/orders": [
    { to: "/work-order-import", label: "\u6279\u91cf\u5bfc\u5165", variant: "" },
    { to: "/scheduling", label: "\u6392\u4ea7\u961f\u5217", variant: "ghost" }
  ],
  "/operation-mappings": [
    { to: "/work-order-import", label: "工单导入", variant: "ghost" },
    { to: "/work-centers", label: "资源配置", variant: "" }
  ],
  "/personnel": [
    { to: "/work-centers", label: "资源配置", variant: "ghost" },
    { to: "/operation-mappings", label: "工序映射", variant: "" }
  ],
  "/resource-groups": [
    { to: "/work-centers", label: "资源配置", variant: "ghost" },
    { to: "/personnel", label: "人员档案", variant: "" }
  ],
  "/routings": [
    { to: "/orders", label: "\u8ba2\u5355", variant: "ghost" },
    { to: "/scheduling", label: "\u751f\u6210\u8ba1\u5212", variant: "" }
  ]
};

function getPageMeta(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return pageMeta["/scheduling/orders"];
  }
  return pageMeta[pathname] || pageMeta["/"];
}

function getPageActions(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return pageActions["/scheduling/orders"];
  }
  return pageActions[pathname] || pageActions["/"];
}

function getWorkflowIndex(pathname) {
  if (pathname.startsWith("/scheduling/orders/")) {
    return 4;
  }
  return workflowByPath[pathname] ?? 0;
}

export default function App() {
  const location = useLocation();
  const meta = getPageMeta(location.pathname);
  const activeWorkflowIndex = getWorkflowIndex(location.pathname);
  const actions = getPageActions(location.pathname);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aps_user"));
    } catch {
      return null;
    }
  });

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("aps_user");
    setUser(null);
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-tag">APS demo</span>
          <h1 className="sidebar-title">APS{"\n"}Planning</h1>
          <p className="sidebar-copy">
            {"\u9762\u5411\u673a\u68b0\u52a0\u5de5\u573a\u666f\u7684\u8f7b\u91cf APS \u524d\u7aef\u5de5\u4f5c\u533a\uff0c\u5f3a\u8c03\u53ef\u89c1\u6027\u3001\u961f\u5217\u5bc6\u5ea6\u548c\u64cd\u4f5c\u8def\u5f84\u6e05\u6670\u3002"}
          </p>
        </div>

        <nav className="sidebar-nav" aria-label="APS navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-group-title">{group}</p>
              <ul className="nav-list">
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                      >
                        <span className="nav-code">{item.code}</span>
                        <span className="nav-text">
                          <span className="nav-label">{item.label}</span>
                          <span className="nav-hint">{item.hint}</span>
                        </span>
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-flow">
          <p className="sidebar-flow-title">workflow</p>
          <ol className="sidebar-flow-list">
            {workflowSteps.map((step, index) => (
              <li
                key={step}
                className={`sidebar-flow-item${index === activeWorkflowIndex ? " active" : ""}`}
              >
                <span className="flow-index">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-copy">
            <span className="topbar-eyebrow">{meta.eyebrow}</span>
            <h2 className="topbar-title">{meta.title}</h2>
            <p className="topbar-description">{meta.description}</p>
          </div>

          <div className="topbar-toolbar">
            <div className="topbar-actions" aria-label="Page actions">
              {actions.map((action) => (
                <Link
                  key={action.to}
                  className={`button small ${action.variant}`.trim()}
                  to={action.to}
                >
                  {action.label}
                </Link>
              ))}
            </div>

            <div className="topbar-meta">
              <div className="meta-card">
                <p className="meta-label">focus</p>
                <p className="meta-value">{meta.focus}</p>
              </div>
              <div className="meta-card">
                <p className="meta-label">user</p>
                <p className="meta-value">{`${user.username} / ${user.role}`}</p>
                <button className="link-button" type="button" onClick={handleLogout}>
                  退出登录
                </button>
              </div>
              <div className="meta-card">
                <p className="meta-label">date</p>
                <p className="meta-value">{formatDate(new Date())}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

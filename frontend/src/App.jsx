import { NavLink, Outlet, useLocation } from "react-router-dom";

import { formatDate } from "./utils/formatters";

const navItems = [
  {
    to: "/",
    code: "DB",
    label: "\u9996\u9875",
    hint: "\u603b\u89c8\u4e0e\u98ce\u9669"
  },
  {
    to: "/scheduling",
    code: "SCH",
    label: "\u6392\u4ea7\u9a7e\u9a76\u53f0",
    hint: "\u961f\u5217\u4e0e\u4e00\u952e\u6392\u4ea7"
  },
  {
    to: "/schedule-results",
    code: "RES",
    label: "\u6392\u4ea7\u7ed3\u679c",
    hint: "\u65b9\u6848\u4e0e\u8bbe\u5907\u8d1f\u8377"
  },
  {
    to: "/gantt",
    code: "GNT",
    label: "\u7518\u7279\u56fe",
    hint: "\u673a\u53f0\u65f6\u95f4\u8f74"
  },
  {
    to: "/machines",
    code: "MCH",
    label: "\u8bbe\u5907\u7ba1\u7406",
    hint: "\u8d44\u6e90\u4e3b\u6570\u636e"
  },
  {
    to: "/orders",
    code: "ORD",
    label: "\u8ba2\u5355\u7ba1\u7406",
    hint: "\u4ea4\u671f\u4e0e\u4f18\u5148\u7ea7"
  },
  {
    to: "/routings",
    code: "RTE",
    label: "\u5de5\u827a\u8def\u7ebf",
    hint: "\u5de5\u5e8f\u4e0e\u673a\u53f0\u7ea6\u675f"
  }
];

const pageMeta = {
  "/": {
    eyebrow: "APS control",
    title: "\u8f7b\u91cf APS \u6392\u4ea7\u4e2d\u63a7",
    description:
      "\u56f4\u7ed5\u8ba2\u5355\u3001\u673a\u53f0\u3001\u5de5\u827a\u548c\u6392\u4ea7\u7ed3\u679c\u5efa\u7acb\u4e00\u4e2a\u53ef\u89c2\u5bdf\u3001\u53ef\u6267\u884c\u7684\u8ba1\u5212\u5de5\u4f5c\u533a\u3002",
    focus: "\u8fd0\u884c\u89c6\u56fe"
  },
  "/scheduling": {
    eyebrow: "Scheduling cockpit",
    title: "\u5f85\u6392\u4ea7\u961f\u5217\u4e0e\u6267\u884c\u63a7\u5236",
    description:
      "\u5148\u786e\u8ba4\u961f\u5217\u3001\u4ea4\u671f\u98ce\u9669\u548c\u673a\u53f0\u8986\u76d6\uff0c\u518d\u8fd0\u884c\u89c4\u5219\u6392\u4ea7\uff0c\u907f\u514d\u5728\u65e0\u6570\u636e\u4e0a\u76f4\u63a5\u70b9\u64cd\u4f5c\u3002",
    focus: "\u6392\u4ea7\u51b3\u7b56"
  },
  "/schedule-results": {
    eyebrow: "Execution result",
    title: "\u6700\u65b0\u6392\u4ea7\u65b9\u6848",
    description:
      "\u5bf9\u6700\u8fd1\u4e00\u6b21\u6392\u4ea7\u7684\u8d1f\u8377\u3001\u65f6\u95f4\u7a97\u548c\u4ea4\u671f\u98ce\u9669\u8fdb\u884c\u590d\u76d8\uff0c\u786e\u5b9a\u662f\u5426\u53ef\u4ee5\u53d1\u5e03\u3002",
    focus: "\u65b9\u6848\u590d\u76d8"
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

function getPageMeta(pathname) {
  return pageMeta[pathname] || pageMeta["/"];
}

export default function App() {
  const location = useLocation();
  const meta = getPageMeta(location.pathname);

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

        <ul className="nav-list">
          {navItems.map((item) => (
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

        <div className="sidebar-flow">
          <p className="sidebar-flow-title">workflow</p>
          <ol className="sidebar-flow-list">
            {workflowSteps.map((step, index) => (
              <li key={step} className="sidebar-flow-item">
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

          <div className="topbar-meta">
            <div className="meta-card">
              <p className="meta-label">focus</p>
              <p className="meta-value">{meta.focus}</p>
            </div>
            <div className="meta-card">
              <p className="meta-label">workspace date</p>
              <p className="meta-value">{formatDate(new Date())}</p>
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

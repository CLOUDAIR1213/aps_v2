import { Link, useLocation } from "react-router-dom";

import { getActiveNavPath, getNavSections, getNavigationTarget } from "../../navigation";
import StepIndicator from "./StepIndicator";

export default function SidebarNav({ activeWorkflowIndex, workflowSteps }) {
  const navSections = getNavSections();
  const location = useLocation();
  const activeNavPath = getActiveNavPath(location.pathname);

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">APS</span>
        <div>
          <h1 className="sidebar-title">轻量级 APS 排产系统</h1>
          <p className="sidebar-copy">小批量多品种生产计划工作台</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="APS 主导航">
        {navSections.map((section) => (
          <div className="nav-group" key={section.title}>
            <p className="nav-group-title">{section.title}</p>
            <ul className="nav-list">
              {section.items.map((item) => {
                const isActive = item.to === activeNavPath;
                return (
                  <li key={item.to}>
                  <Link
                    className={`nav-link${isActive ? " active" : ""}`}
                    to={getNavigationTarget(item.to)}
                  >
                    <span className="nav-code" aria-hidden="true">{item.code}</span>
                    <span className="nav-text">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-hint">{item.hint}</span>
                    </span>
                  </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <StepIndicator activeIndex={activeWorkflowIndex} steps={workflowSteps} />
    </aside>
  );
}

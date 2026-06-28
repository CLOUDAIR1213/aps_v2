import { Link, useLocation } from "react-router-dom";

import { formatDate } from "../../utils/formatters";
import { getActiveModule, productionModules, resolveActionTo } from "./pageHeaderLogic";

export default function PageHeader({ actions = [], meta, onLogout, user }) {
  const location = useLocation();
  const activeModule = getActiveModule(location.pathname);

  return (
    <header className="topbar">
      <nav className="module-tabs" aria-label="生产业务模块">
        {productionModules.map((module) => (
          <Link
            className={`module-tab${module.to === activeModule ? " active" : ""}`}
            key={`${module.to}-${module.label}`}
            to={resolveActionTo(module.to)}
          >
            {module.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-main">
        <div className="topbar-copy">
          <span className="topbar-eyebrow">{meta.eyebrow}</span>
          <h2 className="topbar-title">{meta.title}</h2>
          <p className="topbar-description">{meta.description}</p>
        </div>

        <div className="topbar-toolbar">
          <div className="topbar-actions" aria-label="页面操作">
            {actions.map((action) => (
              <Link
                className={`button small ${action.variant || ""}`.trim()}
                key={`${action.to}-${action.label}`}
                to={resolveActionTo(action.to)}
              >
                {action.label}
              </Link>
            ))}
          </div>

          <div className="topbar-meta">
            <span>当前关注：{meta.focus}</span>
            <span>{`${user.username} / ${user.role}`}</span>
            <span>{formatDate(new Date())}</span>
            <button className="link-button" onClick={onLogout} type="button">
              退出登录
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

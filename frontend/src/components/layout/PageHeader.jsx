import { Link } from "react-router-dom";

import { formatDate } from "../../utils/formatters";
import { buildScheduleBoardPath, buildSchedulePath } from "../../utils/scheduleContext";

function resolveActionTo(to) {
  if (["/schedule-results", "/dispatch", "/gantt", "/management-dashboard"].includes(to)) {
    return buildSchedulePath(to);
  }
  if (to === "/scheduling/board") {
    return buildScheduleBoardPath();
  }
  return to;
}

export default function PageHeader({ actions = [], meta, onLogout, user }) {
  return (
    <header className="topbar">
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
          <div className="meta-card">
            <p className="meta-label">当前关注</p>
            <p className="meta-value">{meta.focus}</p>
          </div>
          <div className="meta-card">
            <p className="meta-label">登录用户</p>
            <p className="meta-value">{`${user.username} / ${user.role}`}</p>
            <button className="link-button" onClick={onLogout} type="button">
              退出登录
            </button>
          </div>
          <div className="meta-card">
            <p className="meta-label">日期</p>
            <p className="meta-value">{formatDate(new Date())}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

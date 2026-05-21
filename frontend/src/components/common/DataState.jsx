import { Link } from "react-router-dom";

export default function DataState({
  actionLabel,
  actionTo,
  children,
  className = "",
  message,
  title,
  tone = "info"
}) {
  return (
    <div className={`data-state ${tone} ${className}`.trim()}>
      <div>
        {title ? <h3 className="data-state-title">{title}</h3> : null}
        {message ? <p className="data-state-copy">{message}</p> : null}
        {children}
      </div>
      {actionLabel && actionTo ? (
        <Link className="button small ghost" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

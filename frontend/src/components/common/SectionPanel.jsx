export default function SectionPanel({ actions, children, subtitle, title }) {
  return (
    <div className="panel">
      {(title || subtitle || actions) ? (
        <div className="panel-header">
          <div>
            {title ? <h3 className="panel-title">{title}</h3> : null}
            {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

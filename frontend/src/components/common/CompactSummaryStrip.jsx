export default function CompactSummaryStrip({ className = "", items = [], loading = false }) {
  return (
    <div className={`compact-summary-strip ${className}`.trim()}>
      {items.map((item) => (
        <span key={item.title}>
          {item.title}：<strong>{loading ? "..." : item.value}</strong>
          {item.meta ? <small>{item.meta}</small> : null}
        </span>
      ))}
    </div>
  );
}

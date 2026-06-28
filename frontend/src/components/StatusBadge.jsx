export default function StatusBadge({ tone = "neutral", children, ...props }) {
  return <span className={`badge ${tone}`} {...props}>{children}</span>;
}

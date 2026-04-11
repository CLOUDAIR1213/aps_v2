export default function StatusBadge({ tone = "neutral", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

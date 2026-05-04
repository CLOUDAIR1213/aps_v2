export default function SummaryCards({ cards = [], loading = false }) {
  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <article
          key={card.title}
          className="metric-card"
          style={{ "--metric-accent": card.accent || "#205c52" }}
        >
          <div className="metric-head">
            <span className="metric-dot" />
            <p className="metric-label">{card.title}</p>
          </div>
          <p className="metric-value">{loading ? "..." : card.value}</p>
          <p className="metric-meta">{card.meta}</p>
        </article>
      ))}
    </div>
  );
}

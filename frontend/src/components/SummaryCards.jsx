export default function SummaryCards({ summary, loading }) {
  const cards = [
    { title: "Machines", value: summary?.machine_count ?? 0 },
    { title: "Orders", value: summary?.order_count ?? 0 },
    { title: "Pending Orders", value: summary?.pending_order_count ?? 0 },
    { title: "Scheduled Orders", value: summary?.scheduled_order_count ?? 0 }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "14px"
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            border: "1px solid #d0d7de",
            borderRadius: "14px",
            padding: "18px",
            minWidth: "140px",
            backgroundColor: "#ffffff",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)"
          }}
        >
          <div style={{ color: "#667085", fontSize: "13px", marginBottom: "8px" }}>
            {card.title}
          </div>
          <strong style={{ fontSize: "28px" }}>
            {loading ? "..." : card.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

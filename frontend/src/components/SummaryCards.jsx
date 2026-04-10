export default function SummaryCards({ summary, loading }) {
  const cards = [
    { title: "设备总数", value: summary?.machine_count ?? 0, tone: "#1f5f52" },
    { title: "订单总数", value: summary?.order_count ?? 0, tone: "#295f8f" },
    { title: "待排产订单", value: summary?.pending_order_count ?? 0, tone: "#8a5a1d" },
    { title: "已排产订单", value: summary?.scheduled_order_count ?? 0, tone: "#5e4aa1" }
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "16px"
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            border: "1px solid rgba(20, 33, 29, 0.08)",
            borderRadius: "24px",
            padding: "22px",
            minWidth: "140px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,249,0.94) 100%)",
            boxShadow: "0 18px 36px rgba(20, 33, 29, 0.06)"
          }}
        >
          <div
            style={{
              width: "42px",
              height: "6px",
              borderRadius: "999px",
              backgroundColor: card.tone,
              marginBottom: "16px"
            }}
          />
          <div style={{ color: "#667085", fontSize: "13px", marginBottom: "10px" }}>
            {card.title}
          </div>
          <strong style={{ fontSize: "34px", letterSpacing: "-0.04em", color: "#14211d" }}>
            {loading ? "..." : card.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

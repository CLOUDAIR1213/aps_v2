import { Link, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/scheduling", label: "排产" },
  { to: "/schedule-results", label: "结果" },
  { to: "/gantt", label: "甘特图" },
  { to: "/machines", label: "机器" },
  { to: "/orders", label: "订单" },
  { to: "/routings", label: "工艺路线" }
];

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "Segoe UI, Arial, sans-serif",
        background:
          "linear-gradient(180deg, #f8fbff 0%, #f4f7fb 45%, #eef2f7 100%)",
        color: "#101828"
      }}
    >
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ marginBottom: "8px" }}>APS 演示系统</h1>
        <p style={{ margin: 0, color: "#667085" }}>
          面向机械加工场景的轻量 APS 排产演示系统。
        </p>
      </header>
      <nav
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap"
        }}
      >
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              backgroundColor: "#ffffff",
              border: "1px solid #d7dbe2",
              color: "#0f172a",
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)"
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main
        style={{
          padding: "24px",
          borderRadius: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.88)",
          border: "1px solid #e5e7eb",
          boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)"
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

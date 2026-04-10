import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/scheduling", label: "排产管理" },
  { to: "/schedule-results", label: "排产结果" },
  { to: "/gantt", label: "甘特图" },
  { to: "/machines", label: "设备管理" },
  { to: "/orders", label: "订单管理" },
  { to: "/routings", label: "工艺路线" }
];

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px",
        fontFamily: '"IBM Plex Sans", "Segoe UI", Arial, sans-serif',
        background:
          "radial-gradient(circle at top left, rgba(18, 101, 84, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(14, 116, 144, 0.12), transparent 24%), linear-gradient(180deg, #f6f8f7 0%, #eef2ef 100%)",
        color: "#14211d"
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto"
        }}
      >
        <header
          style={{
            marginBottom: "18px",
            padding: "26px 28px",
            borderRadius: "28px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(247,250,248,0.9) 100%)",
            border: "1px solid rgba(20, 33, 29, 0.08)",
            boxShadow: "0 20px 60px rgba(20, 33, 29, 0.08)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "18px",
              flexWrap: "wrap"
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  backgroundColor: "#e8f3ef",
                  color: "#1c5c4f",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  marginBottom: "14px"
                }}
              >
                APS DEMO
              </div>
              <h1
                style={{
                  margin: "0 0 10px",
                  fontSize: "36px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em"
                }}
              >
                APS 排产演示系统
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: "620px",
                  color: "#5e6d66",
                  lineHeight: 1.7,
                  fontSize: "15px"
                }}
              >
                面向机械加工场景的轻量 APS 排产演示平台，聚焦订单、设备、工艺路线与排产结果的统一展示。
              </p>
            </div>
          </div>
        </header>

        <nav
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "22px",
            flexWrap: "wrap",
            padding: "12px",
            borderRadius: "22px",
            backgroundColor: "rgba(255, 255, 255, 0.72)",
            border: "1px solid rgba(20, 33, 29, 0.08)",
            boxShadow: "0 10px 30px rgba(20, 33, 29, 0.05)",
            backdropFilter: "blur(10px)"
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: "11px 16px",
                borderRadius: "14px",
                background: isActive ? "#1f5f52" : "transparent",
                border: isActive
                  ? "1px solid #1f5f52"
                  : "1px solid transparent",
                color: isActive ? "#ffffff" : "#31443c",
                textDecoration: "none",
                fontWeight: 600,
                transition: "all 0.2s ease",
                boxShadow: isActive ? "0 10px 24px rgba(31, 95, 82, 0.18)" : "none"
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main
          style={{
            padding: "30px",
            borderRadius: "30px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251,252,251,0.92) 100%)",
            border: "1px solid rgba(20, 33, 29, 0.08)",
            boxShadow: "0 26px 70px rgba(20, 33, 29, 0.08)"
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

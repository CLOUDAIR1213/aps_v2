import { useState } from "react";

import { login } from "../api/auth";

const roleLabels = {
  admin: "管理员",
  planner: "调度员",
  viewer: "查看者"
};

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(form);
      localStorage.setItem("aps_user", JSON.stringify(user));
      onLogin(user);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "登录失败。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={handleSubmit}>
        <span className="topbar-eyebrow">APS production</span>
        <h1 className="login-title">小企业排产系统</h1>
        <p className="login-copy">
          上传工艺表、校验工序工时、运行资源排产，并追踪瓶颈和逾期风险。
        </p>

        <label className="field-label">
          账号
          <input
            className="field-input"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>
        <label className="field-label">
          密码
          <input
            className="field-input"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>

        {error ? <div className="alert danger">{error}</div> : null}

        <button className="button" type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>

        <div className="hint-grid">
          {["admin", "planner", "viewer"].map((name) => (
            <div className="detail-row" key={name}>
              <span className="detail-key">{roleLabels[name]}</span>
              <span className="detail-value">{`${name} / ${name}123`}</span>
            </div>
          ))}
        </div>
      </form>
    </main>
  );
}

import { useEffect, useState } from "react";

import { createWorkCenter, getWorkCenters } from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";

export default function WorkCenters() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    is_external: false,
    default_capacity_per_day: 480,
    default_duration_hours: 8,
    machine_count: 1
  });

  const loadData = async () => {
    setLoading(true);
    try {
      setCenters(await getWorkCenters());
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "资源数据加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createWorkCenter({
        ...form,
        default_capacity_per_day: Number(form.default_capacity_per_day),
        default_duration_hours: Number(form.default_duration_hours),
        machine_count: Number(form.machine_count)
      });
      setForm({
        name: "",
        code: "",
        is_external: false,
        default_capacity_per_day: 480,
        default_duration_hours: 8,
        machine_count: 1
      });
      setMessage("资源创建成功。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "资源创建失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const externalCount = centers.filter((center) => center.is_external).length;
  const internalCount = centers.length - externalCount;
  const machineCount = centers.reduce((sum, center) => sum + center.machine_count, 0);
  const cards = [
    { title: "资源工段", value: centers.length, meta: "Excel 工序列映射对象", accent: "#205c52" },
    { title: "内部工段", value: internalCount, meta: "占用具体设备/产能", accent: "#2d5d8c" },
    { title: "外协工段", value: externalCount, meta: "参与周期约束，不占内部设备", accent: "#b97012" },
    { title: "设备道", value: machineCount, meta: "甘特图资源泳道基础", accent: "#7d567e" }
  ];

  return (
    <section className="page-grid">
      <SummaryCards cards={cards} loading={loading} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">资源配置</h3>
            <p className="panel-subtitle">
              工艺表里的工序列默认会变成资源工段；内部工段可配置多台设备，外协工段按周期排。
            </p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label">
            资源名称
            <input
              className="field-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="例如 5m龙门"
              required
            />
          </label>
          <label className="field-label">
            资源编码
            <input
              className="field-input"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="留空自动生成"
            />
          </label>
          <label className="field-label">
            日产能分钟
            <input
              className="field-input"
              type="number"
              value={form.default_capacity_per_day}
              onChange={(event) => setForm({ ...form, default_capacity_per_day: event.target.value })}
            />
          </label>
          <label className="field-label">
            默认外协周期小时
            <input
              className="field-input"
              type="number"
              value={form.default_duration_hours}
              onChange={(event) => setForm({ ...form, default_duration_hours: event.target.value })}
            />
          </label>
          <label className="field-label">
            设备数量
            <input
              className="field-input"
              type="number"
              min="1"
              disabled={form.is_external}
              value={form.machine_count}
              onChange={(event) => setForm({ ...form, machine_count: event.target.value })}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.is_external}
              onChange={(event) => setForm({ ...form, is_external: event.target.checked })}
            />
            外协资源
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "创建中..." : "新增资源"}
            </button>
          </div>
        </form>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <div className="panel">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>资源</th>
                <th>类型</th>
                <th>设备道</th>
                <th>日产能</th>
                <th>默认周期</th>
              </tr>
            </thead>
            <tbody>
              {centers.map((center) => (
                <tr key={center.id}>
                  <td>
                    <p className="data-primary">{center.name}</p>
                    <p className="data-secondary">{center.code}</p>
                  </td>
                  <td>
                    <StatusBadge tone={center.is_external ? "warning" : "info"}>
                      {center.is_external ? "外协" : "内部"}
                    </StatusBadge>
                  </td>
                  <td>{center.is_external ? "--" : center.machine_count}</td>
                  <td>{`${center.default_capacity_per_day} min`}</td>
                  <td>{`${center.default_duration_hours}h`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

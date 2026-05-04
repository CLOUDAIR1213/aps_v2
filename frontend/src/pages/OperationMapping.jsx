import { useEffect, useState } from "react";

import {
  getOperationMappingRules,
  createOperationMappingRule,
  updateOperationMappingRule,
  getWorkCenters,
  createWorkCenter,
} from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";

export default function OperationMapping() {
  const [rules, setRules] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showNewCenter, setShowNewCenter] = useState(false);
  const [newCenterForm, setNewCenterForm] = useState({ name: "", code: "", is_external: false });
  const [creatingCenter, setCreatingCenter] = useState(false);
  const [form, setForm] = useState({
    source_name: "",
    normalized_name: "",
    work_center_id: "",
    is_external: false,
    status: "active",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ruleData, centerData] = await Promise.all([
        getOperationMappingRules(),
        getWorkCenters(),
      ]);
      setRules(ruleData);
      setCenters(centerData);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "数据加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({
      source_name: "",
      normalized_name: "",
      work_center_id: "",
      is_external: false,
      status: "active",
    });
    setShowForm(false);
    setEditingRule(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        work_center_id: Number(form.work_center_id),
      };
      if (editingRule) {
        await updateOperationMappingRule(editingRule, {
          normalized_name: payload.normalized_name,
          work_center_id: payload.work_center_id,
          is_external: payload.is_external,
          status: payload.status,
        });
        setMessage("映射规则更新成功。");
      } else {
        await createOperationMappingRule(payload);
        setMessage("映射规则创建成功。");
      }
      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "操作失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule.id);
    setForm({
      source_name: rule.source_name,
      normalized_name: rule.normalized_name,
      work_center_id: String(rule.work_center_id),
      is_external: rule.is_external,
      status: rule.status,
    });
    setShowForm(true);
  };

  const handleCreateCenter = async () => {
    if (!newCenterForm.name || !newCenterForm.code) return;
    setCreatingCenter(true);
    setError("");
    try {
      const created = await createWorkCenter({
        name: newCenterForm.name,
        code: newCenterForm.code,
        is_external: newCenterForm.is_external,
        default_capacity_per_day: 480,
        default_duration_hours: 8,
        machine_count: 1,
      });
      const updated = await getWorkCenters();
      setCenters(updated);
      setForm({
        ...form,
        work_center_id: String(created.id),
        is_external: created.is_external,
      });
      setShowNewCenter(false);
      setNewCenterForm({ name: "", code: "", is_external: false });
      setMessage(`工段「${created.name}」已创建。`);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "工段创建失败。");
    } finally {
      setCreatingCenter(false);
    }
  };

  const activeCenters = centers.filter((c) => c.status === "active");
  const activeRuleCount = rules.filter((r) => r.status === "active").length;
  const externalRuleCount = rules.filter((r) => r.is_external && r.status === "active").length;
  const internalRuleCount = activeRuleCount - externalRuleCount;

  const cards = [
    { title: "映射规则总数", value: rules.length, meta: `${activeRuleCount} 条启用`, accent: "#205c52" },
    { title: "内部工序映射", value: internalRuleCount, meta: "指向内部工段", accent: "#2d5d8c" },
    { title: "外协工序映射", value: externalRuleCount, meta: "指向外协工段", accent: "#b97012" },
    { title: "可用工段", value: activeCenters.length, meta: `${centers.length - activeCenters.length} 个已禁用`, accent: "#7d567e" },
  ];

  return (
    <section className="page-grid">
      <SummaryCards cards={cards} loading={loading} />

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{editingRule ? "编辑映射规则" : "新增映射规则"}</h3>
            <p className="panel-subtitle">
              将 Excel 工艺表的工序列名映射到系统工段，导入时自动识别。
            </p>
          </div>
          {!showForm && (
            <button className="button small" type="button" onClick={() => setShowForm(true)}>
              新增规则
            </button>
          )}
        </div>

        {showForm && (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field-label">
              Excel 列名（源名称）
              <input
                className="field-input"
                value={form.source_name}
                onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                placeholder="例如 5m龙门"
                required
                disabled={!!editingRule}
              />
            </label>
            <label className="field-label">
              标准化名称
              <input
                className="field-input"
                value={form.normalized_name}
                onChange={(e) => setForm({ ...form, normalized_name: e.target.value })}
                placeholder="内部标准化名称"
                required
              />
            </label>
            <label className="field-label">
              目标工段
              <select
                className="field-input"
                value={form.work_center_id}
                onChange={(e) => {
                  const selected = centers.find((c) => c.id === Number(e.target.value));
                  setForm({
                    ...form,
                    work_center_id: e.target.value,
                    is_external: selected ? selected.is_external : form.is_external,
                  });
                }}
                required
              >
                <option value="">请选择工段</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name} ({center.code}) - {center.is_external ? "外协" : "内部"}
                  </option>
                ))}
              </select>
              {!editingRule && (
                <div style={{ marginTop: "0.4rem" }}>
                  {!showNewCenter ? (
                    <button
                      className="button small ghost"
                      type="button"
                      onClick={() => setShowNewCenter(true)}
                    >
                      + 新建工段
                    </button>
                  ) : (
                    <div className="machine-form-row">
                      <input
                        className="field-input"
                        placeholder="工段名称"
                        value={newCenterForm.name}
                        onChange={(e) => setNewCenterForm({ ...newCenterForm, name: e.target.value })}
                      />
                      <input
                        className="field-input"
                        placeholder="工段编码"
                        value={newCenterForm.code}
                        onChange={(e) => setNewCenterForm({ ...newCenterForm, code: e.target.value })}
                      />
                      <label className="checkbox-field" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={newCenterForm.is_external}
                          onChange={(e) => setNewCenterForm({ ...newCenterForm, is_external: e.target.checked })}
                        />
                        外协
                      </label>
                      <div className="form-actions">
                        <button
                          className="button small"
                          type="button"
                          onClick={handleCreateCenter}
                          disabled={creatingCenter || !newCenterForm.name || !newCenterForm.code}
                        >
                          {creatingCenter ? "创建中..." : "创建"}
                        </button>
                        <button
                          className="button small ghost"
                          type="button"
                          onClick={() => setShowNewCenter(false)}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </label>
            <label className="field-label">
              状态
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? "保存中..." : editingRule ? "更新规则" : "创建规则"}
              </button>
              <button className="button ghost" type="button" onClick={resetForm}>
                取消
              </button>
            </div>
          </form>
        )}

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">映射规则列表</h3>
            <p className="panel-subtitle">Excel 工序列名到系统工段的映射关系。</p>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Excel 列名</th>
                <th>标准化名称</th>
                <th>目标工段</th>
                <th>类型</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    暂无映射规则。导入工艺表前请先配置。
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className={rule.status === "disabled" ? "row-disabled" : ""}>
                    <td>
                      <p className="data-primary">{rule.source_name}</p>
                    </td>
                    <td>{rule.normalized_name}</td>
                    <td>{rule.work_center_name || `ID ${rule.work_center_id}`}</td>
                    <td>
                      <StatusBadge tone={rule.is_external ? "warning" : "info"}>
                        {rule.is_external ? "外协" : "内部"}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge tone={rule.status === "active" ? "success" : "neutral"}>
                        {rule.status === "active" ? "启用" : "禁用"}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="button small ghost"
                          type="button"
                          onClick={() => handleEdit(rule)}
                        >
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

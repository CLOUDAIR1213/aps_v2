import { useEffect, useState } from "react";

import {
  getResourceGroups,
  createResourceGroup,
  updateResourceGroup,
  addGroupMember,
  removeGroupMember,
  getWorkCenters,
  getResourceMachines,
  getPersonnel,
} from "../api/production";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
import StatusBadge from "../components/StatusBadge";

const MEMBER_TYPE_LABELS = {
  work_center: "工段",
  machine: "设备",
  personnel: "人员",
};

export default function ResourceGroups() {
  const [groups, setGroups] = useState([]);
  const [centers, setCenters] = useState([]);
  const [machines, setMachines] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [memberForm, setMemberForm] = useState({ member_type: "work_center", member_id: "" });
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    status: "active",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupData, centerData, machineData, personnelData] = await Promise.all([
        getResourceGroups(),
        getWorkCenters(),
        getResourceMachines(),
        getPersonnel(),
      ]);
      setGroups(groupData);
      setCenters(centerData);
      setMachines(machineData);
      setPersonnel(personnelData);
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
    setForm({ code: "", name: "", description: "", status: "active" });
    setShowForm(false);
    setEditingGroup(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (editingGroup) {
        await updateResourceGroup(editingGroup, form);
        setMessage("资源组更新成功。");
      } else {
        await createResourceGroup(form);
        setMessage("资源组创建成功。");
      }
      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "操作失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group.id);
    setForm({
      code: group.code,
      name: group.name,
      description: group.description || "",
      status: group.status,
    });
    setShowForm(true);
  };

  const handleAddMember = async (groupId) => {
    if (!memberForm.member_id) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await addGroupMember(groupId, {
        member_type: memberForm.member_type,
        member_id: Number(memberForm.member_id),
      });
      setMemberForm({ member_type: "work_center", member_id: "" });
      setMessage("成员添加成功。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "添加成员失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (groupId, memberId) => {
    if (!window.confirm("确认移除该成员？")) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await removeGroupMember(groupId, memberId);
      setMessage("成员已移除。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "移除成员失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberOptions = (type) => {
    if (type === "work_center") return centers.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }));
    if (type === "machine") return machines.map((m) => ({ id: m.id, label: `${m.name} (${m.code})` }));
    if (type === "personnel") return personnel.map((p) => ({ id: p.id, label: `${p.name} (${p.employee_no})` }));
    return [];
  };

  const getMemberLabel = (member) => {
    if (member.member_type === "work_center") {
      const c = centers.find((c) => c.id === member.member_id);
      return c ? `${c.name} (${c.code})` : `工段 #${member.member_id}`;
    }
    if (member.member_type === "machine") {
      const m = machines.find((m) => m.id === member.member_id);
      return m ? `${m.name} (${m.code})` : `设备 #${member.member_id}`;
    }
    if (member.member_type === "personnel") {
      const p = personnel.find((p) => p.id === member.member_id);
      return p ? `${p.name} (${p.employee_no})` : `人员 #${member.member_id}`;
    }
    return `${member.member_type} #${member.member_id}`;
  };

  const activeGroupCount = groups.filter((g) => g.status === "active").length;
  const totalMembers = groups.reduce((sum, g) => sum + (g.members?.length || 0), 0);

  const cards = [
    { title: "资源组总数", value: groups.length, meta: `${activeGroupCount} 个启用`, accent: "#205c52" },
    { title: "成员总数", value: totalMembers, meta: "跨所有资源组", accent: "#2d5d8c" },
    { title: "可用工段", value: centers.filter((c) => c.status === "active").length, meta: `${centers.length} 个总计`, accent: "#b97012" },
    { title: "可用设备", value: machines.filter((m) => m.status === "active").length, meta: `${machines.length} 台总计`, accent: "#7d567e" },
  ];

  return (
    <section className="page-grid">
      <CompactSummaryStrip className="master-data-summary-strip" items={cards} loading={loading} />

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{editingGroup ? "编辑资源组" : "新增资源组"}</h3>
            <p className="panel-subtitle">将工段和设备归类到资源组，便于分组管理。</p>
          </div>
          {!showForm && (
            <button className="button small" type="button" onClick={() => setShowForm(true)}>
              新增资源组
            </button>
          )}
        </div>

        {showForm && (
          <form className="table-toolbar resource-group-toolbar" onSubmit={handleSubmit}>
            <label className="toolbar-field">
              <span>资源组编码</span>
              <input
                className="field-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="全局唯一编码"
                required
                disabled={!!editingGroup}
              />
            </label>
            <label className="toolbar-field">
              <span>资源组名称</span>
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="toolbar-field">
              <span>说明</span>
              <input
                className="field-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="可选备注"
              />
            </label>
            <label className="toolbar-field">
              <span>状态</span>
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </label>
            <div className="toolbar-actions">
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? "保存中..." : editingGroup ? "更新" : "创建"}
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
            <h3 className="panel-title">资源组列表</h3>
            <p className="panel-subtitle">点击展开管理成员。</p>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>编码</th>
                <th>名称</th>
                <th>说明</th>
                <th>状态</th>
                <th>成员数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    暂无资源组。
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const isExpanded = expandedGroup === group.id;
                  return (
                    <>
                      <tr key={group.id} className={group.status === "disabled" ? "row-disabled" : ""}>
                        <td>{group.code}</td>
                        <td>
                          <p className="data-primary">{group.name}</p>
                        </td>
                        <td className="data-secondary">{group.description || "--"}</td>
                        <td>
                          <StatusBadge tone={group.status === "active" ? "success" : "neutral"}>
                            {group.status === "active" ? "启用" : "禁用"}
                          </StatusBadge>
                        </td>
                        <td>{group.members?.length || 0}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="button small ghost"
                              type="button"
                              onClick={() => handleEdit(group)}
                            >
                              编辑
                            </button>
                            <button
                              className="button small ghost"
                              type="button"
                              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                            >
                              {isExpanded ? "收起" : "管理成员"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${group.id}-members`} className="machine-row">
                          <td colSpan={6}>
                            <div className="machine-panel">
                              <div className="machine-panel-header">
                                <h4>{group.name} 成员列表</h4>
                              </div>

                              <div className="machine-form-row">
                                <select
                                  className="field-input"
                                  value={memberForm.member_type}
                                  onChange={(e) =>
                                    setMemberForm({ ...memberForm, member_type: e.target.value, member_id: "" })
                                  }
                                >
                                  <option value="work_center">工段</option>
                                  <option value="machine">设备</option>
                                  <option value="personnel">人员</option>
                                </select>
                                <select
                                  className="field-input"
                                  value={memberForm.member_id}
                                  onChange={(e) =>
                                    setMemberForm({ ...memberForm, member_id: e.target.value })
                                  }
                                >
                                  <option value="">选择资源</option>
                                  {getMemberOptions(memberForm.member_type).map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="form-actions">
                                  <button
                                    className="button small"
                                    type="button"
                                    onClick={() => handleAddMember(group.id)}
                                    disabled={submitting || !memberForm.member_id}
                                  >
                                    添加
                                  </button>
                                </div>
                              </div>

                              {(!group.members || group.members.length === 0) ? (
                                <div className="alert warning">该资源组暂无成员。</div>
                              ) : (
                                <table className="data-table machine-table">
                                  <thead>
                                    <tr>
                                      <th>类型</th>
                                      <th>资源</th>
                                      <th>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.members.map((member) => (
                                      <tr key={member.id}>
                                        <td>
                                          <StatusBadge tone="info">
                                            {MEMBER_TYPE_LABELS[member.member_type] || member.member_type}
                                          </StatusBadge>
                                        </td>
                                        <td>{getMemberLabel(member)}</td>
                                        <td>
                                          <button
                                            className="button small danger"
                                            type="button"
                                            onClick={() => handleRemoveMember(group.id, member.id)}
                                            disabled={submitting}
                                          >
                                            移除
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

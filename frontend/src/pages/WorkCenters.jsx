import { useEffect, useState } from "react";

import {
  createWorkCenter,
  getWorkCenters,
  updateWorkCenter,
  disableWorkCenter,
  getResourceMachines,
  createMachine,
  updateMachine,
} from "../api/production";
import SummaryCards from "../components/SummaryCards";
import StatusBadge from "../components/StatusBadge";

const STATUS_OPTIONS = ["active", "disabled"];
const MACHINE_STATUS_OPTIONS = ["active", "disabled", "maintenance", "stopped"];
const STATUS_LABELS = { active: "启用", disabled: "禁用" };
const MACHINE_STATUS_LABELS = {
  active: "启用",
  disabled: "禁用",
  maintenance: "维修",
  stopped: "停机",
};

export default function WorkCenters() {
  const [centers, setCenters] = useState([]);
  const [machines, setMachines] = useState([]);
  const [expandedCenter, setExpandedCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingCenter, setEditingCenter] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showMachineForm, setShowMachineForm] = useState(null);
  const [machineForm, setMachineForm] = useState({
    code: "",
    name: "",
    status: "active",
    capacity_per_day: 480,
  });
  const [editingMachine, setEditingMachine] = useState(null);
  const [editMachineForm, setEditMachineForm] = useState({});
  const [form, setForm] = useState({
    name: "",
    code: "",
    is_external: false,
    default_capacity_per_day: 480,
    default_duration_hours: 8,
    description: "",
    machine_count: 1,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [centerData, machineData] = await Promise.all([
        getWorkCenters(),
        getResourceMachines(),
      ]);
      setCenters(centerData);
      setMachines(machineData);
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
        machine_count: Number(form.machine_count),
      });
      setForm({
        name: "",
        code: "",
        is_external: false,
        default_capacity_per_day: 480,
        default_duration_hours: 8,
        description: "",
        machine_count: 1,
      });
      setMessage("资源创建成功。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "资源创建失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCenter = (center) => {
    setEditingCenter(center.id);
    setEditForm({
      name: center.name,
      code: center.code,
      is_external: center.is_external,
      default_capacity_per_day: center.default_capacity_per_day,
      default_duration_hours: center.default_duration_hours,
      description: center.description || "",
    });
  };

  const handleSaveCenter = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await updateWorkCenter(editingCenter, {
        ...editForm,
        default_capacity_per_day: Number(editForm.default_capacity_per_day),
        default_duration_hours: Number(editForm.default_duration_hours),
      });
      setEditingCenter(null);
      setMessage("工段更新成功。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "工段更新失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableCenter = async (center) => {
    const action = center.status === "disabled" ? "启用" : "禁用";
    if (!window.confirm(`确认${action}工段「${center.name}」？`)) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (center.status === "disabled") {
        await updateWorkCenter(center.id, { status: "active" });
      } else {
        await disableWorkCenter(center.id);
      }
      setMessage(`工段已${action}。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || `${action}失败。`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMachine = async (centerId) => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await createMachine({
        work_center_id: centerId,
        code: machineForm.code,
        name: machineForm.name,
        status: machineForm.status,
        capacity_per_day: Number(machineForm.capacity_per_day),
      });
      setShowMachineForm(null);
      setMachineForm({ code: "", name: "", status: "active", capacity_per_day: 480 });
      setMessage("设备创建成功。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "设备创建失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMachine = (machine) => {
    setEditingMachine(machine.id);
    setEditMachineForm({
      code: machine.code,
      name: machine.name,
      status: machine.status,
      capacity_per_day: machine.capacity_per_day,
    });
  };

  const handleSaveMachine = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await updateMachine(editingMachine, {
        ...editMachineForm,
        capacity_per_day: Number(editMachineForm.capacity_per_day),
      });
      setEditingMachine(null);
      setMessage("设备更新成功。");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "设备更新失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const getMachinesForCenter = (centerId) =>
    machines.filter((m) => m.work_center_id === centerId);

  const externalCount = centers.filter((center) => center.is_external).length;
  const internalCount = centers.length - externalCount;
  const activeCenterCount = centers.filter((c) => c.status === "active").length;
  const disabledCenterCount = centers.filter((c) => c.status === "disabled").length;
  const blockedCenters = centers.filter(
    (c) =>
      !c.is_external &&
      c.status === "active" &&
      getMachinesForCenter(c.id).filter((m) => m.status === "active").length === 0
  );

  const cards = [
    { title: "工段总数", value: centers.length, meta: `${activeCenterCount} 启用 / ${disabledCenterCount} 禁用`, accent: "#205c52" },
    { title: "内部工段", value: internalCount, meta: "占用具体设备/产能", accent: "#2d5d8c" },
    { title: "外协工段", value: externalCount, meta: "参与周期约束，不占内部设备", accent: "#b97012" },
    { title: "设备总数", value: machines.length, meta: blockedCenters.length > 0 ? `${blockedCenters.length} 个工段无启用设备` : "无阻塞", accent: blockedCenters.length > 0 ? "#c2412f" : "#7d567e" },
  ];

  return (
    <section className="page-grid">
      <SummaryCards cards={cards} loading={loading} />

      {blockedCenters.length > 0 ? (
        <div className="alert danger">
          <strong>阻塞：</strong>
          {blockedCenters.map((c) => c.name).join("、")}
          没有启用设备，对应工序无法排产。
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">新增工段</h3>
            <p className="panel-subtitle">
              工艺表里的工序列默认会变成资源工段；内部工段可配置多台设备，外协工段按周期排。
            </p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label">
            工段名称
            <input
              className="field-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="例如 5m龙门"
              required
            />
          </label>
          <label className="field-label">
            工段编码
            <input
              className="field-input"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="全局唯一编码"
              required
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
          <label className="field-label">
            说明
            <input
              className="field-input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="可选备注"
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
              {submitting ? "创建中..." : "新增工段"}
            </button>
          </div>
        </form>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">工段列表</h3>
            <p className="panel-subtitle">点击展开查看设备，支持编辑和禁用。</p>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>工段</th>
                <th>类型</th>
                <th>状态</th>
                <th>设备数</th>
                <th>日产能</th>
                <th>默认周期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {centers.map((center) => {
                const centerMachines = getMachinesForCenter(center.id);
                const activeMachines = centerMachines.filter((m) => m.status === "active");
                const isExpanded = expandedCenter === center.id;
                return (
                  <>
                    <tr key={center.id} className={center.status === "disabled" ? "row-disabled" : ""}>
                      <td>
                        <p className="data-primary">{center.name}</p>
                        <p className="data-secondary">{center.code}</p>
                      </td>
                      <td>
                        <StatusBadge tone={center.is_external ? "warning" : "info"}>
                          {center.is_external ? "外协" : "内部"}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge tone={center.status === "active" ? "success" : "neutral"}>
                          {STATUS_LABELS[center.status] || center.status}
                        </StatusBadge>
                      </td>
                      <td>
                        {center.is_external
                          ? "--"
                          : `${activeMachines.length}/${centerMachines.length}`}
                      </td>
                      <td>{`${center.default_capacity_per_day} min`}</td>
                      <td>{`${center.default_duration_hours}h`}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button small ghost"
                            type="button"
                            onClick={() => handleEditCenter(center)}
                          >
                            编辑
                          </button>
                          <button
                            className={`button small ${center.status === "disabled" ? "" : "danger"}`}
                            type="button"
                            onClick={() => handleDisableCenter(center)}
                            disabled={submitting}
                          >
                            {center.status === "disabled" ? "启用" : "禁用"}
                          </button>
                          {!center.is_external && (
                            <button
                              className="button small ghost"
                              type="button"
                              onClick={() =>
                                setExpandedCenter(isExpanded ? null : center.id)
                              }
                            >
                              {isExpanded ? "收起设备" : "展开设备"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && !center.is_external && (
                      <tr key={`${center.id}-machines`} className="machine-row">
                        <td colSpan={7}>
                          <div className="machine-panel">
                            <div className="machine-panel-header">
                              <h4>{center.name} 设备列表</h4>
                              <button
                                className="button small"
                                type="button"
                                onClick={() => {
                                  setShowMachineForm(center.id);
                                  setMachineForm({
                                    code: `${center.code}-${String(centerMachines.length + 1).padStart(2, "0")}`,
                                    name: `${center.name}-${String(centerMachines.length + 1).padStart(2, "0")}`,
                                    status: "active",
                                    capacity_per_day: center.default_capacity_per_day,
                                  });
                                }}
                              >
                                新增设备
                              </button>
                            </div>

                            {showMachineForm === center.id && (
                              <div className="machine-form-row">
                                <input
                                  className="field-input"
                                  placeholder="设备编码"
                                  value={machineForm.code}
                                  onChange={(e) =>
                                    setMachineForm({ ...machineForm, code: e.target.value })
                                  }
                                />
                                <input
                                  className="field-input"
                                  placeholder="设备名称"
                                  value={machineForm.name}
                                  onChange={(e) =>
                                    setMachineForm({ ...machineForm, name: e.target.value })
                                  }
                                />
                                <input
                                  className="field-input"
                                  type="number"
                                  placeholder="日产能分钟"
                                  value={machineForm.capacity_per_day}
                                  onChange={(e) =>
                                    setMachineForm({
                                      ...machineForm,
                                      capacity_per_day: e.target.value,
                                    })
                                  }
                                />
                                <div className="form-actions">
                                  <button
                                    className="button small"
                                    type="button"
                                    onClick={() => handleCreateMachine(center.id)}
                                    disabled={submitting || !machineForm.code || !machineForm.name}
                                  >
                                    确认
                                  </button>
                                  <button
                                    className="button small ghost"
                                    type="button"
                                    onClick={() => setShowMachineForm(null)}
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}

                            {centerMachines.length === 0 ? (
                              <div className="alert warning">该工段没有设备，请先添加。</div>
                            ) : (
                              <table className="data-table machine-table">
                                <thead>
                                  <tr>
                                    <th>编码</th>
                                    <th>名称</th>
                                    <th>状态</th>
                                    <th>日产能</th>
                                    <th>操作</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {centerMachines.map((machine) =>
                                    editingMachine === machine.id ? (
                                      <tr key={machine.id}>
                                        <td>
                                          <input
                                            className="field-input"
                                            value={editMachineForm.code}
                                            onChange={(e) =>
                                              setEditMachineForm({
                                                ...editMachineForm,
                                                code: e.target.value,
                                              })
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            className="field-input"
                                            value={editMachineForm.name}
                                            onChange={(e) =>
                                              setEditMachineForm({
                                                ...editMachineForm,
                                                name: e.target.value,
                                              })
                                            }
                                          />
                                        </td>
                                        <td>
                                          <select
                                            className="field-input"
                                            value={editMachineForm.status}
                                            onChange={(e) =>
                                              setEditMachineForm({
                                                ...editMachineForm,
                                                status: e.target.value,
                                              })
                                            }
                                          >
                                            {MACHINE_STATUS_OPTIONS.map((opt) => (
                                              <option key={opt} value={opt}>
                                                {MACHINE_STATUS_LABELS[opt]}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          <input
                                            className="field-input"
                                            type="number"
                                            value={editMachineForm.capacity_per_day}
                                            onChange={(e) =>
                                              setEditMachineForm({
                                                ...editMachineForm,
                                                capacity_per_day: e.target.value,
                                              })
                                            }
                                          />
                                        </td>
                                        <td>
                                          <div className="row-actions">
                                            <button
                                              className="button small"
                                              type="button"
                                              onClick={handleSaveMachine}
                                              disabled={submitting}
                                            >
                                              保存
                                            </button>
                                            <button
                                              className="button small ghost"
                                              type="button"
                                              onClick={() => setEditingMachine(null)}
                                            >
                                              取消
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr
                                        key={machine.id}
                                        className={machine.status !== "active" ? "row-disabled" : ""}
                                      >
                                        <td>{machine.code}</td>
                                        <td>{machine.name}</td>
                                        <td>
                                          <StatusBadge
                                            tone={
                                              machine.status === "active"
                                                ? "success"
                                                : machine.status === "maintenance"
                                                  ? "warning"
                                                  : "neutral"
                                            }
                                          >
                                            {MACHINE_STATUS_LABELS[machine.status] || machine.status}
                                          </StatusBadge>
                                        </td>
                                        <td>{`${machine.capacity_per_day} min`}</td>
                                        <td>
                                          <button
                                            className="button small ghost"
                                            type="button"
                                            onClick={() => handleEditMachine(machine)}
                                          >
                                            编辑
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingCenter && (
        <div className="modal-overlay" onClick={() => setEditingCenter(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h3 className="panel-title">编辑工段</h3>
            </div>
            <div className="form-grid">
              <label className="field-label">
                工段名称
                <input
                  className="field-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </label>
              <label className="field-label">
                工段编码
                <input
                  className="field-input"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  required
                />
              </label>
              <label className="field-label">
                日产能分钟
                <input
                  className="field-input"
                  type="number"
                  value={editForm.default_capacity_per_day}
                  onChange={(e) =>
                    setEditForm({ ...editForm, default_capacity_per_day: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                默认外协周期小时
                <input
                  className="field-input"
                  type="number"
                  value={editForm.default_duration_hours}
                  onChange={(e) =>
                    setEditForm({ ...editForm, default_duration_hours: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                说明
                <input
                  className="field-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={editForm.is_external}
                  onChange={(e) => setEditForm({ ...editForm, is_external: e.target.checked })}
                />
                外协资源
              </label>
            </div>
            <div className="form-actions">
              <button className="button" type="button" onClick={handleSaveCenter} disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </button>
              <button className="button ghost" type="button" onClick={() => setEditingCenter(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

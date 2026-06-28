import { useEffect, useState } from "react";

import {
  createWorkCenter,
  getWorkCenters,
  updateWorkCenter,
  disableWorkCenter,
  deleteWorkCenter,
  getResourceMachines,
  createMachine,
  updateMachine,
  deleteMachine,
} from "../api/production";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
import EditWorkCenterModal from "../components/work-centers/EditWorkCenterModal";
import WorkCenterForm from "../components/work-centers/WorkCenterForm";
import WorkCenterTable from "../components/work-centers/WorkCenterTable";

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
  const [deletingCenterId, setDeletingCenterId] = useState(null);
  const [deletingMachineId, setDeletingMachineId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    is_external: false,
    default_capacity_per_day: 480,
    default_duration_hours: 8,
    external_capacity_slots: 1,
    external_lead_time_hours: "",
    external_vendor_name: "",
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
        external_capacity_slots: Number(form.external_capacity_slots || 1),
        external_lead_time_hours: form.external_lead_time_hours === "" ? null : Number(form.external_lead_time_hours),
        external_vendor_name: form.external_vendor_name || null,
        machine_count: Number(form.machine_count),
      });
      setForm({
        name: "",
        code: "",
        is_external: false,
        default_capacity_per_day: 480,
        default_duration_hours: 8,
        external_capacity_slots: 1,
        external_lead_time_hours: "",
        external_vendor_name: "",
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
      external_capacity_slots: center.external_capacity_slots || 1,
      external_lead_time_hours: center.external_lead_time_hours ?? "",
      external_vendor_name: center.external_vendor_name || "",
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
        external_capacity_slots: Number(editForm.external_capacity_slots || 1),
        external_lead_time_hours: editForm.external_lead_time_hours === "" ? null : Number(editForm.external_lead_time_hours),
        external_vendor_name: editForm.external_vendor_name || null,
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

  const handleDeleteCenter = async (center) => {
    if (
      !window.confirm(
        `确认删除工段「${center.name}」？未被工单或历史排产引用时才会删除；已引用的工段请改为禁用。`
      )
    ) {
      return;
    }
    setDeletingCenterId(center.id);
    setError("");
    setMessage("");
    try {
      await deleteWorkCenter(center.id);
      setMessage(`工段「${center.name}」已删除。`);
      if (expandedCenter === center.id) {
        setExpandedCenter(null);
      }
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "工段删除失败。");
    } finally {
      setDeletingCenterId(null);
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

  const handleDeleteMachine = async (machine) => {
    if (!window.confirm(`确认删除设备「${machine.name}」？已被历史排产引用的设备不能物理删除。`)) {
      return;
    }
    setDeletingMachineId(machine.id);
    setError("");
    setMessage("");
    try {
      await deleteMachine(machine.id);
      setMessage(`设备「${machine.name}」已删除。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "设备删除失败。");
    } finally {
      setDeletingMachineId(null);
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
      <CompactSummaryStrip className="master-data-summary-strip" items={cards} loading={loading} />

      {blockedCenters.length > 0 ? (
        <div className="alert danger">
          <strong>阻塞：</strong>
          {blockedCenters.map((c) => c.name).join("、")}
          没有启用设备，对应工序无法排产。
        </div>
      ) : null}

      <WorkCenterForm
        form={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert danger">{error}</div> : null}

      <WorkCenterTable
        centers={centers}
        deletingCenterId={deletingCenterId}
        deletingMachineId={deletingMachineId}
        editMachineForm={editMachineForm}
        editingMachine={editingMachine}
        expandedCenter={expandedCenter}
        getMachinesForCenter={getMachinesForCenter}
        machineForm={machineForm}
        onCreateMachine={handleCreateMachine}
        onDeleteCenter={handleDeleteCenter}
        onDeleteMachine={handleDeleteMachine}
        onDisableCenter={handleDisableCenter}
        onEditCenter={handleEditCenter}
        onEditMachine={handleEditMachine}
        onEditMachineFormChange={(patch) => setEditMachineForm((current) => ({ ...current, ...patch }))}
        onMachineFormChange={(patch) => setMachineForm((current) => ({ ...current, ...patch }))}
        onSaveMachine={handleSaveMachine}
        onSetEditingMachine={setEditingMachine}
        onSetExpandedCenter={setExpandedCenter}
        onSetMachineForm={setMachineForm}
        onSetShowMachineForm={setShowMachineForm}
        showMachineForm={showMachineForm}
        submitting={submitting}
      />

      {editingCenter ? (
        <EditWorkCenterModal
          editForm={editForm}
          onCancel={() => setEditingCenter(null)}
          onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
          onSave={handleSaveCenter}
          submitting={submitting}
        />
      ) : null}
    </section>
  );
}

import { Fragment } from "react";

import StatusBadge from "../StatusBadge";
import MachineTable from "./MachineTable";

export const STATUS_LABELS = { active: "启用", disabled: "禁用" };

export default function WorkCenterTable({
  centers = [],
  deletingCenterId,
  deletingMachineId,
  editMachineForm,
  editingMachine,
  expandedCenter,
  getMachinesForCenter,
  machineForm,
  onCreateMachine,
  onDeleteCenter,
  onDeleteMachine,
  onDisableCenter,
  onEditCenter,
  onEditMachine,
  onEditMachineFormChange,
  onMachineFormChange,
  onSaveMachine,
  onSetExpandedCenter,
  onSetEditingMachine,
  onSetMachineForm,
  onSetShowMachineForm,
  showMachineForm,
  submitting,
}) {
  return (
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
              const activeMachines = centerMachines.filter((machine) => machine.status === "active");
              const isExpanded = expandedCenter === center.id;
              return (
                <Fragment key={center.id}>
                  <tr className={center.status === "disabled" ? "row-disabled" : ""}>
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
                      {center.is_external ? "--" : `${activeMachines.length}/${centerMachines.length}`}
                    </td>
                    <td>{`${center.default_capacity_per_day} min`}</td>
                    <td>{`${center.default_duration_hours}h`}</td>
                    <td>
                      <div className="row-actions">
                        <button className="button small ghost" type="button" onClick={() => onEditCenter(center)}>
                          编辑
                        </button>
                        <button
                          className={`button small ${center.status === "disabled" ? "" : "danger"}`}
                          type="button"
                          onClick={() => onDisableCenter(center)}
                          disabled={submitting}
                        >
                          {center.status === "disabled" ? "启用" : "禁用"}
                        </button>
                        <button
                          className="button small danger"
                          type="button"
                          onClick={() => onDeleteCenter(center)}
                          disabled={deletingCenterId === center.id}
                        >
                          {deletingCenterId === center.id ? "删除中..." : "删除"}
                        </button>
                        {!center.is_external && (
                          <button
                            className="button small ghost"
                            type="button"
                            onClick={() => onSetExpandedCenter(isExpanded ? null : center.id)}
                          >
                            {isExpanded ? "收起设备" : "展开设备"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && !center.is_external ? (
                    <tr className="machine-row">
                      <td colSpan={7}>
                        <MachineTable
                          center={center}
                          centerMachines={centerMachines}
                          deletingMachineId={deletingMachineId}
                          editMachineForm={editMachineForm}
                          editingMachine={editingMachine}
                          machineForm={machineForm}
                          onCancelCreate={() => onSetShowMachineForm(null)}
                          onCancelEdit={() => onSetEditingMachine(null)}
                          onCreateMachine={() => onCreateMachine(center.id)}
                          onDeleteMachine={onDeleteMachine}
                          onEditMachine={onEditMachine}
                          onEditMachineFormChange={onEditMachineFormChange}
                          onMachineFormChange={onMachineFormChange}
                          onSaveMachine={onSaveMachine}
                          onStartCreate={() => {
                            onSetShowMachineForm(center.id);
                            onSetMachineForm({
                              code: `${center.code}-${String(centerMachines.length + 1).padStart(2, "0")}`,
                              name: `${center.name}-${String(centerMachines.length + 1).padStart(2, "0")}`,
                              status: "active",
                              capacity_per_day: center.default_capacity_per_day,
                            });
                          }}
                          showMachineForm={showMachineForm}
                          submitting={submitting}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

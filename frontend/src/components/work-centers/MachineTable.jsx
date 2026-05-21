import StatusBadge from "../StatusBadge";

export const MACHINE_STATUS_OPTIONS = ["active", "disabled", "maintenance", "stopped"];
export const MACHINE_STATUS_LABELS = {
  active: "启用",
  disabled: "禁用",
  maintenance: "维修",
  stopped: "停机",
};

export default function MachineTable({
  center,
  centerMachines = [],
  deletingMachineId,
  editMachineForm,
  editingMachine,
  machineForm,
  onCancelCreate,
  onCancelEdit,
  onCreateMachine,
  onDeleteMachine,
  onEditMachine,
  onEditMachineFormChange,
  onMachineFormChange,
  onSaveMachine,
  onStartCreate,
  showMachineForm,
  submitting,
}) {
  return (
    <div className="machine-panel">
      <div className="machine-panel-header">
        <h4>{center.name} 设备列表</h4>
        <button className="button small" type="button" onClick={onStartCreate}>
          新增设备
        </button>
      </div>

      {showMachineForm === center.id && (
        <div className="machine-form-row">
          <input
            className="field-input"
            placeholder="设备编码"
            value={machineForm.code}
            onChange={(event) => onMachineFormChange({ code: event.target.value })}
          />
          <input
            className="field-input"
            placeholder="设备名称"
            value={machineForm.name}
            onChange={(event) => onMachineFormChange({ name: event.target.value })}
          />
          <input
            className="field-input"
            type="number"
            placeholder="日产能分钟"
            value={machineForm.capacity_per_day}
            onChange={(event) => onMachineFormChange({ capacity_per_day: event.target.value })}
          />
          <div className="form-actions">
            <button
              className="button small"
              type="button"
              onClick={onCreateMachine}
              disabled={submitting || !machineForm.code || !machineForm.name}
            >
              确认
            </button>
            <button className="button small ghost" type="button" onClick={onCancelCreate}>
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
                      onChange={(event) => onEditMachineFormChange({ code: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field-input"
                      value={editMachineForm.name}
                      onChange={(event) => onEditMachineFormChange({ name: event.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="field-input"
                      value={editMachineForm.status}
                      onChange={(event) => onEditMachineFormChange({ status: event.target.value })}
                    >
                      {MACHINE_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {MACHINE_STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="field-input"
                      type="number"
                      value={editMachineForm.capacity_per_day}
                      onChange={(event) => onEditMachineFormChange({ capacity_per_day: event.target.value })}
                    />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="button small" type="button" onClick={onSaveMachine} disabled={submitting}>
                        保存
                      </button>
                      <button className="button small ghost" type="button" onClick={onCancelEdit}>
                        取消
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={machine.id} className={machine.status !== "active" ? "row-disabled" : ""}>
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
                    <button className="button small ghost" type="button" onClick={() => onEditMachine(machine)}>
                      编辑
                    </button>
                    <button
                      className="button small danger"
                      type="button"
                      disabled={deletingMachineId === machine.id}
                      onClick={() => onDeleteMachine(machine)}
                    >
                      {deletingMachineId === machine.id ? "删除中..." : "删除"}
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

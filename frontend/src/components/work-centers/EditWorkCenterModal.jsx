export default function EditWorkCenterModal({
  editForm,
  onCancel,
  onChange,
  onSave,
  submitting,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">编辑工段</h3>
        </div>
        <div className="modal-form-grid">
          <label className="toolbar-field">
            <span>工段名称</span>
            <input
              className="field-input"
              value={editForm.name}
              onChange={(event) => onChange({ name: event.target.value })}
              required
            />
          </label>
          <label className="toolbar-field">
            <span>工段编码</span>
            <input
              className="field-input"
              value={editForm.code}
              onChange={(event) => onChange({ code: event.target.value })}
              required
            />
          </label>
          <label className="toolbar-field">
            <span>日产能分钟</span>
            <input
              className="field-input"
              type="number"
              value={editForm.default_capacity_per_day}
              onChange={(event) => onChange({ default_capacity_per_day: event.target.value })}
            />
          </label>
          <label className="toolbar-field">
            <span>默认外协周期小时</span>
            <input
              className="field-input"
              type="number"
              value={editForm.default_duration_hours}
              onChange={(event) => onChange({ default_duration_hours: event.target.value })}
            />
          </label>
          <label className="toolbar-field">
            <span>外协并发能力</span>
            <input
              className="field-input"
              type="number"
              min="1"
              disabled={!editForm.is_external}
              value={editForm.external_capacity_slots}
              onChange={(event) => onChange({ external_capacity_slots: event.target.value })}
            />
          </label>
          <label className="toolbar-field">
            <span>供应商</span>
            <input
              className="field-input"
              disabled={!editForm.is_external}
              value={editForm.external_vendor_name}
              onChange={(event) => onChange({ external_vendor_name: event.target.value })}
            />
          </label>
          <label className="toolbar-field">
            <span>外协周期覆盖</span>
            <input
              className="field-input"
              type="number"
              disabled={!editForm.is_external}
              value={editForm.external_lead_time_hours}
              onChange={(event) => onChange({ external_lead_time_hours: event.target.value })}
              placeholder="默认使用上方周期"
            />
          </label>
          <label className="toolbar-field">
            <span>说明</span>
            <input
              className="field-input"
              value={editForm.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={editForm.is_external}
              onChange={(event) => onChange({ is_external: event.target.checked })}
            />
            外协资源
          </label>
        </div>
        <div className="form-actions">
          <button className="button" type="button" onClick={onSave} disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </button>
          <button className="button ghost" type="button" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

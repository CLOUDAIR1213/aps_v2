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
        <div className="form-grid">
          <label className="field-label">
            工段名称
            <input
              className="field-input"
              value={editForm.name}
              onChange={(event) => onChange({ name: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            工段编码
            <input
              className="field-input"
              value={editForm.code}
              onChange={(event) => onChange({ code: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            日产能分钟
            <input
              className="field-input"
              type="number"
              value={editForm.default_capacity_per_day}
              onChange={(event) => onChange({ default_capacity_per_day: event.target.value })}
            />
          </label>
          <label className="field-label">
            默认外协周期小时
            <input
              className="field-input"
              type="number"
              value={editForm.default_duration_hours}
              onChange={(event) => onChange({ default_duration_hours: event.target.value })}
            />
          </label>
          <label className="field-label">
            说明
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

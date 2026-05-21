export default function WorkCenterForm({ form, onChange, onSubmit, submitting }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">新增工段</h3>
          <p className="panel-subtitle">
            工艺表里的工序列默认会变成资源工段；内部工段可配置多台设备，外协工段按周期排。
          </p>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label className="field-label">
          工段名称
          <input
            className="field-input"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="例如 5m龙门"
            required
          />
        </label>
        <label className="field-label">
          工段编码
          <input
            className="field-input"
            value={form.code}
            onChange={(event) => onChange({ code: event.target.value })}
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
            onChange={(event) => onChange({ default_capacity_per_day: event.target.value })}
          />
        </label>
        <label className="field-label">
          默认外协周期小时
          <input
            className="field-input"
            type="number"
            value={form.default_duration_hours}
            onChange={(event) => onChange({ default_duration_hours: event.target.value })}
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
            onChange={(event) => onChange({ machine_count: event.target.value })}
          />
        </label>
        <label className="field-label">
          说明
          <input
            className="field-input"
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="可选备注"
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.is_external}
            onChange={(event) => onChange({ is_external: event.target.checked })}
          />
          外协资源
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "创建中..." : "新增工段"}
          </button>
        </div>
      </form>
    </div>
  );
}

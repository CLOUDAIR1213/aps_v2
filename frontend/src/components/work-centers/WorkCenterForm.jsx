export default function WorkCenterForm({ form, onChange, onSubmit, submitting }) {
  return (
    <div className="panel compact-page-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">新增工段</h3>
          <p className="panel-subtitle">
            工艺表里的工序列默认会变成资源工段；内部工段可配置多台设备，外协工段按周期排。
          </p>
        </div>
      </div>

      <form className="table-toolbar work-center-toolbar" onSubmit={onSubmit}>
        <label className="toolbar-field">
          <span>工段名称</span>
          <input
            className="field-input"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="例如 5m龙门"
            required
          />
        </label>
        <label className="toolbar-field">
          <span>工段编码</span>
          <input
            className="field-input"
            value={form.code}
            onChange={(event) => onChange({ code: event.target.value })}
            placeholder="全局唯一编码"
            required
          />
        </label>
        <label className="toolbar-field">
          <span>日产能分钟</span>
          <input
            className="field-input"
            type="number"
            value={form.default_capacity_per_day}
            onChange={(event) => onChange({ default_capacity_per_day: event.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>默认外协周期小时</span>
          <input
            className="field-input"
            type="number"
            value={form.default_duration_hours}
            onChange={(event) => onChange({ default_duration_hours: event.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>外协并发能力</span>
          <input
            className="field-input"
            type="number"
            min="1"
            disabled={!form.is_external}
            value={form.external_capacity_slots}
            onChange={(event) => onChange({ external_capacity_slots: event.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>供应商</span>
          <input
            className="field-input"
            disabled={!form.is_external}
            value={form.external_vendor_name}
            onChange={(event) => onChange({ external_vendor_name: event.target.value })}
            placeholder="可选"
          />
        </label>
        <label className="toolbar-field">
          <span>外协周期覆盖</span>
          <input
            className="field-input"
            type="number"
            disabled={!form.is_external}
            value={form.external_lead_time_hours}
            onChange={(event) => onChange({ external_lead_time_hours: event.target.value })}
            placeholder="默认使用上方周期"
          />
        </label>
        <label className="toolbar-field">
          <span>设备数量</span>
          <input
            className="field-input"
            type="number"
            min="1"
            disabled={form.is_external}
            value={form.machine_count}
            onChange={(event) => onChange({ machine_count: event.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>说明</span>
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
        <div className="toolbar-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "创建中..." : "新增工段"}
          </button>
        </div>
      </form>
    </div>
  );
}

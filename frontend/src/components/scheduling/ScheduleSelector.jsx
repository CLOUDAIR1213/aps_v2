import { Link } from "react-router-dom";

import { buildSchedulePath } from "../../utils/scheduleContext";

export default function ScheduleSelector({
  exporting,
  onExport,
  onRefresh,
  onScheduleChange,
  schedules = [],
  selectedScheduleId,
}) {
  return (
    <div className="panel-actions">
      <label className="field-label compact-field">
        排产方案
        <select className="field-input" value={selectedScheduleId} onChange={onScheduleChange}>
          {schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.schedule_no}
            </option>
          ))}
        </select>
      </label>
      <button className="button ghost" type="button" disabled={exporting} onClick={onExport}>
        {exporting ? "导出中..." : "导出 Excel"}
      </button>
      <button className="button ghost" type="button" onClick={onRefresh}>
        刷新
      </button>
      <Link className="button ghost" to={buildSchedulePath("/dispatch", selectedScheduleId)}>
        派工与工时
      </Link>
    </div>
  );
}

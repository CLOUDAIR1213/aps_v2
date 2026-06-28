import { formatHours } from "../../utils/formatters";

function minutesToHours(minutes) {
  return formatHours((Number(minutes) || 0) / 60);
}

export default function PersonnelAllocationEditor({
  batchMode = false,
  canSave,
  draft = [],
  draftPersonIds = [],
  draftTotal,
  mismatchedDraftPeople = [],
  onAddRow,
  onAssignSingleFull,
  onDistributeEvenly,
  onRemoveRow,
  onSave,
  onUpdateRow,
  ratioDelta,
  ratiosValid,
  saving,
  selectedBatchSummary = null,
  selectedTask,
  suggestedPersonnel = [],
}) {
  const hasSelection = batchMode ? selectedBatchSummary?.taskCount > 0 : selectedTask;
  const totalMinutes = batchMode ? selectedBatchSummary?.totalMinutes : selectedTask?.planned_minutes;
  const hasAssignablePersonnel = !hasSelection || suggestedPersonnel.length > 0;

  return (
    <aside className="panel dispatch-editor">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">人员分摊</h3>
          <p className="panel-subtitle">
            {batchMode
              ? selectedBatchSummary?.taskCount
                ? `批量模式 / 已选 ${selectedBatchSummary.taskCount} 条任务`
                : "请选择左侧汇总任务"
              : selectedTask
                ? `${selectedTask.order_no} / ${selectedTask.operation_name}`
                : "请选择左侧任务"}
          </p>
        </div>
      </div>

      {hasSelection ? (
        <>
          <div className="detail-list">
            {batchMode ? (
              <>
                <div className="detail-row">
                  <span className="detail-key">涉及工段</span>
                  <span className="detail-value">{selectedBatchSummary.workCenterNames.join("、") || "--"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">涉及工序</span>
                  <span className="detail-value">{selectedBatchSummary.operationNames.join("、") || "--"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">涉及订单</span>
                  <span className="detail-value">{selectedBatchSummary.orderCount}</span>
                </div>
              </>
            ) : null}
            <div className="detail-row">
              <span className="detail-key">{batchMode ? "已选总工时" : "任务工时"}</span>
              <span className="detail-value">{minutesToHours(totalMinutes)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">占比合计</span>
              <span className="detail-value">{draftTotal}%</span>
            </div>
          </div>

          <div className="allocation-editor-list">
            {draft.map((row, index) => {
              const ratio = Number(row.ratio_percent) || 0;
              const minutes = Math.round(totalMinutes * ratio / 100);
              return (
                <div className="allocation-editor-row" key={`${row.person_id}-${index}`}>
                  <select
                    className="field-input"
                    value={row.person_id}
                    onChange={(event) => onUpdateRow(index, { person_id: event.target.value })}
                  >
                    <option value="">选择人员</option>
                    {suggestedPersonnel.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} / {person.employee_no} / {(person.work_centers || []).map((center) => center.name).join("、") || "未关联工段"}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input ratio-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={row.ratio_percent}
                    onChange={(event) => onUpdateRow(index, { ratio_percent: event.target.value })}
                  />
                  <span className="allocation-minutes">{minutesToHours(minutes)}</span>
                  <button className="button ghost compact-button" type="button" onClick={() => onRemoveRow(index)}>
                    删除
                  </button>
                </div>
              );
            })}
          </div>

          <div className="panel-actions dispatch-editor-actions">
            <button className="button ghost" type="button" onClick={onAddRow} disabled={!hasAssignablePersonnel}>添加人员</button>
            <button className="button ghost" type="button" onClick={onAssignSingleFull} disabled={!hasAssignablePersonnel}>
              单人 100%
            </button>
            <button className="button ghost" type="button" onClick={onDistributeEvenly} disabled={!hasAssignablePersonnel || draft.length < 2}>
              多人均分
            </button>
            <button className="button" type="button" onClick={onSave} disabled={!canSave || saving}>
              {saving ? "保存中..." : "保存派工"}
            </button>
          </div>
          {!hasAssignablePersonnel ? (
            <div className="alert warning">
              当前没有可派工的在职人员，请先到基础配置维护人员。
            </div>
          ) : null}
          {mismatchedDraftPeople.length ? (
            <div className="alert warning">
              {mismatchedDraftPeople.map((person) => person.name).join("、")} 不属于当前工段“{selectedTask.work_center_name}”，可跨工段保存，请确认派工安排。
            </div>
          ) : null}
          {!canSave ? (
            <div className="alert warning">
              {!hasAssignablePersonnel
                ? "当前暂无可选人员。"
                : !draft.length
                ? "请至少添加一名人员。"
                : draftPersonIds.length !== draft.length
                  ? "每行都需要选择一名在职人员。"
                  : new Set(draftPersonIds).size !== draftPersonIds.length
                    ? "同一任务不能重复选择同一人员。"
                    : !ratiosValid
                      ? "每个人员占比必须大于 0 且不超过 100%。"
                      : `占比还差 ${ratioDelta > 0 ? ratioDelta : 0}%，或已超出 ${ratioDelta < 0 ? Math.abs(ratioDelta) : 0}%。`}
            </div>
          ) : null}
        </>
      ) : (
        <div className="alert info">{batchMode ? "请先在汇总视图中选择任务。" : "请选择一个任务后编辑分摊。"}</div>
      )}
    </aside>
  );
}

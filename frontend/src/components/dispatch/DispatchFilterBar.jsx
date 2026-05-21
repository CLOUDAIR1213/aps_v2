export default function DispatchFilterBar({
  dispatch,
  filters,
  loading,
  onFilterChange,
  onQueryChange,
  onSubmit,
  orders = [],
  query,
  workCenters = [],
}) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="field-label">
        工单
        <select
          className="field-input"
          value={filters.work_order_id}
          onChange={(event) => onFilterChange({ work_order_id: event.target.value })}
        >
          <option value="">全部工单</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>{order.order_no}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        工段
        <select
          className="field-input"
          value={filters.work_center_id}
          onChange={(event) => onFilterChange({ work_center_id: event.target.value })}
        >
          <option value="">全部工段</option>
          {workCenters.map((center) => (
            <option key={center.id} value={center.id}>{center.name}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        人员
        <select
          className="field-input"
          value={filters.person_id}
          onChange={(event) => onFilterChange({ person_id: event.target.value })}
        >
          <option value="">全部人员</option>
          {dispatch?.personnel?.map((person) => (
            <option key={person.id} value={person.id}>{person.name}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        派工状态
        <select
          className="field-input"
          value={filters.allocation_status}
          onChange={(event) => onFilterChange({ allocation_status: event.target.value })}
        >
          <option value="">全部状态</option>
          <option value="unassigned">未派工</option>
          <option value="assigned">已派工</option>
        </select>
      </label>
      <label className="field-label">
        搜索
        <input
          className="field-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="订单、零件、工序、人员"
        />
      </label>
      <div className="form-actions">
        <button className="button" type="submit" disabled={loading}>
          {loading ? "加载中..." : "刷新"}
        </button>
      </div>
    </form>
  );
}

import { formatDateTime } from "../../utils/formatters";

export default function CurrentScheduleBanner({ loading = false, overview = null, schedule = null }) {
  const scheduleNo = overview?.schedule_no || schedule?.schedule_no || "--";
  const createdAt = schedule?.created_at ? formatDateTime(schedule.created_at) : "--";
  const totalOrders = overview?.total_orders ?? "--";
  const delayedOrders = overview?.delayed_orders ?? "--";

  return (
    <div className="current-schedule-banner">
      <div>
        <p className="current-schedule-label">当前方案</p>
        <strong>{loading ? "加载中..." : scheduleNo}</strong>
      </div>
      <div>
        <p className="current-schedule-label">创建时间</p>
        <strong>{loading ? "--" : createdAt}</strong>
      </div>
      <div>
        <p className="current-schedule-label">订单数</p>
        <strong>{loading ? "--" : totalOrders}</strong>
      </div>
      <div>
        <p className="current-schedule-label">延期数</p>
        <strong>{loading ? "--" : delayedOrders}</strong>
      </div>
    </div>
  );
}

import OrderLockTable from "./OrderLockTable";
import StatusBadge from "../StatusBadge";
import { formatDate, formatDateTime } from "../../utils/formatters";

function getCompletionRisk(order) {
  if (order.status === "delayed" || order.delay_days > 0) {
    return {
      label: `延期 ${order.delay_days} 天`,
      rank: 0,
      rowClass: "completion-row-delayed",
      tone: "danger"
    };
  }

  const dueTime = new Date(order.due_date).getTime();
  const finishTime = new Date(order.planned_end_time).getTime();
  const hoursBeforeDue = (dueTime - finishTime) / 3600000;

  if (hoursBeforeDue >= 0 && hoursBeforeDue <= 48) {
    return {
      label: "临近交期",
      rank: 1,
      rowClass: "completion-row-due-soon",
      tone: "warning"
    };
  }

  return {
    label: "正常",
    rank: 2,
    rowClass: "completion-row-normal",
    tone: "success"
  };
}

export function sortOrdersByCompletionRisk(orders = []) {
  return [...orders].sort((a, b) => {
    const riskDelta = getCompletionRisk(a).rank - getCompletionRisk(b).rank;
    if (riskDelta !== 0) return riskDelta;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

export default function OrderTimeline({
  deletingOrderId,
  lockingOrderId,
  onDeleteOrder,
  onLockOrder,
  onUnlockOrder,
  orders = [],
  scheduleId
}) {
  if (!orders.length) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">暂无订单完工数据</h3>
        <p className="empty-state-copy">请先在排产驾驶台执行生产排产。</p>
      </div>
    );
  }

  const sortedOrders = sortOrdersByCompletionRisk(orders);

  return (
    <div className="table-shell">
      <table className="data-table completion-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>客户</th>
            <th>产品</th>
            <th>交期</th>
            <th>预计开始</th>
            <th>预计完成</th>
            <th>延期天数</th>
            <th>瓶颈</th>
            <th>锁定计划状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrders.map((order) => {
            const risk = getCompletionRisk(order);
            return (
              <tr className={risk.rowClass} key={order.work_order_id}>
                <td>
                  <p className="data-primary">{order.order_no}</p>
                  <StatusBadge tone={risk.tone}>{risk.label}</StatusBadge>
                </td>
                <td>{order.customer_name}</td>
                <td>{order.product_name}</td>
                <td>{formatDate(order.due_date)}</td>
                <td>{formatDateTime(order.planned_start_time)}</td>
                <td>
                  <strong className="completion-time">{formatDateTime(order.planned_end_time)}</strong>
                </td>
                <td>
                  {order.delay_days > 0 ? (
                    <StatusBadge tone="danger">{`${order.delay_days} 天`}</StatusBadge>
                  ) : (
                    <span className="muted">0 天</span>
                  )}
                </td>
                <td>{order.main_bottleneck || "暂无"}</td>
                <OrderLockTable
                  deletingOrderId={deletingOrderId}
                  lockingOrderId={lockingOrderId}
                  onDeleteOrder={onDeleteOrder}
                  onLockOrder={onLockOrder}
                  onUnlockOrder={onUnlockOrder}
                  order={order}
                  scheduleId={scheduleId}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { Fragment } from "react";
import { Link } from "react-router-dom";

import StatusBadge from "../StatusBadge";

export default function OrderLockTable({
  deletingOrderId,
  lockingOrderId,
  onDeleteOrder,
  onLockOrder,
  onUnlockOrder,
  order,
  scheduleId,
}) {
  return (
    <Fragment>
      <td>
        {order.is_locked ? (
          <StatusBadge tone="info">计划已锁定</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">未锁定计划</StatusBadge>
        )}
      </td>
      <td>
        <div className="row-actions">
          {order.is_locked ? (
            <button
              className="button small ghost"
              type="button"
              disabled={lockingOrderId === order.work_order_id}
              onClick={() => onUnlockOrder?.(order.work_order_id)}
            >
              {lockingOrderId === order.work_order_id ? "处理中..." : "取消锁定"}
            </button>
          ) : (
            <button
              className="button small"
              type="button"
              disabled={lockingOrderId === order.work_order_id}
              onClick={() => onLockOrder?.(order.work_order_id)}
            >
              {lockingOrderId === order.work_order_id ? "处理中..." : "锁定计划"}
            </button>
          )}
          <Link
            className="button small ghost"
            to={`/scheduling/orders/${order.work_order_id}?schedule_id=${scheduleId}`}
          >
            订单详情
          </Link>
          {onDeleteOrder ? (
            <details className="row-more">
              <summary>更多</summary>
              <button
                className="text-danger-action"
                type="button"
                disabled={deletingOrderId === order.work_order_id}
                onClick={() => onDeleteOrder(order)}
              >
                {deletingOrderId === order.work_order_id ? "删除中..." : "删除订单"}
              </button>
            </details>
          ) : null}
        </div>
      </td>
    </Fragment>
  );
}

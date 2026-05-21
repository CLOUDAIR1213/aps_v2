import { Link } from "react-router-dom";

import OrderTimeline from "./OrderTimeline";
import { buildScheduleBoardPath, buildSchedulePath } from "../../utils/scheduleContext";

export default function OrderCompletionTable({
  deletingOrderId,
  lockingOrderId,
  onDeleteOrder,
  onLockOrder,
  onUnlockOrder,
  orders = [],
  scheduleId,
}) {
  return (
    <div className="panel completion-table-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">订单完工总览</h3>
          <p className="panel-subtitle">老板看预计完成，计划员看延期天数、瓶颈和锁定计划状态。</p>
        </div>
        <div className="panel-actions">
          <Link className="button ghost small" to={buildSchedulePath("/gantt", scheduleId)}>
            查看资源甘特图
          </Link>
          <Link className="button ghost small" to={buildScheduleBoardPath(scheduleId)}>
            查看生产排班表
          </Link>
        </div>
      </div>
      <OrderTimeline
        deletingOrderId={deletingOrderId}
        lockingOrderId={lockingOrderId}
        onDeleteOrder={onDeleteOrder}
        onLockOrder={onLockOrder}
        onUnlockOrder={onUnlockOrder}
        orders={orders}
        scheduleId={scheduleId}
      />
    </div>
  );
}

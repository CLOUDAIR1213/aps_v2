import StatusBadge from "./StatusBadge";
import { formatDateTime, formatHours, getDurationHours } from "../utils/formatters";

export default function ScheduleTable({ items = [] }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">
          {"\u6682\u65e0\u6392\u4ea7\u7ed3\u679c"}
        </h3>
        <p className="empty-state-copy">
          {"\u8bf7\u5148\u5728\u6392\u4ea7\u9a7e\u9a76\u53f0\u751f\u6210\u4efb\u52a1\u5e76\u6267\u884c\u6392\u4ea7\u3002"}
        </p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>{"\u8ba2\u5355 / \u4ea7\u54c1"}</th>
            <th>{"\u5de5\u5e8f"}</th>
            <th>{"\u8bbe\u5907"}</th>
            <th>{"\u65f6\u95f4\u7a97"}</th>
            <th>{"\u8d1f\u8377"}</th>
            <th>{"\u987a\u5e8f"}</th>
            <th>{"\u4ea4\u671f"}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <p className="data-primary">{item.order_no || "--"}</p>
                <p className="data-secondary">{item.product_name || "--"}</p>
              </td>
              <td>
                <p className="data-primary">{item.task_name || "--"}</p>
                <p className="data-secondary">
                  {item.machine_code ? `${item.machine_code} / ` : ""}
                  {item.sequence_on_machine
                    ? `Seq ${item.sequence_on_machine}`
                    : "--"}
                </p>
              </td>
              <td>
                <p className="data-primary">
                  {item.machine_name || item.machine_code || "--"}
                </p>
                <p className="data-secondary">{item.machine_code || "--"}</p>
              </td>
              <td>
                <p className="data-primary">{formatDateTime(item.start_time)}</p>
                <p className="data-secondary">{formatDateTime(item.end_time)}</p>
              </td>
              <td>
                <p className="data-primary">
                  {formatHours(getDurationHours(item.start_time, item.end_time))}
                </p>
                <p className="data-secondary">
                  {item.order_priority !== undefined
                    ? `P${item.order_priority}`
                    : "\u89c4\u5219\u6392\u4ea7"}
                </p>
              </td>
              <td>
                <StatusBadge tone="info">
                  {`\u673a\u53f0\u987a\u5e8f ${item.sequence_on_machine ?? "--"}`}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge tone={item.deadlineTone || "neutral"}>
                  {item.dueDateLabel || "--"}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

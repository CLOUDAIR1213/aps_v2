export default function StepIndicator({ activeIndex, steps }) {
  return (
    <div className="sidebar-flow">
      <p className="sidebar-flow-title">当前流程</p>
      <ol className="sidebar-flow-list">
        {steps.map((step, index) => (
          <li className={`sidebar-flow-item${index === activeIndex ? " active" : ""}`} key={step}>
            <span className="flow-index">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

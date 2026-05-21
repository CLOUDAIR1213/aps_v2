import PageHeader from "./PageHeader";
import SidebarNav from "./SidebarNav";

export default function MainLayout({
  actions,
  activeWorkflowIndex,
  children,
  meta,
  onLogout,
  user,
  workflowSteps
}) {
  return (
    <div className="app-shell">
      <SidebarNav activeWorkflowIndex={activeWorkflowIndex} workflowSteps={workflowSteps} />
      <div className="app-main">
        <PageHeader actions={actions} meta={meta} onLogout={onLogout} user={user} />
        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}

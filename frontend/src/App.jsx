import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import { getPageActions, getPageMeta, getWorkflowIndex, workflowSteps } from "./navigation";

export default function App() {
  const location = useLocation();
  const meta = getPageMeta(location.pathname);
  const actions = getPageActions(location.pathname);
  const activeWorkflowIndex = getWorkflowIndex(location.pathname);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aps_user"));
    } catch {
      return null;
    }
  });

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("aps_user");
    setUser(null);
  };

  return (
    <MainLayout
      actions={actions}
      activeWorkflowIndex={activeWorkflowIndex}
      meta={meta}
      onLogout={handleLogout}
      user={user}
      workflowSteps={workflowSteps}
    >
      <Outlet />
    </MainLayout>
  );
}

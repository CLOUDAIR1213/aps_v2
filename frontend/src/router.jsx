import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import Dashboard from "./pages/Dashboard";
import Dispatch from "./pages/Dispatch";
import Gantt from "./pages/Gantt";
import ManagementDashboard from "./pages/ManagementDashboard";
import OperationMapping from "./pages/OperationMapping";
import OrderScheduleDetail from "./pages/OrderScheduleDetail";
import Personnel from "./pages/Personnel";
import ResourceGroups from "./pages/ResourceGroups";
import ScheduleBoard from "./pages/ScheduleBoard";
import ScheduleResults from "./pages/ScheduleResults";
import Scheduling from "./pages/Scheduling";
import SetupCenter from "./pages/SetupCenter";
import WorkCenters from "./pages/WorkCenters";
import WorkOrderImport from "./pages/WorkOrderImport";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "setup", element: <SetupCenter /> },
      { path: "work-order-import", element: <WorkOrderImport /> },
      { path: "work-centers", element: <WorkCenters /> },
      { path: "operation-mappings", element: <OperationMapping /> },
      { path: "resource-groups", element: <ResourceGroups /> },
      { path: "personnel", element: <Personnel /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "scheduling/orders/:workOrderId", element: <OrderScheduleDetail /> },
      { path: "scheduling/board", element: <ScheduleBoard /> },
      { path: "scheduling/board/:scheduleId", element: <ScheduleBoard /> },
      { path: "schedule-results", element: <ScheduleResults /> },
      { path: "dispatch", element: <Dispatch /> },
      { path: "management-dashboard", element: <ManagementDashboard /> },
      { path: "gantt", element: <Gantt /> }
    ]
  }
]);

export default router;

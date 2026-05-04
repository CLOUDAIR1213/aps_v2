import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import Dashboard from "./pages/Dashboard";
import Gantt from "./pages/Gantt";
import Machines from "./pages/Machines";
import OperationMapping from "./pages/OperationMapping";
import OrderScheduleDetail from "./pages/OrderScheduleDetail";
import Orders from "./pages/Orders";
import Personnel from "./pages/Personnel";
import ResourceGroups from "./pages/ResourceGroups";
import Routings from "./pages/Routings";
import ScheduleBoard from "./pages/ScheduleBoard";
import ScheduleResults from "./pages/ScheduleResults";
import Scheduling from "./pages/Scheduling";
import WorkCenters from "./pages/WorkCenters";
import WorkOrderImport from "./pages/WorkOrderImport";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "work-order-import", element: <WorkOrderImport /> },
      { path: "work-centers", element: <WorkCenters /> },
      { path: "operation-mappings", element: <OperationMapping /> },
      { path: "resource-groups", element: <ResourceGroups /> },
      { path: "personnel", element: <Personnel /> },
      { path: "machines", element: <Machines /> },
      { path: "orders", element: <Orders /> },
      { path: "routings", element: <Routings /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "scheduling/orders/:workOrderId", element: <OrderScheduleDetail /> },
      { path: "scheduling/board/:scheduleId", element: <ScheduleBoard /> },
      { path: "schedule-results", element: <ScheduleResults /> },
      { path: "gantt", element: <Gantt /> }
    ]
  }
]);

export default router;

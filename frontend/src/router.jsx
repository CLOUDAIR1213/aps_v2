import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import Dashboard from "./pages/Dashboard";
import Gantt from "./pages/Gantt";
import Machines from "./pages/Machines";
import Orders from "./pages/Orders";
import Routings from "./pages/Routings";
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
      { path: "machines", element: <Machines /> },
      { path: "orders", element: <Orders /> },
      { path: "routings", element: <Routings /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "schedule-results", element: <ScheduleResults /> },
      { path: "gantt", element: <Gantt /> }
    ]
  }
]);

export default router;

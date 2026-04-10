import { useEffect, useState } from "react";

import RoutingForm from "../components/RoutingForm";
import { getMachines } from "../api/machine";
import { getOrders } from "../api/order";
import {
  createRouting,
  createRoutingOperation,
  getRoutingOperations,
  getRoutingsByOrder
} from "../api/routing";

export default function Routings() {
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [routings, setRoutings] = useState([]);
  const [operations, setOperations] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedRoutingId, setSelectedRoutingId] = useState("");
  const [routingName, setRoutingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [operationForm, setOperationForm] = useState({
    seq_no: 1,
    operation_name: "",
    machine_id: "",
    process_time: 1,
    setup_time: 0
  });

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [ordersData, machinesData] = await Promise.all([
          getOrders(),
          getMachines()
        ]);
        setOrders(ordersData);
        setMachines(machinesData);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.detail || "基础数据加载失败。"
        );
      }
    };

    loadBaseData();
  }, []);

  useEffect(() => {
    const loadRoutings = async () => {
      if (!selectedOrderId) {
        setRoutings([]);
        setOperations([]);
        setSelectedRoutingId("");
        return;
      }

      try {
        const routingData = await getRoutingsByOrder(selectedOrderId);
        setRoutings(routingData);
        if (routingData.length === 0) {
          setOperations([]);
          setSelectedRoutingId("");
        }
      } catch (requestError) {
        setError(
          requestError?.response?.data?.detail || "工艺路线加载失败。"
        );
      }
    };

    loadRoutings();
  }, [selectedOrderId]);

  useEffect(() => {
    const loadOperations = async () => {
      if (!selectedRoutingId) {
        setOperations([]);
        return;
      }

      try {
        const operationData = await getRoutingOperations(selectedRoutingId);
        setOperations((previous) => {
          const otherRoutingOperations = previous.filter(
            (item) => item.routing_id !== Number(selectedRoutingId)
          );
          return [...otherRoutingOperations, ...operationData];
        });
      } catch (requestError) {
        setError(
          requestError?.response?.data?.detail || "工序加载失败。"
        );
      }
    };

    loadOperations();
  }, [selectedRoutingId]);

  const handleCreateRouting = async () => {
    if (!selectedOrderId || !routingName) {
      setError("请先选择订单并输入工艺路线名称。");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const routing = await createRouting({
        order_id: Number(selectedOrderId),
        name: routingName
      });
      const routingData = await getRoutingsByOrder(selectedOrderId);
      setRoutings(routingData);
      setSelectedRoutingId(String(routing.id));
      setRoutingName("");
      setMessage("工艺路线新增成功。");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "工艺路线新增失败。"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = async () => {
    if (!selectedRoutingId) {
      setError("请先选择工艺路线。");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await createRoutingOperation({
        routing_id: Number(selectedRoutingId),
        seq_no: Number(operationForm.seq_no),
        operation_name: operationForm.operation_name,
        machine_id: Number(operationForm.machine_id),
        process_time: Number(operationForm.process_time),
        setup_time: Number(operationForm.setup_time)
      });
      const operationData = await getRoutingOperations(selectedRoutingId);
      setOperations((previous) => {
        const otherRoutingOperations = previous.filter(
          (item) => item.routing_id !== Number(selectedRoutingId)
        );
        return [...otherRoutingOperations, ...operationData];
      });
      setOperationForm({
        seq_no: Number(operationForm.seq_no) + 1,
        operation_name: "",
        machine_id: "",
        process_time: 1,
        setup_time: 0
      });
      setMessage("工序新增成功。");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "工序新增失败。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <h1>工艺路线管理</h1>
      <p style={{ color: "#667085" }}>
        先选择订单并创建工艺路线，再为该工艺路线逐步新增工序。
      </p>
      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      <RoutingForm
        orders={orders}
        machines={machines}
        selectedOrderId={selectedOrderId}
        onSelectedOrderChange={setSelectedOrderId}
        routingName={routingName}
        onRoutingNameChange={setRoutingName}
        onCreateRouting={handleCreateRouting}
        routings={routings}
        selectedRoutingId={selectedRoutingId}
        onSelectedRoutingChange={setSelectedRoutingId}
        operationForm={operationForm}
        onOperationFormChange={(field, value) =>
          setOperationForm((previous) => ({ ...previous, [field]: value }))
        }
        onCreateOperation={handleCreateOperation}
        operations={operations}
        loading={loading}
      />
    </section>
  );
}

const successStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#ecfdf3",
  border: "1px solid #abefc6",
  color: "#027a48"
};

const errorStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  backgroundColor: "#fef3f2",
  border: "1px solid #fecdca",
  color: "#b42318"
};

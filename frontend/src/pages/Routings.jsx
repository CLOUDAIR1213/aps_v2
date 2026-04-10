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
          requestError?.response?.data?.detail || "Failed to load base data."
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
          requestError?.response?.data?.detail || "Failed to load routings."
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
          requestError?.response?.data?.detail || "Failed to load operations."
        );
      }
    };

    loadOperations();
  }, [selectedRoutingId]);

  const handleCreateRouting = async () => {
    if (!selectedOrderId || !routingName) {
      setError("Please select an order and enter a routing name.");
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
      setMessage("Routing created successfully.");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to create routing."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = async () => {
    if (!selectedRoutingId) {
      setError("Please select a routing first.");
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
      setMessage("Operation created successfully.");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Failed to create operation."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <h1>Routings</h1>
      <p style={{ color: "#667085" }}>
        Select an order, create a routing, and then add operations to that routing.
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

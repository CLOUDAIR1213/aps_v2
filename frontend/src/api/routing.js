import apiClient from "./client";

export const getRoutingsByOrder = async (orderId) => {
  const response = await apiClient.get(`/api/routings/order/${orderId}`);
  return response.data;
};

export const createRouting = async (payload) => {
  const response = await apiClient.post("/api/routings", payload);
  return response.data;
};

export const getRoutingOperations = async (routingId) => {
  const response = await apiClient.get(`/api/routing-operations/routing/${routingId}`);
  return response.data;
};

export const createRoutingOperation = async (payload) => {
  const response = await apiClient.post("/api/routing-operations", payload);
  return response.data;
};

import apiClient from "./client";

export const getOrders = async () => {
  const response = await apiClient.get("/api/orders");
  return response.data;
};

export const createOrder = async (payload) => {
  const response = await apiClient.post("/api/orders", payload);
  return response.data;
};

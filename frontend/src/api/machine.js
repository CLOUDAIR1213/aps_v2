import apiClient from "./client";

export const getMachines = async () => {
  const response = await apiClient.get("/api/machines");
  return response.data;
};

export const createMachine = async (payload) => {
  const response = await apiClient.post("/api/machines", payload);
  return response.data;
};

import apiClient from "./client";

export const login = async (payload) => {
  const response = await apiClient.post("/api/auth/login", payload);
  return response.data;
};

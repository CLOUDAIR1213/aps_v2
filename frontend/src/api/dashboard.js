import apiClient from "./client";

export const getDashboardSummary = async () => {
  const response = await apiClient.get("/api/dashboard/summary");
  return response.data;
};

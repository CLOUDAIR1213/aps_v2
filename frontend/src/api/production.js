import apiClient from "./client";

export const getWorkCenters = async () => {
  const response = await apiClient.get("/api/work-centers");
  return response.data;
};

export const createWorkCenter = async (payload) => {
  const response = await apiClient.post("/api/work-centers", payload);
  return response.data;
};

export const getWorkOrders = async () => {
  const response = await apiClient.get("/api/work-orders");
  return response.data;
};

export const previewWorkOrderImport = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/api/imports/work-orders/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const commitWorkOrderImport = async (payload) => {
  const response = await apiClient.post("/api/imports/work-orders/commit", payload);
  return response.data;
};

export const getProductionOperations = async () => {
  const response = await apiClient.get("/api/production/operations");
  return response.data;
};

export const runProductionScheduling = async () => {
  const response = await apiClient.post("/api/production/scheduling/run");
  return response.data;
};

export const getProductionSchedulingResult = async () => {
  const response = await apiClient.get("/api/production/scheduling/results");
  return response.data;
};

export const getProductionGanttData = async () => {
  const response = await apiClient.get("/api/production/scheduling/gantt");
  return response.data;
};

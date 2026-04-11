import apiClient from "./client";

export const generateTasks = async () => {
  const response = await apiClient.post("/api/scheduling/generate-tasks");
  return response.data;
};

export const getScheduleTasks = async () => {
  const response = await apiClient.get("/api/scheduling/tasks");
  return response.data;
};

export const runScheduling = async () => {
  const response = await apiClient.post("/api/scheduling/run");
  return response.data;
};

export const getLatestSchedulingResult = async () => {
  const response = await apiClient.get("/api/scheduling/results");
  return response.data;
};

export const getGanttData = async () => {
  const response = await apiClient.get("/api/scheduling/gantt");
  return response.data;
};

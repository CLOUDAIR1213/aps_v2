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

export const getPersonnel = async () => {
  const response = await apiClient.get("/api/personnel");
  return response.data;
};

export const importPersonnel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/api/personnel/import", formData, {
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

export const runProductionScheduling = async (payload = {}) => {
  const response = await apiClient.post("/api/production/scheduling/run", payload);
  return response.data;
};

export const getProductionSchedules = async () => {
  const response = await apiClient.get("/api/production/scheduling/schedules");
  return response.data;
};

export const getProductionSchedulingOverview = async (params = {}) => {
  const response = await apiClient.get("/api/production/scheduling/overview", { params });
  return response.data;
};

export const getOrderScheduleDetail = async (workOrderId, params = {}) => {
  const response = await apiClient.get(`/api/production/scheduling/orders/${workOrderId}`, { params });
  return response.data;
};

export const getProductionResourceLoad = async (params = {}) => {
  const response = await apiClient.get("/api/production/scheduling/resource-load", { params });
  return response.data;
};

export const getProductionRisks = async (params = {}) => {
  const response = await apiClient.get("/api/production/scheduling/risks", { params });
  return response.data;
};

export const getProductionSchedulingResult = async (scheduleId = null) => {
  const url = scheduleId
    ? `/api/production/scheduling/results/${scheduleId}`
    : "/api/production/scheduling/results";
  const response = await apiClient.get(url);
  return response.data;
};

export const getProductionGanttData = async (params = {}) => {
  const response = await apiClient.get("/api/production/scheduling/gantt", { params });
  return response.data;
};

export const getScheduleBoard = async (scheduleId, params = {}) => {
  const response = await apiClient.get(`/api/scheduling/${scheduleId}/board`, { params });
  return response.data;
};

export const getResourceMachines = async () => {
  const response = await apiClient.get("/api/resource-machines");
  return response.data;
};

export const updateWorkCenter = async (id, payload) => {
  const response = await apiClient.put(`/api/work-centers/${id}`, payload);
  return response.data;
};

export const disableWorkCenter = async (id) => {
  const response = await apiClient.patch(`/api/work-centers/${id}/disable`);
  return response.data;
};

export const createMachine = async (payload) => {
  const response = await apiClient.post("/api/resource-machines", payload);
  return response.data;
};

export const updateMachine = async (id, payload) => {
  const response = await apiClient.put(`/api/resource-machines/${id}`, payload);
  return response.data;
};

export const getOperationMappingRules = async () => {
  const response = await apiClient.get("/api/operation-mapping-rules");
  return response.data;
};

export const createOperationMappingRule = async (payload) => {
  const response = await apiClient.post("/api/operation-mapping-rules", payload);
  return response.data;
};

export const updateOperationMappingRule = async (id, payload) => {
  const response = await apiClient.put(`/api/operation-mapping-rules/${id}`, payload);
  return response.data;
};

export const getResourceGroups = async () => {
  const response = await apiClient.get("/api/resource-groups");
  return response.data;
};

export const createResourceGroup = async (payload) => {
  const response = await apiClient.post("/api/resource-groups", payload);
  return response.data;
};

export const updateResourceGroup = async (id, payload) => {
  const response = await apiClient.put(`/api/resource-groups/${id}`, payload);
  return response.data;
};

export const addGroupMember = async (groupId, payload) => {
  const response = await apiClient.post(`/api/resource-groups/${groupId}/members`, payload);
  return response.data;
};

export const removeGroupMember = async (groupId, memberId) => {
  const response = await apiClient.delete(`/api/resource-groups/${groupId}/members/${memberId}`);
  return response.data;
};

export const lockOrder = async (scheduleId, workOrderId, payload = {}) => {
  const response = await apiClient.post(
    `/api/production/scheduling/schedules/${scheduleId}/orders/${workOrderId}/lock`,
    payload,
  );
  return response.data;
};

export const unlockOrder = async (scheduleId, workOrderId) => {
  const response = await apiClient.post(
    `/api/production/scheduling/schedules/${scheduleId}/orders/${workOrderId}/unlock`,
  );
  return response.data;
};

export const exportSchedule = async (scheduleId) => {
  const response = await apiClient.get(
    `/api/production/scheduling/schedules/${scheduleId}/export`,
    { responseType: "blob" },
  );
  return response;
};

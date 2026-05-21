const ACTIVE_SCHEDULE_KEY = "aps_active_schedule_id";

export function getActiveScheduleId() {
  return localStorage.getItem(ACTIVE_SCHEDULE_KEY) || "";
}

export function setActiveScheduleId(scheduleId) {
  if (scheduleId === null || scheduleId === undefined || scheduleId === "") {
    localStorage.removeItem(ACTIVE_SCHEDULE_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_SCHEDULE_KEY, String(scheduleId));
}

export function buildSchedulePath(path, scheduleId = getActiveScheduleId()) {
  if (!scheduleId) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}schedule_id=${encodeURIComponent(String(scheduleId))}`;
}

export function buildScheduleBoardPath(scheduleId = getActiveScheduleId()) {
  return scheduleId ? `/scheduling/board/${encodeURIComponent(String(scheduleId))}` : "/scheduling/board";
}

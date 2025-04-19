// Utility to generate unique IDs for tasks
export function generateTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

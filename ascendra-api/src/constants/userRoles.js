export const USER_ROLES = ["user", "moderator", "admin", "owner"];

export const hasAdminAccess = (role) => role === "admin" || role === "owner";

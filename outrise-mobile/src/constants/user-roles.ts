export type UserRole = "user" | "moderator" | "admin" | "owner";

export function hasAdminAccess(role?: string | null) {
  return role === "admin" || role === "owner";
}

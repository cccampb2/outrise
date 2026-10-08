import type { UserRole } from "@/constants/user-roles";
import { apiRequest } from "./client";
import type { AccountStatus } from "./users";

export const accountStatuses = [
  "active",
  "flagged",
  "suspended",
  "banned",
] as const;
export type AdminUser = {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  ageEligibilityRejectedAt?: string | null;
  moderationReason?: string;
  moderatedAt?: string;
  createdAt: string;
};
export type AccountModeration = {
  _id: string;
  admin: { _id: string; username: string } | null;
  previousStatus: AccountStatus;
  status: AccountStatus;
  reason: string;
  suspendedUntil: string | null;
  ageEligibilityRejectedAt?: string | null;
  createdAt: string;
};
export type AccountStatusInput = {
  status: AccountStatus;
  reason: string;
  suspensionDays?: number;
};

export type UserRoleChange = {
  _id: string;
  owner: { _id: string; username: string } | null;
  previousRole: UserRole;
  role: "user" | "admin";
  reason: string;
  createdAt: string;
};

export type UserRoleInput = {
  role: "user" | "admin";
  expectedRole: UserRole;
  reason: string;
};

export async function getAdminUsers(
  page = 1,
  search = "",
  status = "all",
): Promise<{
  users: AdminUser[];
  pagination: { page: number; totalPages: number; total: number };
}> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    status,
  });
  if (search) params.set("search", search);
  const response = await apiRequest(`/admin/users?${params}`);
  return response.json();
}

export async function getAdminUser(userId: string): Promise<{
  user: AdminUser;
  history: AccountModeration[];
  roleHistory: UserRoleChange[];
}> {
  const response = await apiRequest(`/admin/users/${userId}`);
  return response.json();
}

export async function setUserAccountStatus(
  userId: string,
  data: AccountStatusInput,
): Promise<{ user: AdminUser }> {
  const response = await apiRequest(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function setUserRole(
  userId: string,
  data: UserRoleInput,
): Promise<{ user: AdminUser }> {
  const response = await apiRequest(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function clearAgeRejection(
  userId: string,
  reason: string,
): Promise<{ user: AdminUser }> {
  const response = await apiRequest(
    `/admin/users/${userId}/age-eligibility/reset`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
  return response.json();
}

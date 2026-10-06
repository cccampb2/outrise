import { apiRequest } from "./client";
export type BlockRelationship = { blocked: boolean; blockedByMe: boolean };
export type BlockedUser = {
  id: string | null;
  username: string;
  profileImage: { url: string | null } | null;
  blockedAt: string;
};
export async function getBlockRelationship(
  userId: string,
): Promise<BlockRelationship> {
  const response = await apiRequest(`/users/${userId}/block`);
  return response.json();
}
export async function setUserBlocked(
  userId: string,
  blocked: boolean,
): Promise<void> {
  await apiRequest(`/users/${userId}/block`, {
    method: blocked ? "PUT" : "DELETE",
  });
}
export async function getBlockedUsers(page = 1): Promise<{
  users: BlockedUser[];
  pagination: { page: number; limit: number; hasMore: boolean };
}> {
  const response = await apiRequest(
    `/users/me/blocked-users?page=${page}&limit=25`,
  );
  return response.json();
}

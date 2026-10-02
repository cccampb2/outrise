import { apiRequest } from "./client";
import type { PublicUserFaction, UserSearchProgression } from "./users";

export type FriendUser = {
  id: string;
  username: string;
  faction: PublicUserFaction | null;
  lifetimeXP: number;
  progression: UserSearchProgression;
  profileImage: { url: string | null; publicId: string | null };
};

export type FriendListItem = { user: FriendUser; acceptedAt: string };
export type FriendRequestItem = { requestId: string; user: FriendUser; createdAt: string };
export type FriendListSection = "friends" | "incoming" | "outgoing";

export async function getFriendList(section: FriendListSection, page = 1, limit = 25): Promise<{
  items: (FriendListItem | FriendRequestItem)[];
  pagination: { page: number; limit: number; totalPages: number; totalUsers?: number; totalRequests?: number };
}> {
  const path = section === "friends" ? "/friends" : `/friends/requests/${section}`;
  const response = await apiRequest(`${path}?page=${page}&limit=${limit}`);
  const data = await response.json();
  return { items: section === "friends" ? data.friends : data.requests, pagination: data.pagination };
}

export type FriendshipRelationship = {
  status: "none" | "incoming" | "outgoing" | "friends";
  requestId: string | null;
};

export async function sendFriendRequest(userId: string): Promise<void> {
  await apiRequest(`/friends/requests/${userId}`, { method: "POST" });
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await apiRequest(`/friends/requests/${requestId}/accept`, { method: "PATCH" });
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await apiRequest(`/friends/requests/${requestId}/decline`, { method: "DELETE" });
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await apiRequest(`/friends/requests/${requestId}/cancel`, { method: "DELETE" });
}

export async function removeFriend(userId: string): Promise<void> {
  await apiRequest(`/friends/${userId}`, { method: "DELETE" });
}

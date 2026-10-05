import { apiRequest } from "./client";
import type { ActivityEvent } from "./activity";

type NotificationEvent =
  | Extract<
      ActivityEvent,
      {
        type:
          | "friend_request_received"
          | "friend_request_accepted"
          | "verification_approved"
          | "verification_rejected"
          | "wotw_launched";
      }
    >
  | (Omit<
      Extract<
        ActivityEvent,
        { type: "faction_first_place" | "faction_season_won" }
      >,
      "type"
    > & { type: "faction_season_won" });
type MessageNotification = {
  _id: string;
  type: "message_received";
  actor: string;
  sourceType: "message";
  sourceId: string;
  occurredAt: string;
  details: { actorUsername: string; conversationId: string };
};
export type Notification = (NotificationEvent | MessageNotification) & {
  read: boolean;
};

export async function getNotifications(
  page = 1,
  unreadOnly = false,
): Promise<{
  notifications: Notification[];
  unreadCount: number;
  pagination: { page: number; total: number; totalPages: number };
}> {
  const response = await apiRequest(
    `/notifications?page=${page}&limit=20&unreadOnly=${unreadOnly}`,
  );
  return response.json();
}

export async function getUnreadNotificationCount(): Promise<{
  unreadCount: number;
}> {
  const response = await apiRequest("/notifications/unread-count");
  return response.json();
}

export async function updateNotifications(
  action: "read" | "dismiss",
  id?: string,
) {
  await apiRequest(`/notifications/${action}`, {
    method: "POST",
    body: JSON.stringify(id ? { eventIds: [id] } : { all: true }),
  });
}

import { apiRequest } from "./client";

export type SystemMessage = {
  _id: string;
  title: string;
  text: string;
  createdAt: string;
  eventId: string | null;
  read: boolean;
};

type SystemMessagesPage = {
  messages: SystemMessage[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AnnouncementInput = {
  title: string;
  text: string;
  idempotencyKey: string;
};

export async function getSystemMessages(page = 1): Promise<SystemMessagesPage> {
  const response = await apiRequest(`/system-messages?page=${page}&limit=20`);
  return response.json();
}

export async function getSystemMessage(
  messageId: string,
): Promise<{ systemMessage: SystemMessage }> {
  const response = await apiRequest(`/system-messages/${messageId}`);
  return response.json();
}

export async function getSystemMessageSummary(): Promise<{
  latest: SystemMessage | null;
  unreadCount: number;
}> {
  const response = await apiRequest("/system-messages/summary");
  return response.json();
}

export async function getUnreadSystemMessageCount(): Promise<{
  unreadCount: number;
}> {
  const response = await apiRequest("/system-messages/unread-count");
  return response.json();
}

export async function markSystemMessagesRead(
  eventIds: string[],
): Promise<void> {
  await apiRequest("/system-messages/read", {
    method: "POST",
    body: JSON.stringify({ eventIds }),
  });
}

export async function publishSystemMessage(
  input: AnnouncementInput,
): Promise<{ systemMessage: SystemMessage; created: boolean }> {
  const response = await apiRequest("/owner/system-messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function getOwnerSystemMessages(
  page = 1,
): Promise<SystemMessagesPage> {
  const response = await apiRequest(
    `/owner/system-messages?page=${page}&limit=20`,
  );
  return response.json();
}

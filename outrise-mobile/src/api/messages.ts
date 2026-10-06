import { apiRequest } from "./client";

export type ChatUser = {
  _id: string;
  username: string;
  profileImage?: {
    url: string | null;
    publicId: string | null;
  };
};

export type Conversation = {
  _id: string;
  userLow: ChatUser | null;
  userHigh: ChatUser | null;
  unreadCount: number;
  blocked: boolean;
  closedAt: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  _id: string;
  conversation: string;
  sender: string | null;
  removedAt: string | null;
  text: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ConversationsResponse = {
  conversations: Conversation[];
  pagination: Pagination;
};

export type MessagesResponse = {
  conversationClosed: boolean;
  blocked: boolean;
  blockedByMe: boolean;
  otherUserId: string | null;
  messages: Message[];
  pagination: Pagination;
};

export async function getConversations(
  page = 1,
): Promise<ConversationsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
  });

  const response = await apiRequest(`/conversations?${params}`);

  return response.json();
}

export async function getConversationMessages(
  conversationId: string,
  page = 1,
): Promise<MessagesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "30",
  });

  const response = await apiRequest(
    `/conversations/${conversationId}/messages?${params}`,
  );

  return response.json();
}

export async function sendMessage(
  conversationId: string,
  data: {
    text: string;
    idempotencyKey: string;
  },
): Promise<{ message: Message }> {
  const response = await apiRequest(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.json();
}

export type ConversationIdentity = {
  _id: string;
  userLow: string;
  userHigh: string;
  lastMessageAt: string | null;
};

export async function getOrCreateConversation(
  userId: string,
): Promise<{ conversation: ConversationIdentity }> {
  const response = await apiRequest(`/conversations/with/${userId}`, {
    method: "POST",
  });
  return response.json();
}

export async function getUnreadMessageCount(): Promise<{
  unreadCount: number;
}> {
  const response = await apiRequest("/conversations/unread-count");
  return response.json();
}

export async function markConversationRead(
  conversationId: string,
  throughMessageId: string,
): Promise<void> {
  await apiRequest(`/conversations/${conversationId}/read`, {
    method: "POST",
    body: JSON.stringify({ throughMessageId }),
  });
}

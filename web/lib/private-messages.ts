import { apiFetchJson } from "@/lib/auth";

export type PrivateMessageUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export type PrivateMessageUserSearchItem = {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
};

export type PrivateConversationParticipant = {
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user: PrivateMessageUser;
};

export type PrivateMessage = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  senderId: string;
  sender: PrivateMessageUser;
};

export type PrivateConversationListItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: PrivateConversationParticipant[];
  otherParticipants: PrivateMessageUser[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: PrivateMessageUser;
  } | null;
  unreadCount: number;
};

export type PrivateConversationDetail = {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: PrivateConversationParticipant[];
  messages: PrivateMessage[];
  hasMoreBefore?: boolean;
  nextBefore?: string | null;
};

export async function searchPrivateMessageUsers(
  q: string,
): Promise<PrivateMessageUserSearchItem[]> {
  const params = new URLSearchParams({ q });
  return apiFetchJson(`/private-messages/users/search?${params.toString()}`);
}

export async function listPrivateConversations(): Promise<
  PrivateConversationListItem[]
> {
  return apiFetchJson("/private-messages/conversations");
}

export async function createPrivateConversation(
  participantIds: string[],
): Promise<PrivateConversationDetail> {
  return apiFetchJson("/private-messages/conversations", {
    method: "POST",
    body: JSON.stringify({ participantIds }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getPrivateConversation(
  conversationId: string,
  options?: {
    limit?: number;
    before?: string | null;
  },
): Promise<PrivateConversationDetail> {
  const params = new URLSearchParams();

  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  if (options?.before) {
    params.set("before", options.before);
  }

  const query = params.toString();

  return apiFetchJson(
    `/private-messages/conversations/${conversationId}${query ? `?${query}` : ""}`,
  );
}

export async function listPrivateMessages(
  conversationId: string,
): Promise<PrivateMessage[]> {
  return apiFetchJson(`/private-messages/conversations/${conversationId}/messages`);
}

export async function sendPrivateMessage(
  conversationId: string,
  content: string,
): Promise<PrivateMessage> {
  return apiFetchJson(`/private-messages/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function markPrivateConversationAsRead(
  conversationId: string,
): Promise<{ ok: true }> {
  return apiFetchJson(`/private-messages/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export async function getUnreadPrivateConversationsCount(): Promise<{
  count: number;
}> {
  return apiFetchJson("/private-messages/unread-conversations-count");
}

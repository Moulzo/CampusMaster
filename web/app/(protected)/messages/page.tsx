"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth";
import {
  createPrivateConversation,
  getPrivateConversation,
  listPrivateConversations,
  markPrivateConversationAsRead,
  searchPrivateMessageUsers,
  sendPrivateMessage,
  type PrivateConversationDetail,
  type PrivateConversationListItem,
  type PrivateMessageUserSearchItem,
} from "@/lib/private-messages";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function getSocketUrl() {
  return API_URL.replace(/\/api$/, "");
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function conversationTitle(
  conversation: PrivateConversationListItem | PrivateConversationDetail,
  currentUserId?: string,
) {
  const others = conversation.participants
    .filter((p) => p.userId !== currentUserId)
    .map((p) => p.user.fullName || p.user.email);

  if (others.length === 0) return "Conversation";
  return others.join(", ");
}

type IncomingPrivateMessagePayload = {
  conversationId: string;
  message: PrivateConversationDetail["messages"][number];
};

function upsertPrivateMessage(
  conversation: PrivateConversationDetail,
  message: PrivateConversationDetail["messages"][number],
): PrivateConversationDetail {
  const exists = conversation.messages.some((m) => m.id === message.id);

  if (exists) {
    return conversation;
  }

  return {
    ...conversation,
    messages: [...conversation.messages, message],
  };
}

function updateConversationPreview(
  conversations: PrivateConversationListItem[],
  payload: IncomingPrivateMessagePayload,
  currentUserId?: string,
  selectedConversationId?: string,
): PrivateConversationListItem[] {
  const nextConversations = conversations.map((conversation) => {
    if (conversation.id !== payload.conversationId) {
      return conversation;
    }

    const isCurrentConversation = conversation.id === selectedConversationId;
    const isMessageFromMe = payload.message.senderId === currentUserId;

    return {
      ...conversation,
      updatedAt: payload.message.createdAt,
      lastMessage: {
        id: payload.message.id,
        content: payload.message.content,
        createdAt: payload.message.createdAt,
        sender: payload.message.sender,
      },
      unreadCount:
        isCurrentConversation || isMessageFromMe
          ? 0
          : conversation.unreadCount + 1,
    };
  });

  return nextConversations.sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function socketStatusLabel(status: "connecting" | "connected" | "disconnected") {
  switch (status) {
    case "connected":
      return "Temps réel actif";
    case "connecting":
      return "Connexion temps réel...";
    case "disconnected":
      return "Temps réel déconnecté";
  }
}

function socketStatusClass(status: "connecting" | "connected" | "disconnected") {
  switch (status) {
    case "connected":
      return "bg-green-100 text-green-700 border-green-200";
    case "connecting":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "disconnected":
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export default function MessagesPage() {
  const { user } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const selectedConversationIdRef = useRef("");
  const currentUserIdRef = useRef<string | undefined>(undefined);
  const joinedConversationIdsRef = useRef<Set<string>>(new Set());

  const [conversations, setConversations] = useState<PrivateConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<PrivateConversationDetail | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PrivateMessageUserSearchItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<PrivateMessageUserSearchItem | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [isConversationPanelOpen, setIsConversationPanelOpen] = useState(false);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  function joinConversationRooms(conversationsToJoin: PrivateConversationListItem[]) {
    const socket = socketRef.current;

    if (!socket) return;

    conversationsToJoin.forEach((conversation) => {
      if (joinedConversationIdsRef.current.has(conversation.id)) {
        return;
      }

      socket.emit("private-messages:join", {
        conversationId: conversation.id,
      });

      joinedConversationIdsRef.current.add(conversation.id);
    });
  }

  async function refreshConversations(preferredConversationId?: string) {
    setLoadingList(true);
    setError("");

    try {
      const data = await listPrivateConversations();

      joinConversationRooms(data);
      setConversations(data);

      const nextSelectedId =
        preferredConversationId || selectedConversationId || data[0]?.id || "";

      setSelectedConversationId(nextSelectedId);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des conversations.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadConversation(conversationId: string) {
    if (!conversationId) {
      setSelectedConversation(null);
      return;
    }

    setLoadingConversation(true);
    setError("");

    try {
      const detail = await getPrivateConversation(conversationId);
      setSelectedConversation(detail);
      await markPrivateConversationAsRead(conversationId);
      await refreshConversations(conversationId);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement de la conversation.");
    } finally {
      setLoadingConversation(false);
    }
  }

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadConversation(selectedConversationId);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket"],
    });

    setSocketStatus("connecting");

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("connected");
      joinedConversationIdsRef.current.clear();

      setConversations((current) => {
        joinConversationRooms(current);
        return current;
      });
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.io.on("reconnect_attempt", () => {
      setSocketStatus("connecting");
    });

    socket.io.on("reconnect", () => {
      setSocketStatus("connected");
    });

    socket.io.on("reconnect_error", () => {
      setSocketStatus("disconnected");
    });

    socket.on(
      "private-messages:new-message",
      (payload: IncomingPrivateMessagePayload) => {
        const currentSelectedConversationId = selectedConversationIdRef.current;

        setSelectedConversation((current) => {
          if (!current || current.id !== payload.conversationId) {
            return current;
          }

          return upsertPrivateMessage(current, payload.message);
        });

        setConversations((current) =>
          updateConversationPreview(
            current,
            payload,
            currentUserIdRef.current,
            currentSelectedConversationId,
          ),
        );

        if (payload.conversationId === currentSelectedConversationId) {
          void markPrivateConversationAsRead(payload.conversationId);

          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === payload.conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
          );
        }
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus("disconnected");
    };
  }, []);

  const selectedConversationMeta = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  async function handleUserSearch(value: string) {
    setSearchTerm(value);
    setSelectedUser(null);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingUsers(true);
      const results = await searchPrivateMessageUsers(trimmed);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  }

  function handleSelectUser(user: PrivateMessageUserSearchItem) {
    setSelectedUser(user);
    setSearchTerm(`${user.fullName} (${user.email})`);
    setSearchResults([]);
  }

  async function handleSendMessage() {
    if (!selectedConversationId || sending) return;

    const content = newMessage.trim();
    if (!content) return;

    setSending(true);
    try {
      await sendPrivateMessage(selectedConversationId, content);
      setNewMessage("");
      await refreshConversations(selectedConversationId);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateConversation() {
    if (!selectedUser || creatingConversation) return;

    setCreatingConversation(true);
    setError("");

    try {
      const conversation = await createPrivateConversation([selectedUser.id]);
      setSelectedUser(null);
      setSearchTerm("");
      setSearchResults([]);
      await refreshConversations(conversation.id);
      await loadConversation(conversation.id);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création de la conversation.");
    } finally {
      setCreatingConversation(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messagerie</h1>
          <p className="mt-1 text-sm text-slate-500">
            Conversations privées internes entre utilisateurs de CampusMaster.
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${socketStatusClass(
            socketStatus,
          )}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              socketStatus === "connected"
                ? "bg-green-500"
                : socketStatus === "connecting"
                  ? "bg-orange-500"
                  : "bg-gray-400"
            }`}
          />
          {socketStatusLabel(socketStatus)}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className={`${
            isConversationPanelOpen ? "hidden lg:block" : "block"
          } rounded-xl border border-slate-200 bg-white shadow-sm`}
        >
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900">Conversations</h2>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => void handleUserSearch(e.target.value)}
                placeholder="Rechercher un utilisateur par nom ou email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              {isSearchingUsers && (
                <p className="text-sm text-gray-500">Recherche en cours...</p>
              )}

              {!isSearchingUsers && searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-900">{user.fullName}</span>
                      <span className="text-sm text-gray-500">{user.email}</span>
                      <span className="text-xs text-gray-400">{user.role}</span>
                    </button>
                  ))}
                </div>
              )}

              {!isSearchingUsers && searchTerm.trim().length >= 2 && searchResults.length === 0 && !selectedUser && (
                <p className="text-sm text-gray-500">Aucun utilisateur trouvé.</p>
              )}

              {selectedUser && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                  Conversation avec <span className="font-medium">{selectedUser.fullName}</span> ({selectedUser.email})
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleCreateConversation()}
                disabled={!selectedUser || creatingConversation}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingConversation ? 'Création...' : 'Démarrer'}
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-2">
            {loadingList ? (
              <div className="p-4 text-sm text-slate-500">Chargement...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                Aucune conversation pour le moment.
              </div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conversation) => {
                  const active = conversation.id === selectedConversationId;
                  const title = conversationTitle(conversation, user?.id);

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConversationId(conversation.id);
                          setIsConversationPanelOpen(true);
                        }}
                        className={[
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          active
                            ? "border-blue-200 bg-blue-50"
                            : "border-transparent hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-slate-900">
                              {title}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {conversation.lastMessage?.content ?? "Aucun message"}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-400">
                              {conversation.lastMessage
                                ? formatDateTime(conversation.lastMessage.createdAt)
                                : formatDateTime(conversation.createdAt)}
                            </div>
                          </div>

                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex min-w-[24px] justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={`${
            isConversationPanelOpen ? "block" : "hidden lg:block"
          } rounded-xl border border-slate-200 bg-white shadow-sm`}
        >
          {!selectedConversationId ? (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center text-sm text-slate-500">
              Sélectionne une conversation pour afficher les messages.
            </div>
          ) : loadingConversation ? (
            <div className="flex h-[70vh] items-center justify-center px-6 text-sm text-slate-500">
              Chargement de la conversation...
            </div>
          ) : !selectedConversation ? (
            <div className="flex h-[70vh] items-center justify-center px-6 text-sm text-slate-500">
              Conversation introuvable.
            </div>
          ) : (
            <div className="flex h-[70vh] flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setIsConversationPanelOpen(false)}
                  className="mb-3 inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
                >
                  ← Retour aux conversations
                </button>
                <h2 className="text-base font-semibold text-slate-900">
                  {conversationTitle(selectedConversation, user?.id)}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedConversation.participants.length} participant
                  {selectedConversation.participants.length > 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {selectedConversation.messages.length === 0 ? (
                  <div className="text-sm text-slate-500">Aucun message pour le moment.</div>
                ) : (
                  selectedConversation.messages.map((message) => {
                    const isMine = message.senderId === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={[
                            "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                            isMine
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-900",
                          ].join(" ")}
                        >
                          <div
                            className={`mb-1 text-xs ${
                              isMine ? "text-blue-100" : "text-slate-500"
                            }`}
                          >
                            {message.sender.fullName} • {formatDateTime(message.createdAt)}
                          </div>
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 px-5 py-4">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    placeholder="Écris ton message..."
                    className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {sending ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

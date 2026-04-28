"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

const MESSAGES_PAGE_SIZE = 30;

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

function formatMessageDateSeparator(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) {
    return "Aujourd'hui";
  }

  if (isSameDay(date, yesterday)) {
    return "Hier";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function shouldShowDateSeparator(
  messages: PrivateConversationDetail["messages"],
  index: number,
) {
  if (index === 0) {
    return true;
  }

  const currentDate = new Date(messages[index].createdAt);
  const previousDate = new Date(messages[index - 1].createdAt);

  return (
    currentDate.getFullYear() !== previousDate.getFullYear() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getDate() !== previousDate.getDate()
  );
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

function getInitialConversationIdFromUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("conversationId") ?? "";
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
  shouldTreatAsRead = false,
): PrivateConversationListItem[] {
  const nextConversations = conversations.map((conversation) => {
    if (conversation.id !== payload.conversationId) {
      return conversation;
    }

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
        shouldTreatAsRead || isMessageFromMe
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

function findFirstUnreadMessageId(
  conversation: PrivateConversationDetail,
  currentUserId?: string,
  lastReadAt?: string | null,
) {
  if (!currentUserId) {
    return null;
  }

  if (!lastReadAt) {
    const firstReceivedMessage = conversation.messages.find(
      (message) => message.senderId !== currentUserId,
    );

    return firstReceivedMessage?.id ?? null;
  }

  const lastReadTime = new Date(lastReadAt).getTime();

  return (
    conversation.messages.find((message) => {
      if (message.senderId === currentUserId) {
        return false;
      }

      return new Date(message.createdAt).getTime() > lastReadTime;
    })?.id ?? null
  );
}

export default function MessagesPage() {
  const { user } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const selectedConversationIdRef = useRef("");
  const currentUserIdRef = useRef<string | undefined>(undefined);
  const joinedConversationIdsRef = useRef<Set<string>>(new Set());
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isConversationPanelOpenRef = useRef(false);

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
  const [hasPendingNewMessages, setHasPendingNewMessages] = useState(false);
  const [pendingLastReadAt, setPendingLastReadAt] = useState<string | null>(null);
  const [unreadMarkerLastReadAt, setUnreadMarkerLastReadAt] = useState<string | null>(null);
  const [shouldShowUnreadMarker, setShouldShowUnreadMarker] = useState(false);
  const [isNearMessagesBottom, setIsNearMessagesBottom] = useState(true);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [scrollBehavior, setScrollBehavior] = useState<ScrollBehavior>("auto");
  const [unreadScrollInfo, setUnreadScrollInfo] = useState<{
    lastReadAt: string | null;
    behavior: ScrollBehavior;
  } | null>(null);
  const [hasMoreMessagesBefore, setHasMoreMessagesBefore] = useState(false);
  const [olderMessagesCursor, setOlderMessagesCursor] = useState<string | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const scrollExecutedRef = useRef(false);
  const scrollInfoRef = useRef<{
    shouldScrollToBottom: boolean;
    scrollBehavior: ScrollBehavior;
    unreadScrollInfo: { lastReadAt: string | null; behavior: ScrollBehavior } | null;
  }>({
    shouldScrollToBottom: false,
    scrollBehavior: "auto",
    unreadScrollInfo: null,
  });
  const currentLastReadAtRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    isConversationPanelOpenRef.current = isConversationPanelOpen;
  }, [isConversationPanelOpen]);

  // Mettre à jour le lastReadAt ref pour l'utiliser dans le socket handler
  useEffect(() => {
    if (!selectedConversationId || !conversations.length) {
      currentLastReadAtRef.current = null;
      return;
    }

    const conversationMeta = conversations.find(
      (c) => c.id === selectedConversationId,
    );

    if (!conversationMeta) {
      currentLastReadAtRef.current = null;
      return;
    }

    const participant = conversationMeta.participants.find(
      (p) => p.userId === user?.id,
    );

    currentLastReadAtRef.current = participant?.lastReadAt ?? null;
  }, [selectedConversationId, conversations, user?.id]);

  // Mettre à jour la ref avec les valeurs actuelles des flags de scroll
  useEffect(() => {
    scrollInfoRef.current = {
      shouldScrollToBottom,
      scrollBehavior,
      unreadScrollInfo,
    };
  }, [shouldScrollToBottom, scrollBehavior, unreadScrollInfo]);

  function isNearBottom() {
    const container = messagesContainerRef.current;

    if (!container) {
      return true;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom < 120;
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    });
  }

  function scrollToFirstUnreadOrBottom(
    conversation: PrivateConversationDetail,
    currentUserId?: string,
    lastReadAt?: string | null,
    behavior: ScrollBehavior = "auto",
  ) {
    const firstUnreadMessageId = findFirstUnreadMessageId(
      conversation,
      currentUserId,
      lastReadAt,
    );

    if (firstUnreadMessageId) {
      const element = document.getElementById(
        `private-message-${firstUnreadMessageId}`,
      );

      if (element) {
        element.scrollIntoView({
          behavior,
          block: "center",
        });
        return;
      }
    }

    scrollToBottom(behavior);
  }

  useLayoutEffect(() => {
    if (!selectedConversation) return;

    // Attendre que le DOM soit prêt avec un délai
    const timer = window.setTimeout(() => {
      if (scrollExecutedRef.current) return;

      // Vérifier le state actuel depuis les refs (plus fiable que les dépendances)
      const hasUnread = scrollInfoRef.current.unreadScrollInfo !== null;
      const shouldBottom = scrollInfoRef.current.shouldScrollToBottom;

      if (shouldBottom) {
        scrollToBottom(scrollInfoRef.current.scrollBehavior);
        scrollExecutedRef.current = true;
      } else if (hasUnread && selectedConversation) {
        const unreadInfo = scrollInfoRef.current.unreadScrollInfo;
        if (unreadInfo) {
          scrollToFirstUnreadOrBottom(
            selectedConversation,
            currentUserIdRef.current,
            unreadInfo.lastReadAt,
            unreadInfo.behavior,
          );
          scrollExecutedRef.current = true;
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedConversation?.id]);

  // Reset des states de scroll et pending messages quand conversation change
  // Exécuté APRÈS le useLayoutEffect de scroll
  useEffect(() => {
    setPendingLastReadAt(null);
    setHasPendingNewMessages(false);
    setIsNearMessagesBottom(true);
  }, [selectedConversation?.id]);

  // Tracker si on est près du bottom du container de messages
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;

      setIsNearMessagesBottom(distanceFromBottom < 120);

      if (container.scrollTop < 80) {
        void loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [
    selectedConversationId,
    hasMoreMessagesBefore,
    olderMessagesCursor,
    loadingOlderMessages,
    selectedConversation?.id,
  ]);

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

  async function refreshConversations() {
    setLoadingList(true);
    setError("");

    try {
      const data = await listPrivateConversations();

      joinConversationRooms(data);
      setConversations(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des conversations.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadConversation(conversationId: string) {
    setIsConversationPanelOpen(true);

    if (!conversationId) {
      setSelectedConversation(null);
      setSelectedConversationId("");
      setHasMoreMessagesBefore(false);
      setOlderMessagesCursor(null);
      return;
    }

    setSelectedConversationId(conversationId);
    setLoadingConversation(true);
    setError("");

    try {
      const conversationBeforeRead = conversations.find(
        (conversation) => conversation.id === conversationId,
      );

      const participantBeforeRead = conversationBeforeRead?.participants.find(
        (participant) => participant.userId === currentUserIdRef.current,
      );

      const lastReadAtBeforeRead = participantBeforeRead?.lastReadAt ?? null;
      const hasUnreadBeforeRead = (conversationBeforeRead?.unreadCount ?? 0) > 0;

      const detail = await getPrivateConversation(conversationId, {
        limit: MESSAGES_PAGE_SIZE,
      });

      setSelectedConversation(detail);
      setHasMoreMessagesBefore(Boolean(detail.hasMoreBefore));
      setOlderMessagesCursor(detail.nextBefore ?? null);
      setShouldShowUnreadMarker(hasUnreadBeforeRead);
      setUnreadMarkerLastReadAt(lastReadAtBeforeRead);
      setHasPendingNewMessages(false);

      // Planifier le scroll via les effects au lieu de le faire directement
      // Cela évite une race condition avec les re-renders
      if (hasUnreadBeforeRead && lastReadAtBeforeRead) {
        setUnreadScrollInfo({
          lastReadAt: lastReadAtBeforeRead,
          behavior: "auto",
        });
      } else {
        setShouldScrollToBottom(true);
        setScrollBehavior("auto");
      }

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);

        if (url.searchParams.get("conversationId") === conversationId) {
          url.searchParams.delete("conversationId");
          window.history.replaceState(null, "", url.toString());
        }
      }

      await markPrivateConversationAsRead(conversationId);

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );

      await refreshConversations();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement de la conversation.");
    } finally {
      setLoadingConversation(false);
    }
  }

  useEffect(() => {
    const initialConversationId = getInitialConversationIdFromUrl();

    if (initialConversationId) {
      setIsConversationPanelOpen(true);
      void loadConversation(initialConversationId);
      return;
    }

    void refreshConversations();
  }, []);

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
        const isConversationOpen =
          isConversationPanelOpenRef.current &&
          payload.conversationId === currentSelectedConversationId;

        const shouldAutoScroll =
          isConversationOpen &&
          (payload.message.senderId === currentUserIdRef.current || isNearBottom());

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
            shouldAutoScroll,
          ),
        );

        if (isConversationOpen) {
          if (shouldAutoScroll) {
            void markPrivateConversationAsRead(payload.conversationId);

            setConversations((current) =>
              current.map((conversation) =>
                conversation.id === payload.conversationId
                  ? { ...conversation, unreadCount: 0 }
                  : conversation,
              ),
            );

            window.setTimeout(() => scrollToBottom("smooth"), 0);
            setHasPendingNewMessages(false);
          } else {
            // Stocker le lastReadAt actuel pour le bouton "Nouveaux messages"
            setPendingLastReadAt(currentLastReadAtRef.current);
            setHasPendingNewMessages(true);
          }
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

  async function loadOlderMessages() {
    if (
      !selectedConversation ||
      !selectedConversationId ||
      !hasMoreMessagesBefore ||
      !olderMessagesCursor ||
      loadingOlderMessages
    ) {
      return;
    }

    const container = messagesContainerRef.current;

    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    setLoadingOlderMessages(true);

    try {
      const olderPage = await getPrivateConversation(selectedConversationId, {
        limit: MESSAGES_PAGE_SIZE,
        before: olderMessagesCursor,
      });

      setSelectedConversation((current) => {
        if (!current || current.id !== selectedConversationId) {
          return current;
        }

        const existingIds = new Set(current.messages.map((message) => message.id));
        const olderMessages = olderPage.messages.filter(
          (message) => !existingIds.has(message.id),
        );

        return {
          ...current,
          messages: [...olderMessages, ...current.messages],
        };
      });

      setHasMoreMessagesBefore(Boolean(olderPage.hasMoreBefore));
      setOlderMessagesCursor(olderPage.nextBefore ?? null);

      window.requestAnimationFrame(() => {
        const nextScrollHeight = container?.scrollHeight ?? 0;
        if (container) {
          container.scrollTop =
            nextScrollHeight - previousScrollHeight + previousScrollTop;
        }
      });
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des anciens messages.");
    } finally {
      setLoadingOlderMessages(false);
    }
  }

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
      await refreshConversations();
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
      await refreshConversations();
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
                  const hasUnread = conversation.unreadCount > 0;

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => {
                          void loadConversation(conversation.id);
                        }}
                        className={[
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          active
                            ? "border-blue-200 bg-blue-50"
                            : hasUnread
                              ? "border-blue-200 bg-blue-50/60 hover:bg-blue-50"
                              : "border-transparent hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div
                              className={[
                                "truncate text-sm",
                                hasUnread ? "font-bold text-slate-950" : "font-medium text-slate-900",
                              ].join(" ")}
                            >
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

                          {hasUnread && (
                            <span className="inline-flex min-w-[24px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
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
                  onClick={() => {
                    setIsConversationPanelOpen(false);
                  }}
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

              <div
                ref={messagesContainerRef}
                className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
                data-scroll-container="messages"
              >
                {hasMoreMessagesBefore && (
                  <div className="flex justify-center pb-2">
                    <button
                      type="button"
                      onClick={() => void loadOlderMessages()}
                      disabled={loadingOlderMessages}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      {loadingOlderMessages ? "Chargement..." : "Charger les anciens messages"}
                    </button>
                  </div>
                )}
                {selectedConversation.messages.length === 0 ? (
                  <div className="text-sm text-slate-500">Aucun message pour le moment.</div>
                ) : (
                  <>
                    {selectedConversation.messages.map((message, index) => {
                      const isMine = message.senderId === user?.id;
                      const showDateSeparator = shouldShowDateSeparator(
                        selectedConversation.messages,
                        index,
                      );

                      const markerTime = shouldShowUnreadMarker
                        ? unreadMarkerLastReadAt
                          ? new Date(unreadMarkerLastReadAt).getTime()
                          : 0
                        : null;

                      const messageTime = new Date(message.createdAt).getTime();

                      const previousMessage = selectedConversation.messages[index - 1];
                      const previousMessageTime = previousMessage
                        ? new Date(previousMessage.createdAt).getTime()
                        : null;

                      const isFirstUnreadMessage =
                        !isMine &&
                        markerTime !== null &&
                        messageTime > markerTime &&
                        (previousMessageTime === null || previousMessageTime <= markerTime);

                      return (
                        <div key={message.id}>
                          {showDateSeparator && (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                {formatMessageDateSeparator(message.createdAt)}
                              </span>
                            </div>
                          )}

                          {isFirstUnreadMessage && (
                            <div className="my-4 flex items-center gap-3">
                              <div className="h-px flex-1 bg-blue-300" />
                              <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                Messages non lus
                              </span>
                              <div className="h-px flex-1 bg-blue-300" />
                            </div>
                          )}

                          <div
                            id={`private-message-${message.id}`}
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
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} data-scroll-end="messages" />
              </div>

              {hasPendingNewMessages && (
                <div className="flex justify-center border-t border-gray-100 bg-white px-4 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedConversation) {
                        scrollToBottom("smooth");

                        void markPrivateConversationAsRead(selectedConversation.id);

                        setConversations((current) =>
                          current.map((conversation) =>
                            conversation.id === selectedConversation.id
                              ? { ...conversation, unreadCount: 0 }
                              : conversation,
                          ),
                        );
                      }

                      setHasPendingNewMessages(false);
                      setPendingLastReadAt(null);
                    }}
                    className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Nouveaux messages
                  </button>
                </div>
              )}

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

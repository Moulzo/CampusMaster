"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createPrivateConversation,
  getPrivateConversation,
  listPrivateConversations,
  markPrivateConversationAsRead,
  sendPrivateMessage,
  type PrivateConversationDetail,
  type PrivateConversationListItem,
} from "@/lib/private-messages";

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

export default function MessagesPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<PrivateConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<PrivateConversationDetail | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [newParticipantId, setNewParticipantId] = useState("");
  const [error, setError] = useState("");

  async function refreshConversations(preferredConversationId?: string) {
    setLoadingList(true);
    setError("");

    try {
      const data = await listPrivateConversations();
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

  const selectedConversationMeta = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  async function handleSendMessage() {
    if (!selectedConversationId || sending) return;

    const content = newMessage.trim();
    if (!content) return;

    setSending(true);
    try {
      await sendPrivateMessage(selectedConversationId, content);
      setNewMessage("");
      await loadConversation(selectedConversationId);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateConversation() {
    const participantId = newParticipantId.trim();
    if (!participantId || creatingConversation) return;

    setCreatingConversation(true);
    setError("");

    try {
      const conversation = await createPrivateConversation([participantId]);
      setNewParticipantId("");
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messagerie</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conversations privées internes entre utilisateurs de CampusMaster.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
            <p className="mt-1 text-xs text-slate-500">
              Saisis pour l’instant un ID utilisateur pour démarrer une conversation.
            </p>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                value={newParticipantId}
                onChange={(e) => setNewParticipantId(e.target.value)}
                placeholder="ID utilisateur"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleCreateConversation}
                disabled={creatingConversation}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingConversation ? "Création..." : "Nouvelle conversation"}
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
                        onClick={() => setSelectedConversationId(conversation.id)}
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

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
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

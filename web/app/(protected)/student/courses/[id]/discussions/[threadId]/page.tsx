"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { listThreadMessages, createThreadMessage, Message } from "@/lib/discussions";

export default function ThreadMessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string; threadId: string }>();
  
  const courseId = params.id;
  const threadId = params.threadId;

  const base = pathname.startsWith("/teacher") ? "/teacher" : "/student";

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);
        const data = await listThreadMessages(threadId);
        setMessages(data);
        setError("");
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement");
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [threadId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msg = await createThreadMessage(threadId, newMessage.trim());
      const newMessages = [...messages, msg];
      setMessages(newMessages);
      setNewMessage("");
    } catch (e: any) {
      setError(e?.message ?? "Erreur envoi");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Erreur</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push(`${base}/courses/${courseId}?tab=discussions`)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Retour aux discussions
        </button>
        <h2 className="text-xl font-bold text-gray-900">Messages de la discussion</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun message pour le moment.
            </div>
          ) : (
            messages.map((message) => {
              const authorName = message.author?.fullName ?? "Utilisateur";
              const authorRole = message.author?.role ?? "";
              
              return (
              <div key={message.id} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                  {authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{authorName}</span>
                    <span className="text-sm text-gray-500">{authorRole}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(message.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Écrivez votre message..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { listThreadMessages, createThreadMessage, Message } from "@/lib/discussions";
import { websocketService } from "@/lib/websocket";

export default function ThreadMessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string; threadId: string }>();
  
  const courseId = params.id;
  const threadId = params.threadId;

  const base = pathname.startsWith("/teacher") ? "/teacher" : "/student";

  // Helper pour dédupliquer les messages
  function upsertMessage(prev: Message[], msg: Message) {
    if (prev.some(m => m.id === msg.id)) return prev;
    return [...prev, msg];
  }

  // Refs pour le scroll conditionnel
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  function isNearBottom(el: HTMLDivElement, threshold = 40) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!threadId) return;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listThreadMessages(threadId);
        setMessages(data);
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [threadId]);

  // Suivre la position de scroll de l'utilisateur
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      shouldStickToBottomRef.current = isNearBottom(el);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll);

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Scroll initial au chargement
  useLayoutEffect(() => {
    scrollToBottom();
  }, []);

  // Scroll automatique si l'utilisateur était déjà en bas
  useLayoutEffect(() => {
    if (!messages.length) return;
    if (!shouldStickToBottomRef.current) return;
    scrollToBottom();
  }, [messages]);

  // WebSocket : join + listen
  useEffect(() => {
    console.log('[discussion] Page mounted, threadId:', threadId);
    
    if (!threadId) return;

    const socket = websocketService.getSocket();
    console.log('[discussion] Socket from service:', socket ? 'found' : 'null', 'connected:', socket?.connected);
    
    if (!socket) return;

    const joinRoom = () => {
      console.log('[discussion] joinRoom() called, threadId:', threadId, 'socket.connected:', socket.connected);
      socket.emit('discussions:join', { threadId }, (ack?: any) => {
        console.log('[discussion] join ACK received:', ack);
      });
    };

    const onConnect = () => {
      console.log('[discussion] socket.connect event fired, joining room');
      joinRoom();
    };

    const onNewMessage = (msg: Message) => {
      console.log('[discussion] discussions:new-message received:', msg);
      if (msg.threadId !== threadId) {
        console.log('[discussion] Ignoring message for different thread:', msg.threadId, 'current:', threadId);
        return;
      }
      
      // Mémoriser si l'utilisateur était en bas avant l'ajout
      const el = scrollContainerRef.current;
      if (el) {
        shouldStickToBottomRef.current = isNearBottom(el);
      }
      
      console.log('[discussion] Adding message to state');
      setMessages((prev) => upsertMessage(prev, msg));
    };

    socket.on('connect', onConnect);
    socket.on('discussions:new-message', onNewMessage);

    if (socket.connected) {
      console.log('[discussion] Socket already connected, joining room immediately');
      joinRoom();
    } else {
      console.log('[discussion] Socket not yet connected, waiting for connect event');
    }

    return () => {
      console.log('[discussion] Cleanup - leaving room and removing listeners');
      socket.emit('discussions:leave', { threadId });
      socket.off('connect', onConnect);
      socket.off('discussions:new-message', onNewMessage);
    };
  }, [threadId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msg = await createThreadMessage(threadId, newMessage.trim());
      
      // Mémoriser si l'utilisateur était en bas avant l'ajout
      const el = scrollContainerRef.current;
      if (el) {
        shouldStickToBottomRef.current = isNearBottom(el);
      }
      
      setMessages(prev => upsertMessage(prev, msg));
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
        <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto p-4 space-y-4">
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
                    <span className="text-xs text-gray-500">({authorRole})</span>
                    <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-700 bg-gray-50 rounded-lg p-3">
                    {message.content}
                  </div>
                </div>
              </div>
              );
            })
          )}
          <div ref={bottomRef} />
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

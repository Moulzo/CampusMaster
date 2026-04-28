"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function getSocketUrl() {
  return API_URL.replace(/\/api$/, "");
}

type PrivateMessageToastPayload = {
  conversationId: string;
  message: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
      email: string;
      role: "ADMIN" | "TEACHER" | "STUDENT";
    };
  };
};

type PrivateMessageToast = PrivateMessageToastPayload & {
  toastId: string;
  remainingMs: number;
  isPaused: boolean;
};

const TOAST_DURATION_MS = 6000;
const TICK_MS = 100;

function truncateMessage(content: string, maxLength = 110) {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, maxLength).trim()}...`;
}

export function PrivateMessageToasts() {
  const router = useRouter();
  const pathname = usePathname();
  const socketRef = useRef<Socket | null>(null);
  const [toasts, setToasts] = useState<PrivateMessageToast[]>([]);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("private-messages:incoming", (payload: PrivateMessageToastPayload) => {
      console.log("PRIVATE MESSAGE TOAST RECEIVED", payload);

      window.dispatchEvent(
        new CustomEvent("private-messages:incoming-local", {
          detail: payload,
        }),
      );

      // Sur /messages, le fil et les badges sont déjà gérés directement.
      if (pathname === "/messages") {
        return;
      }

      setToasts((current) => {
        const alreadyExists = current.some(
          (toast) => toast.message.id === payload.message.id,
        );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          {
            ...payload,
            toastId: `${payload.conversationId}-${payload.message.id}`,
            remainingMs: TOAST_DURATION_MS,
            isPaused: false,
          },
        ].slice(-4);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [pathname]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setToasts((current) =>
        current
          .map((toast) => {
            if (toast.isPaused) {
              return toast;
            }

            return {
              ...toast,
              remainingMs: toast.remainingMs - TICK_MS,
            };
          })
          .filter((toast) => toast.remainingMs > 0),
      );
    }, TICK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [toasts.length]);

  function dismissToast(toastId: string) {
    setToasts((current) => current.filter((toast) => toast.toastId !== toastId));
  }

  function setToastPaused(toastId: string, isPaused: boolean) {
    setToasts((current) =>
      current.map((toast) =>
        toast.toastId === toastId ? { ...toast, isPaused } : toast,
      ),
    );
  }

  function openConversation(conversationId: string, toastId: string) {
    dismissToast(toastId);
    router.push(`/messages?conversationId=${conversationId}`);
  }

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const progress = Math.max(
          0,
          Math.min(100, (toast.remainingMs / TOAST_DURATION_MS) * 100),
        );

        return (
          <div
            key={toast.toastId}
            onMouseEnter={() => setToastPaused(toast.toastId, true)}
            onMouseLeave={() => setToastPaused(toast.toastId, false)}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
          >
            <button
              type="button"
              onClick={() => openConversation(toast.conversationId, toast.toastId)}
              className="block w-full px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Nouveau message de {toast.message.sender.fullName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {truncateMessage(toast.message.content)}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  Message
                </span>
              </div>
            </button>

            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.toastId)}
              className="sr-only"
              aria-label="Fermer la notification de message"
            >
              Fermer
            </button>
          </div>
        );
      })}
    </div>
  );
}

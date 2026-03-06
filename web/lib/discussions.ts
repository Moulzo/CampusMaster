import { apiFetchJson } from "@/lib/auth";

export type Thread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; fullName: string; role: string };
  _count: { messages: number };
  canDelete?: boolean;
};

export type Message = {
  id: string;
  threadId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string; role: string };
};

export async function listCourseThreads(courseId: string) {
  return apiFetchJson<Thread[]>(`/courses/${courseId}/discussions`);
}

export async function createCourseThread(courseId: string, title: string): Promise<Thread> {
  return apiFetchJson(`/courses/${courseId}/discussions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function listThreadMessages(threadId: string) {
  return apiFetchJson<Message[]>(`/discussions/${threadId}/messages`);
}

export async function createThreadMessage(threadId: string, content: string): Promise<Message> {
  return apiFetchJson(`/discussions/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function deleteThread(threadId: string): Promise<{ ok: boolean }> {
  return apiFetchJson(`/discussions/${threadId}`, { method: "DELETE" });
}

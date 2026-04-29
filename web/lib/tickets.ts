import { apiFetchJson } from "@/lib/auth";

export type TicketType =
  | "TECHNICAL_SUPPORT"
  | "COURSE_CREATION"
  | "RESOURCE_REQUEST"
  | "OTHER";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  requesterId: string;
  requester?: {
    id: string;
    fullName: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateTicketDto = {
  title: string;
  description: string;
  type: TicketType;
};

export const ticketTypeLabels: Record<TicketType, string> = {
  TECHNICAL_SUPPORT: "Support technique",
  COURSE_CREATION: "Demande de création de matière",
  RESOURCE_REQUEST: "Demande de ressource / support",
  OTHER: "Autre demande",
};

export const ticketStatusLabels: Record<TicketStatus, string> = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
  REJECTED: "Rejetée",
};

export function getTicketStatusClass(status: TicketStatus) {
  switch (status) {
    case "OPEN":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "RESOLVED":
      return "bg-green-50 text-green-700 border-green-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";
  }
}

export async function createTicket(data: CreateTicketDto): Promise<Ticket> {
  return apiFetchJson<Ticket>("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getMyTickets(): Promise<Ticket[]> {
  return apiFetchJson<Ticket[]>("/tickets/my");
}

export async function getAdminTickets(filters?: {
  status?: TicketStatus | "";
}): Promise<Ticket[]> {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return apiFetchJson<Ticket[]>(
    `/admin/tickets${query ? `?${query}` : ""}`,
  );
}

export async function updateAdminTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<Ticket> {
  return apiFetchJson<Ticket>(`/admin/tickets/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

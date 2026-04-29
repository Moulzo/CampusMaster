"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getAdminTicket,
  getTicketStatusClass,
  ticketStatusLabels,
  ticketTypeLabels,
  updateAdminTicketStatus,
  type Ticket,
  type TicketStatus,
} from "@/lib/tickets";

function formatDate(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function loadTicket() {
    if (!ticketId) return;

    setLoading(true);
    setError("");

    try {
      const data = await getAdminTicket(ticketId);
      setTicket(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement de la demande.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTicket();
  }, [ticketId]);

  async function handleStatusChange(status: TicketStatus) {
    if (!ticket) return;

    setUpdating(true);
    setError("");

    try {
      const updated = await updateAdminTicketStatus(ticket.id, status);
      setTicket(updated);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la mise à jour du statut.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/admin/tickets"
          className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline"
        >
          ← Retour aux demandes
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Détail de la demande
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulte et traite la demande utilisateur.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Chargement de la demande...
        </div>
      ) : !ticket ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Demande introuvable.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTicketStatusClass(
                  ticket.status,
                )}`}
              >
                {ticketStatusLabels[ticket.status]}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {ticketTypeLabels[ticket.type]}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {ticket.title}
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              Créée le {formatDate(ticket.createdAt)} • mise à jour le{" "}
              {formatDate(ticket.updatedAt)}
            </p>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Description
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {ticket.description}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Demandeur</h3>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Nom
                  </p>
                  <p className="font-medium text-slate-900">
                    {ticket.requester?.fullName ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Email
                  </p>
                  <p className="text-slate-700">
                    {ticket.requester?.email ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Rôle
                  </p>
                  <p className="text-slate-700">
                    {ticket.requester?.role ?? "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Traitement
              </h3>

              <label
                htmlFor="ticket-status"
                className="mt-4 block text-sm font-medium text-slate-700"
              >
                Statut
              </label>

              <select
                id="ticket-status"
                value={ticket.status}
                disabled={updating}
                onChange={(e) =>
                  void handleStatusChange(e.target.value as TicketStatus)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                {(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"] as TicketStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {ticketStatusLabels[status]}
                    </option>
                  ),
                )}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Le changement de statut est immédiatement enregistré.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

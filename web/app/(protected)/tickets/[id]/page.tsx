"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getMyTicket,
  getTicketStatusClass,
  ticketStatusLabels,
  ticketTypeLabels,
  type Ticket,
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

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTicket() {
    if (!ticketId) return;

    setLoading(true);
    setError("");

    try {
      const data = await getMyTicket(ticketId);
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

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/tickets"
          className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline"
        >
          ← Retour à mes demandes
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Détail de la demande
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Suis l'état de ta demande et consulte les informations envoyées.
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
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
                Description envoyée
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {ticket.description}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Suivi
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Statut actuel
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getTicketStatusClass(
                      ticket.status,
                    )}`}
                  >
                    {ticketStatusLabels[ticket.status]}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Type
                  </p>
                  <p className="text-slate-700">
                    {ticketTypeLabels[ticket.type]}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Dernière mise à jour
                  </p>
                  <p className="text-slate-700">
                    {formatDate(ticket.updatedAt)}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

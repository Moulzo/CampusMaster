"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createTicket,
  getMyTickets,
  getTicketStatusClass,
  ticketStatusLabels,
  ticketTypeLabels,
  type Ticket,
  type TicketType,
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

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("TECHNICAL_SUPPORT");

  const availableTicketTypes = useMemo(() => {
    const entries = Object.entries(ticketTypeLabels) as Array<
      [TicketType, string]
    >;
    if (user?.role === "STUDENT") {
      return entries.filter(([type]) => type !== "COURSE_CREATION");
    }
    return entries;
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === "STUDENT" && type === "COURSE_CREATION") {
      setType("TECHNICAL_SUPPORT");
    }
  }, [user?.role, type]);

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const data = await getMyTickets();
      setTickets(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError("Le titre et la description sont obligatoires.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const created = await createTicket({
        title: title.trim(),
        description: description.trim(),
        type,
      });

      setTickets((current) => [created, ...current]);
      setTitle("");
      setDescription("");
      setType("TECHNICAL_SUPPORT");
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création de la demande.");
    } finally {
      setCreating(false);
    }
  }

  const openCount = useMemo(() => {
    return tickets.filter((ticket) =>
      ["OPEN", "IN_PROGRESS"].includes(ticket.status),
    ).length;
  }, [tickets]);

  const resolvedCount = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === "RESOLVED").length;
  }, [tickets]);

  const rejectedCount = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === "REJECTED").length;
  }, [tickets]);

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Mes demandes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Crée et suis tes demandes de support, de ressource ou de création de matière.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Nouvelle demande</h2>
          <p className="mt-1 text-sm text-slate-500">
            Décris clairement ton besoin pour faciliter le traitement.
          </p>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Type de demande
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {availableTicketTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Titre
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder="Ex: Problème avec un support de cours"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={3000}
                rows={6}
                placeholder="Explique le problème ou la demande..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Création..." : "Créer la demande"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">Historique</h2>
            <p className="mt-1 text-sm text-slate-500">
              {openCount} demande{openCount > 1 ? "s" : ""} ouverte
              {openCount > 1 ? "s" : ""} ou en cours.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-5 sm:grid-cols-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase text-blue-600">
                Ouvertes / en cours
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{openCount}</p>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-semibold uppercase text-green-600">
                Résolues
              </p>
              <p className="mt-1 text-2xl font-bold text-green-700">{resolvedCount}</p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase text-red-600">
                Rejetées
              </p>
              <p className="mt-1 text-2xl font-bold text-red-700">{rejectedCount}</p>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Chargement...</div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Aucune demande pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {ticket.title}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTicketStatusClass(
                            ticket.status,
                          )}`}
                        >
                          {ticketStatusLabels[ticket.status]}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {ticketTypeLabels[ticket.type]} • créée le{" "}
                        {formatDate(ticket.createdAt)}
                      </p>

                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                        {ticket.description}
                      </p>

                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="mt-3 inline-flex text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Voir le détail
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

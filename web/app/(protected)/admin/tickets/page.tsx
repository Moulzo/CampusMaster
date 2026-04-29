"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAdminTickets,
  getTicketStatusClass,
  ticketStatusLabels,
  ticketTypeLabels,
  updateAdminTicketStatus,
  type Ticket,
  type TicketStatus,
} from "@/lib/tickets";

const statusOptions: Array<{ value: "" | TicketStatus; label: string }> = [
  { value: "", label: "Tous les statuts" },
  { value: "OPEN", label: "Ouvertes" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "RESOLVED", label: "Résolues" },
  { value: "REJECTED", label: "Rejetées" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | TicketStatus>("");
  const [loading, setLoading] = useState(true);
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminTickets({ status: statusFilter });
      setTickets(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [statusFilter]);

  async function handleStatusChange(id: string, status: TicketStatus) {
    setUpdatingById((current) => ({ ...current, [id]: true }));
    setError("");

    try {
      const updated = await updateAdminTicketStatus(id, status);

      setTickets((current) =>
        current.map((ticket) => (ticket.id === id ? updated : ticket)),
      );
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la mise à jour du statut.");
    } finally {
      setUpdatingById((current) => ({ ...current, [id]: false }));
    }
  }

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<TicketStatus, number>,
    );
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return tickets;
    }

    return tickets.filter((ticket) => {
      const typeLabel = ticketTypeLabels[ticket.type]?.toLowerCase() ?? "";

      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        typeLabel.includes(query) ||
        ticket.requester?.fullName?.toLowerCase().includes(query) ||
        ticket.requester?.email?.toLowerCase().includes(query)
      );
    });
  }, [tickets, searchQuery]);

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Demandes utilisateurs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte et traite les demandes de support, ressources ou création de matière.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Liste des demandes</h2>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery.trim()
                ? `${filteredTickets.length} résultat${
                    filteredTickets.length > 1 ? "s" : ""
                  } sur ${tickets.length} demande${tickets.length > 1 ? "s" : ""}`
                : `${tickets.length} demande${tickets.length > 1 ? "s" : ""} affichée${
                    tickets.length > 1 ? "s" : ""
                  }`}
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | TicketStatus)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {statusOptions.map((status) => (
                <option key={status.value || "ALL"} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"] as TicketStatus[]).map(
            (status) => (
              <span
                key={status}
                className={`rounded-full border px-2.5 py-1 font-semibold ${getTicketStatusClass(
                  status,
                )}`}
              >
                {ticketStatusLabels[status]} : {counts[status] ?? 0}
              </span>
            ),
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <label
              htmlFor="admin-ticket-search"
              className="text-sm font-medium text-slate-700"
            >
              Rechercher une demande
            </label>
            <p className="text-xs text-slate-500">
              Recherche par titre, description, demandeur, email ou type.
            </p>
          </div>

          <div className="flex w-full gap-2 sm:max-w-md">
            <input
              id="admin-ticket-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: support, matière, email..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Chargement...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {searchQuery.trim()
              ? "Aucune demande ne correspond à cette recherche."
              : "Aucune demande pour ce filtre."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Demande</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Demandeur</th>
                  <th className="px-4 py-3 font-semibold">Créée le</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{ticket.title}</p>
                      <p className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-slate-500">
                        {ticket.description}
                      </p>
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Voir le détail
                      </Link>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {ticketTypeLabels[ticket.type]}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <p className="font-medium text-slate-800">
                        {ticket.requester?.fullName ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ticket.requester?.email ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {ticket.requester?.role ?? "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatDate(ticket.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getTicketStatusClass(
                            ticket.status,
                          )}`}
                        >
                          {ticketStatusLabels[ticket.status]}
                        </span>

                        <select
                          value={ticket.status}
                          disabled={Boolean(updatingById[ticket.id])}
                          onChange={(e) =>
                            void handleStatusChange(
                              ticket.id,
                              e.target.value as TicketStatus,
                            )
                          }
                          className="block rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                        >
                          {(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"] as TicketStatus[]).map(
                            (status) => (
                              <option key={status} value={status}>
                                {ticketStatusLabels[status]}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

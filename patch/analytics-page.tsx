"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { RequireRole } from "@/lib/require-role";
import {
  getAdminAnalyticsGradesEvolution,
  type SemesterGradesEvolution,
} from "@/lib/admin-analytics";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAvg(v: number | null) {
  return v === null ? "—" : v.toFixed(2);
}

function formatPercent(v: number | null) {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

function getGradeColor(v: number | null) {
  if (v === null) return "#94a3b8";
  if (v >= 14) return "#22c55e";
  if (v >= 10) return "#f59e0b";
  return "#ef4444";
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl text-sm">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name} :</span>
          <span className="text-white font-bold">
            {entry.name.includes("%") || entry.name.toLowerCase().includes("taux")
              ? `${entry.value}%`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-3xl font-black" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Module Badge ────────────────────────────────────────────────────────────

function ModuleBadge({ module }: { module: SemesterGradesEvolution["moduleBreakdown"][0] }) {
  const color = getGradeColor(module.averageGrade);
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-200">{module.moduleName}</span>
        <span className="text-lg font-black" style={{ color }}>
          {formatAvg(module.averageGrade)}
        </span>
      </div>
      <div className="flex gap-3 text-xs text-slate-400">
        <span>📝 {module.gradedCount} notés</span>
        {module.uncorrectedCount > 0 && (
          <span className="text-amber-400">⏳ {module.uncorrectedCount} en attente</span>
        )}
        {module.lateCount > 0 && (
          <span className="text-red-400">⚠️ {module.lateCount} en retard</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<SemesterGradesEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await getAdminAnalyticsGradesEvolution();
        if (cancelled) return;
        setData(result);
        if (result.length > 0) setSelectedSemester(result[0].semesterId);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Données pour le graphe principal (évolution par semestre)
  const lineChartData = useMemo(
    () =>
      data.map((s) => ({
        name: s.semesterName,
        "Moyenne /20": s.averageGrade,
        "Taux de remise (%)": s.submissionRate,
      })),
    [data],
  );

  // Semestre sélectionné
  const activeSemester = useMemo(
    () => data.find((s) => s.semesterId === selectedSemester) ?? null,
    [data, selectedSemester],
  );

  // Données pour le BarChart des modules du semestre sélectionné
  const moduleChartData = useMemo(
    () =>
      activeSemester?.moduleBreakdown.map((m) => ({
        name: m.moduleName,
        "Moyenne /20": m.averageGrade,
        "Non corrigés": m.uncorrectedCount,
        "Retards": m.lateCount,
      })) ?? [],
    [activeSemester],
  );

  // KPI globaux agrégés sur tous les semestres
  const globalKpis = useMemo(() => {
    if (!data.length) return null;
    const withGrade = data.filter((s) => s.averageGrade !== null);
    const avgAll =
      withGrade.length > 0
        ? Number(
            (withGrade.reduce((sum, s) => sum + (s.averageGrade ?? 0), 0) / withGrade.length).toFixed(2),
          )
        : null;
    const totalLate = data.reduce((sum, s) => sum + s.totalLate, 0);
    const totalUncorrected = data.reduce((sum, s) => sum + s.totalUncorrected, 0);
    const totalDelivered = data.reduce((sum, s) => sum + s.totalDelivered, 0);
    const totalExpected = data.reduce((sum, s) => sum + s.totalExpected, 0);
    const globalRate =
      totalExpected > 0
        ? Number(((totalDelivered / totalExpected) * 100).toFixed(1))
        : null;
    return { avgAll, totalLate, totalUncorrected, globalRate };
  }, [data]);

  return (
    <RequireRole role="ADMIN">
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-slate-400 hover:text-slate-200 transition text-sm flex items-center gap-1"
              >
                ← Retour
              </Link>
              <div className="w-px h-5 bg-slate-700" />
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">
                  Analytics — Évolution des notes
                </h1>
                <p className="text-xs text-slate-500">Vue détaillée par semestre et module</p>
              </div>
            </div>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-semibold">
              {data.length} semestre{data.length > 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Chargement des analytics...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-700 rounded-2xl p-6 text-red-300">
              {error}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <span className="text-5xl">📊</span>
              <p className="text-slate-400">Aucune donnée disponible.</p>
              <p className="text-slate-600 text-sm">Créez des semestres et des devoirs notés pour voir les analytics.</p>
            </div>
          ) : (
            <>
              {/* ── KPI globaux ── */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">
                  Vue globale — tous semestres
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="Moyenne générale"
                    value={formatAvg(globalKpis?.avgAll ?? null)}
                    sub="Normalisée sur 20"
                    accent="#818cf8"
                  />
                  <KpiCard
                    label="Taux de remise global"
                    value={formatPercent(globalKpis?.globalRate ?? null)}
                    sub="Rendus / Attendus"
                    accent="#34d399"
                  />
                  <KpiCard
                    label="Devoirs en attente"
                    value={String(globalKpis?.totalUncorrected ?? 0)}
                    sub="Non encore corrigés"
                    accent="#fbbf24"
                  />
                  <KpiCard
                    label="Retards détectés"
                    value={String(globalKpis?.totalLate ?? 0)}
                    sub="Soumis après deadline"
                    accent="#f87171"
                  />
                </div>
              </section>

              {/* ── Graphe évolution par semestre ── */}
              {data.length >= 1 && (
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-sm font-bold text-slate-200 mb-1">
                    Évolution des moyennes par semestre
                  </h2>
                  <p className="text-xs text-slate-500 mb-6">
                    Moyenne globale (sur 20) et taux de remise (%) pour chaque semestre
                  </p>
                  {data.length === 1 ? (
                    // Un seul semestre : BarChart au lieu de LineChart
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis yAxisId="grade" domain={[0, 20]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                        <Bar yAxisId="grade" dataKey="Moyenne /20" fill="#818cf8" radius={[6, 6, 0, 0]} />
                        <Bar yAxisId="rate" dataKey="Taux de remise (%)" fill="#34d399" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis yAxisId="grade" domain={[0, 20]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                        <ReferenceLine yAxisId="grade" y={10} stroke="#64748b" strokeDasharray="4 4" label={{ value: "Seuil 10", fill: "#64748b", fontSize: 11 }} />
                        <Line
                          yAxisId="grade"
                          type="monotone"
                          dataKey="Moyenne /20"
                          stroke="#818cf8"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#818cf8", strokeWidth: 2, stroke: "#1e1b4b" }}
                          activeDot={{ r: 7 }}
                        />
                        <Line
                          yAxisId="rate"
                          type="monotone"
                          dataKey="Taux de remise (%)"
                          stroke="#34d399"
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={{ r: 4, fill: "#34d399", strokeWidth: 2, stroke: "#022c22" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </section>
              )}

              {/* ── Détail par semestre ── */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">
                  Détail par semestre
                </h2>

                {/* Tabs semestres */}
                <div className="flex gap-2 flex-wrap mb-6">
                  {data.map((s) => (
                    <button
                      key={s.semesterId}
                      onClick={() => setSelectedSemester(s.semesterId)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                        selectedSemester === s.semesterId
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                      }`}
                    >
                      {s.semesterName}
                    </button>
                  ))}
                </div>

                {activeSemester && (
                  <div className="space-y-6">
                    {/* KPI du semestre sélectionné */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KpiCard
                        label="Moyenne semestre"
                        value={formatAvg(activeSemester.averageGrade)}
                        sub="Sur 20"
                        accent={getGradeColor(activeSemester.averageGrade)}
                      />
                      <KpiCard
                        label="Taux de remise"
                        value={formatPercent(activeSemester.submissionRate)}
                        sub={`${activeSemester.totalDelivered} / ${activeSemester.totalExpected}`}
                        accent="#34d399"
                      />
                      <KpiCard
                        label="Non corrigés"
                        value={String(activeSemester.totalUncorrected)}
                        sub="Devoirs sans note"
                        accent="#fbbf24"
                      />
                      <KpiCard
                        label="Retards"
                        value={String(activeSemester.totalLate)}
                        sub="Soumis après deadline"
                        accent="#f87171"
                      />
                    </div>

                    {/* BarChart des modules */}
                    {moduleChartData.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-slate-200 mb-1">
                          Performance par module — {activeSemester.semesterName}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6">
                          Moyenne, devoirs non corrigés et retards par module pédagogique
                        </p>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={moduleChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis yAxisId="grade" domain={[0, 20]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis yAxisId="count" orientation="right" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                            <ReferenceLine yAxisId="grade" y={10} stroke="#64748b" strokeDasharray="4 4" />
                            <Bar yAxisId="grade" dataKey="Moyenne /20" fill="#818cf8" radius={[6, 6, 0, 0]} />
                            <Bar yAxisId="count" dataKey="Non corrigés" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                            <Bar yAxisId="count" dataKey="Retards" fill="#f87171" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Breakdown modules en cards */}
                    {activeSemester.moduleBreakdown.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">
                          Modules — {activeSemester.semesterName}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {activeSemester.moduleBreakdown.map((m) => (
                            <ModuleBadge key={m.moduleId} module={m} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </RequireRole>
  );
}

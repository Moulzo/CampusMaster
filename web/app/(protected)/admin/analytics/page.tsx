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

function getGradeColor(v: number | null): string {
  if (v === null) return "#94a3b8";
  if (v >= 14) return "#16a34a";
  if (v >= 10) return "#d97706";
  return "#dc2626";
}

function getGradeBg(v: number | null): string {
  if (v === null) return "bg-slate-100 text-slate-500";
  if (v >= 14) return "bg-green-100 text-green-700";
  if (v >= 10) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="text-slate-700 font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name} :</span>
          <span className="text-slate-900 font-bold">{entry.value ?? "—"}</span>
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
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "red" | "purple" | "slate";
}) {
  const tones = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-700",   icon: "bg-blue-100" },
    green:  { bg: "bg-green-50",  text: "text-green-700",  icon: "bg-green-100" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-700",  icon: "bg-amber-100" },
    red:    { bg: "bg-red-50",    text: "text-red-700",    icon: "bg-red-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "bg-purple-100" },
    slate:  { bg: "bg-slate-50",  text: "text-slate-700",  icon: "bg-slate-100" },
  };
  const t = tones[tone];

  return (
    <div className="bg-white rounded-lg shadow-md p-5 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <div className={`w-9 h-9 ${t.icon} rounded-lg flex items-center justify-center text-base`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${t.text}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Module Card ─────────────────────────────────────────────────────────────

function ModuleCard({ module }: { module: SemesterGradesEvolution["moduleBreakdown"][0] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800">{module.moduleName}</span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getGradeBg(module.averageGrade)}`}>
          {formatAvg(module.averageGrade)} /20
        </span>
      </div>
      <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          {module.gradedCount} notés
        </span>
        {module.uncorrectedCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {module.uncorrectedCount} en attente
          </span>
        )}
        {module.lateCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {module.lateCount} en retard
          </span>
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
        if (result.length > 0) setSelectedSemester(result[result.length - 1].semesterId);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const lineChartData = useMemo(
    () =>
      data.map((s) => ({
        name: s.semesterName,
        "Moyenne /20": s.averageGrade,
        "Taux de remise (%)": s.submissionRate,
      })),
    [data],
  );

  const activeSemester = useMemo(
    () => data.find((s) => s.semesterId === selectedSemester) ?? null,
    [data, selectedSemester],
  );

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header — même style que admin/page.tsx */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-slate-500 hover:text-slate-800 transition text-sm flex items-center gap-1"
              >
                ← Retour
              </Link>
              <div className="w-px h-5 bg-slate-200" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics — Évolution des notes</h1>
                <p className="text-sm text-slate-500 mt-0.5">Vue détaillée par semestre et module</p>
              </div>
            </div>
            <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-semibold">
              {data.length} semestre{data.length > 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 border border-slate-200 flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <p className="text-slate-500 text-sm">Chargement des analytics...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
          ) : data.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 border border-slate-200 flex flex-col items-center gap-3">
              <span className="text-5xl">📊</span>
              <p className="text-slate-600 font-medium">Aucune donnée disponible.</p>
              <p className="text-slate-400 text-sm">Créez des semestres et des devoirs notés pour voir les analytics.</p>
            </div>
          ) : (
            <>
              {/* ── KPI globaux ── */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                  Vue globale — tous semestres
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="Moyenne générale" value={formatAvg(globalKpis?.avgAll ?? null)} sub="Normalisée sur 20" icon="📈" tone="purple" />
                  <KpiCard label="Taux de remise global" value={formatPercent(globalKpis?.globalRate ?? null)} sub="Rendus / Attendus" icon="✅" tone="green" />
                  <KpiCard label="Devoirs en attente" value={String(globalKpis?.totalUncorrected ?? 0)} sub="Non encore corrigés" icon="⏳" tone="amber" />
                  <KpiCard label="Retards détectés" value={String(globalKpis?.totalLate ?? 0)} sub="Soumis après deadline" icon="⚠️" tone="red" />
                </div>
              </section>

              {/* ── Graphe évolution par semestre ── */}
              <section className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Évolution des moyennes par semestre
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  Moyenne globale (sur 20) et taux de remise (%) pour chaque semestre
                </p>
                {data.length === 1 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis yAxisId="grade" domain={[0, 20]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
                      <Bar yAxisId="grade" dataKey="Moyenne /20" fill="#9333ea" radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="rate" dataKey="Taux de remise (%)" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis yAxisId="grade" domain={[0, 20]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
                      <ReferenceLine
                        yAxisId="grade"
                        y={10}
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                        label={{ value: "Seuil 10", fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Line
                        yAxisId="grade"
                        type="monotone"
                        dataKey="Moyenne /20"
                        stroke="#9333ea"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#9333ea", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        yAxisId="rate"
                        type="monotone"
                        dataKey="Taux de remise (%)"
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </section>

              {/* ── Détail par semestre ── */}
              <section>
                <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                  Détail par semestre
                </h2>

                {/* Tabs */}
                <div className="flex gap-2 flex-wrap mb-6">
                  {data.map((s) => (
                    <button
                      key={s.semesterId}
                      onClick={() => setSelectedSemester(s.semesterId)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                        selectedSemester === s.semesterId
                          ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {s.semesterName}
                    </button>
                  ))}
                </div>

                {activeSemester && (
                  <div className="space-y-6">
                    {/* KPI du semestre */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KpiCard
                        label="Moyenne semestre"
                        value={formatAvg(activeSemester.averageGrade)}
                        sub="Sur 20"
                        icon="🎯"
                        tone={
                          activeSemester.averageGrade === null ? "slate"
                          : activeSemester.averageGrade >= 14 ? "green"
                          : activeSemester.averageGrade >= 10 ? "amber"
                          : "red"
                        }
                      />
                      <KpiCard
                        label="Taux de remise"
                        value={formatPercent(activeSemester.submissionRate)}
                        sub={`${activeSemester.totalDelivered} / ${activeSemester.totalExpected}`}
                        icon="📬"
                        tone="blue"
                      />
                      <KpiCard
                        label="Non corrigés"
                        value={String(activeSemester.totalUncorrected)}
                        sub="Devoirs sans note"
                        icon="⏳"
                        tone="amber"
                      />
                      <KpiCard
                        label="Retards"
                        value={String(activeSemester.totalLate)}
                        sub="Soumis après deadline"
                        icon="⚠️"
                        tone="red"
                      />
                    </div>

                    {/* BarChart des modules */}
                    {moduleChartData.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                          Performance par module — {activeSemester.semesterName}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                          Moyenne, devoirs non corrigés et retards par module pédagogique
                        </p>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={moduleChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis yAxisId="grade" domain={[0, 20]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis yAxisId="count" orientation="right" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />
                            <ReferenceLine yAxisId="grade" y={10} stroke="#e2e8f0" strokeDasharray="4 4" />
                            <Bar yAxisId="grade" dataKey="Moyenne /20" fill="#9333ea" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="count" dataKey="Non corrigés" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="count" dataKey="Retards" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Cards modules */}
                    {activeSemester.moduleBreakdown.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                          Modules — {activeSemester.semesterName}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {activeSemester.moduleBreakdown.map((m) => (
                            <ModuleCard key={m.moduleId} module={m} />
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
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { RequireRole } from "@/lib/require-role";
import {
  getAdminAnalyticsOverview,
  getAdminAnalyticsGradesEvolution,
  getAdminAnalyticsWeeklyDownloads,
  getAdminAnalyticsConfigurableKpis,
  type AdminAnalyticsOverview,
  type SemesterGradesEvolution,
  type WeeklyDownloadsPoint,
  type AdminConfigurableKpis,
} from "@/lib/admin-analytics";
import { getSemesters, getLearningModules, type Semester, type LearningModule } from "@/lib/admin-academics";
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

function formatAvg(v: number | null) {
  return v === null ? "—" : v.toFixed(2);
}

function formatPercent(v: number | null) {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[220px] rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-slate-600">{entry.name}</span>
            </div>
            <span className="font-bold text-slate-900">{entry.value ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "bg-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-700", icon: "bg-green-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "bg-amber-100" },
    red: { bg: "bg-red-50", text: "text-red-700", icon: "bg-red-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "bg-purple-100" },
    slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "bg-slate-100" },
  };
  const t = tones[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${t.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${t.text}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionToggle({
  title,
  subtitle,
  expanded,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <span>{expanded ? "Masquer" : "Afficher"}</span>
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>⌄</span>
      </button>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "amber" | "red" | "blue" | "slate";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${tones[tone]}`}
    >
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<SemesterGradesEvolution[]>([]);
  const [weeklyDownloads, setWeeklyDownloads] = useState<WeeklyDownloadsPoint[]>([]);
  const [configurableKpis, setConfigurableKpis] = useState<AdminConfigurableKpis | null>(null);
  const [overviewData, setOverviewData] = useState<AdminAnalyticsOverview | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);

  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [error, setError] = useState("");

  const [weeklyRange, setWeeklyRange] = useState<"4" | "8" | "12" | "all">("8");
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);
  const [semesterTrendExpanded, setSemesterTrendExpanded] = useState(true);
  const [semesterTrendView, setSemesterTrendView] = useState<"combined" | "grades" | "submissionRate">("combined");

  const [weeklySemesterId, setWeeklySemesterId] = useState("");
  const [weeklyModuleId, setWeeklyModuleId] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const [overview, gradesEvolution, weekly, configurable, semestersData, modulesData] =
          await Promise.all([
            getAdminAnalyticsOverview(),
            getAdminAnalyticsGradesEvolution(),
            getAdminAnalyticsWeeklyDownloads(),
            getAdminAnalyticsConfigurableKpis(),
            getSemesters(),
            getLearningModules(),
          ]);

        if (cancelled) return;

        setData(gradesEvolution);
        setWeeklyDownloads(weekly);
        setConfigurableKpis(configurable);
        setOverviewData(overview);
        setSemesters(semestersData);
        setModules(modulesData);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setWeeklyLoading(true);
        const weekly = await getAdminAnalyticsWeeklyDownloads({
          semesterId: weeklySemesterId || undefined,
          moduleId: weeklyModuleId || undefined,
        });
        if (!cancelled) setWeeklyDownloads(weekly);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur de chargement des téléchargements hebdomadaires.");
      } finally {
        if (!cancelled) setWeeklyLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [weeklySemesterId, weeklyModuleId]);

  const filteredModulesForWeekly = useMemo(() => {
    if (!weeklySemesterId) return modules;
    return modules.filter((m) => m.semesterId === weeklySemesterId);
  }, [modules, weeklySemesterId]);

  const lineChartData = useMemo(
    () =>
      data.map((s) => ({
        name: s.semesterName,
        "Moyenne /20": s.averageGrade,
        "Taux de remise (%)": s.submissionRate,
      })),
    [data],
  );

  const filteredWeeklyDownloads = useMemo(() => {
    if (weeklyRange === "all") return weeklyDownloads;
    const weeksToShow = parseInt(weeklyRange, 10);
    return weeklyDownloads.slice(-weeksToShow);
  }, [weeklyDownloads, weeklyRange]);

  const globalKpis = useMemo(() => {
    return {
      avgAll: overviewData?.kpis?.globalAverage ?? null,
      totalLate: configurableKpis?.counts?.lateUniqueCount ?? 0,
      totalUncorrected: configurableKpis?.counts?.pendingCorrectionCount ?? 0,
      globalRate: overviewData?.kpis?.submissionRate ?? null,
    };
  }, [overviewData, configurableKpis]);

  return (
    <RequireRole role="ADMIN">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-800"
              >
                ← Retour
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Tableau de bord analytique
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Vue d’ensemble de l’activité pédagogique, des rendus et des résultats
                </p>
              </div>
            </div>
            <span className="rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              {data.length} semestre{data.length > 1 ? "s" : ""}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white p-12 shadow-md">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" />
              <p className="text-sm text-slate-500">Chargement des analytics...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
              {error}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-12 shadow-md">
              <span className="text-5xl">📊</span>
              <p className="font-medium text-slate-600">Aucune donnée disponible.</p>
              <p className="text-sm text-slate-400">
                Créez des semestres et des devoirs notés pour voir les analytics.
              </p>
            </div>
          ) : (
            <>
              <section>
                <div className="mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Résumé global
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Vue d&apos;ensemble de la performance pédagogique sur l&apos;ensemble des semestres.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <KpiCard
                      label="Moyenne générale"
                      value={formatAvg(globalKpis?.avgAll ?? null)}
                      sub="Normalisée sur 20"
                      icon="📈"
                      tone="purple"
                    />
                    <KpiCard
                      label="Taux global de rendu"
                      value={formatPercent(globalKpis?.globalRate ?? null)}
                      sub="Devoirs rendus / devoirs attendus"
                      icon="📚"
                      tone="blue"
                    />
                    <KpiCard
                      label="Réussite"
                      value={formatPercent(configurableKpis?.kpis.successRate ?? null)}
                      sub="Part des copies corrigées avec une note ≥ 10/20"
                      icon="🏆"
                      tone="green"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <StatChip
                      label="Corrections en attente"
                      value={String(globalKpis?.totalUncorrected ?? 0)}
                      tone="amber"
                    />
                    <StatChip
                      label="Rendus en retard"
                      value={String(globalKpis?.totalLate ?? 0)}
                      tone="red"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md">
                <SectionToggle
                  title="Évolution par semestre"
                  subtitle="Suivi de la moyenne académique et du taux de rendu selon la vue choisie."
                  expanded={semesterTrendExpanded}
                  onToggle={() => setSemesterTrendExpanded((prev) => !prev)}
                />

                {semesterTrendExpanded && (
                  <>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <p className="text-sm text-slate-600">
                        {semesterTrendView === "combined" &&
                          "Comparaison entre la moyenne académique et le taux de rendu pour chaque semestre."}
                        {semesterTrendView === "grades" &&
                          "Évolution de la moyenne académique sur 20 par semestre."}
                        {semesterTrendView === "submissionRate" &&
                          "Évolution du taux de rendu des devoirs par semestre."}
                      </p>

                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button
                          onClick={() => setSemesterTrendView("combined")}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            semesterTrendView === "combined"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Vue combinée
                        </button>
                        <button
                          onClick={() => setSemesterTrendView("grades")}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            semesterTrendView === "grades"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Moyennes
                        </button>
                        <button
                          onClick={() => setSemesterTrendView("submissionRate")}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            semesterTrendView === "submissionRate"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Remises
                        </button>
                      </div>
                    </div>

                    {data.length === 1 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={lineChartData} margin={{ top: 18, right: 44, left: 44, bottom: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            interval={0}
                            minTickGap={0}
                            tickMargin={10}
                            height={40}
                            tick={{ fill: "#64748b", fontSize: 13 }}
                            axisLine={{ stroke: "#94a3b8" }}
                            tickLine={{ stroke: "#94a3b8" }}
                          />
                          <YAxis
                            yAxisId="grade"
                            domain={[0, 20]}
                            width={42}
                            tick={{ fill: "#64748b", fontSize: 13 }}
                            axisLine={{ stroke: "#94a3b8" }}
                            tickLine={{ stroke: "#94a3b8" }}
                            hide={semesterTrendView === "submissionRate"}
                          />
                          <YAxis
                            yAxisId="rate"
                            orientation={semesterTrendView === "submissionRate" ? "left" : "right"}
                            domain={[0, 105]}
                            width={42}
                            tick={{ fill: "#64748b", fontSize: 13 }}
                            axisLine={{ stroke: "#94a3b8" }}
                            tickLine={{ stroke: "#94a3b8" }}
                            hide={semesterTrendView === "grades"}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ color: "#475569", fontSize: 13 }} />

                          {(semesterTrendView === "combined" || semesterTrendView === "grades") && (
                            <Bar yAxisId="grade" dataKey="Moyenne /20" fill="#9333ea" radius={[6, 6, 0, 0]} />
                          )}

                          {(semesterTrendView === "combined" || semesterTrendView === "submissionRate") && (
                            <Bar yAxisId="rate" dataKey="Taux de remise (%)" fill="#22c55e" radius={[6, 6, 0, 0]} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={lineChartData} margin={{ top: 18, right: 44, left: 44, bottom: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            interval={0}
                            minTickGap={0}
                            tickMargin={10}
                            height={40}
                            tick={{ fill: "#64748b", fontSize: 13 }}
                            axisLine={{ stroke: "#94a3b8" }}
                            tickLine={{ stroke: "#94a3b8" }}
                          />

                          {semesterTrendView !== "submissionRate" && (
                            <YAxis
                              yAxisId="grade"
                              domain={[0, 20]}
                              width={42}
                              tick={{ fill: "#64748b", fontSize: 13 }}
                              axisLine={{ stroke: "#94a3b8" }}
                              tickLine={{ stroke: "#94a3b8" }}
                            />
                          )}

                          {semesterTrendView !== "grades" && (
                            <YAxis
                              yAxisId="rate"
                              orientation={semesterTrendView === "submissionRate" ? "left" : "right"}
                              domain={[0, 100]}
                              width={42}
                              tick={{ fill: "#64748b", fontSize: 13 }}
                              axisLine={{ stroke: "#94a3b8" }}
                              tickLine={{ stroke: "#94a3b8" }}
                            />
                          )}

                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ color: "#475569", fontSize: 13 }} />

                          {(semesterTrendView === "combined" || semesterTrendView === "grades") && (
                            <ReferenceLine
                              yAxisId="grade"
                              y={10}
                              stroke="#94a3b8"
                              strokeDasharray="4 4"
                              label={{ value: "Seuil 10/20", fill: "#64748b", fontSize: 12 }}
                            />
                          )}

                          {(semesterTrendView === "combined" || semesterTrendView === "grades") && (
                            <Line
                              yAxisId="grade"
                              type="monotone"
                              dataKey="Moyenne /20"
                              stroke="#9333ea"
                              strokeWidth={3}
                              name="Moyenne générale (/20)"
                              dot={{ r: 5, fill: "#9333ea", strokeWidth: 2, stroke: "#fff" }}
                              activeDot={{ r: 7 }}
                            />
                          )}

                          {(semesterTrendView === "combined" || semesterTrendView === "submissionRate") && (
                            <Line
                              yAxisId="rate"
                              type="monotone"
                              dataKey="Taux de remise (%)"
                              stroke="#22c55e"
                              strokeWidth={3}
                              strokeDasharray={semesterTrendView === "combined" ? "5 3" : "0"}
                              name="Taux de remise (%)"
                              dot={{ r: 5, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }}
                              activeDot={{ r: 7 }}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-md">
                <SectionToggle
                  title="Activité hebdomadaire des téléchargements"
                  subtitle="Suivi hebdomadaire des téléchargements de supports pédagogiques."
                  expanded={weeklyExpanded}
                  onToggle={() => setWeeklyExpanded((prev) => !prev)}
                />

                {weeklyExpanded && (
                  <>
                    <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <select
                        value={weeklyRange}
                        onChange={(e) => setWeeklyRange(e.target.value as "4" | "8" | "12" | "all")}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      >
                        <option value="4">4 dernières semaines</option>
                        <option value="8">8 dernières semaines</option>
                        <option value="12">12 dernières semaines</option>
                        <option value="all">Toute la période</option>
                      </select>

                      <select
                        value={weeklySemesterId}
                        onChange={(e) => {
                          const nextSemesterId = e.target.value;
                          setWeeklySemesterId(nextSemesterId);
                          setWeeklyModuleId("");
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      >
                        <option value="">Tous les semestres</option>
                        {semesters.map((semester) => (
                          <option key={semester.id} value={semester.id}>
                            {semester.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={weeklyModuleId}
                        onChange={(e) => setWeeklyModuleId(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      >
                        <option value="">Tous les modules</option>
                        {filteredModulesForWeekly.map((module) => (
                          <option key={module.id} value={module.id}>
                            {module.semester ? `${module.semester.name} / ${module.name}` : module.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {weeklyLoading ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        Chargement des téléchargements hebdomadaires...
                      </div>
                    ) : filteredWeeklyDownloads.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        Aucune activité hebdomadaire disponible.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart
                          data={filteredWeeklyDownloads}
                          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />

                          <Line
                            type="monotone"
                            dataKey="downloadCount"
                            name="Téléchargements"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </RequireRole>
  );
}
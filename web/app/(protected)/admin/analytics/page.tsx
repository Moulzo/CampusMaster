"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { RequireRole } from "@/lib/require-role";
import {
  getAdminAnalyticsGradesEvolution,
  getAdminAnalyticsWeeklyActivity,
  type SemesterGradesEvolution,
  type WeeklyActivityPoint,
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
    <div className="bg-white border border-slate-300 rounded-xl px-4 py-3 shadow-lg min-w-[220px]">
      <p className="text-slate-900 font-semibold text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 font-medium">{entry.name}</span>
            </div>
            <span className="text-slate-900 font-bold">
              {entry.value ?? "—"}
            </span>
          </div>
        ))}
      </div>
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
        <h4 className="font-semibold text-slate-900">{module.moduleName}</h4>
        <span
          className={`px-2 py-1 text-xs rounded-full font-medium ${
            module.averageGrade === null
              ? "bg-slate-100 text-slate-600"
              : module.averageGrade >= 10
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {formatAvg(module.averageGrade)}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Non corrigés</span>
          <span className="font-medium text-amber-600">{module.uncorrectedCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Retards</span>
          <span className="font-medium text-red-600">{module.lateCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Notés</span>
          <span className="font-medium text-slate-700">{module.gradedCount}</span>
        </div>
      </div>
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
    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
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
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${tones[tone]}`}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<SemesterGradesEvolution[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [weeklyView, setWeeklyView] = useState<"simple" | "detailed">("simple");
  const [weeklyRange, setWeeklyRange] = useState<"4" | "8" | "12" | "all">("8");
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);
  const [moduleChartExpanded, setModuleChartExpanded] = useState(false);
  const [moduleCardsExpanded, setModuleCardsExpanded] = useState(false);
  const [semesterTrendExpanded, setSemesterTrendExpanded] = useState(true);
  const [semesterTrendView, setSemesterTrendView] = useState<"combined" | "grades" | "submissionRate">("combined");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [gradesEvolution, weekly] = await Promise.all([
          getAdminAnalyticsGradesEvolution(),
          getAdminAnalyticsWeeklyActivity(),
        ]);
        if (cancelled) return;
        setData(gradesEvolution);
        setWeeklyActivity(weekly);
        if (gradesEvolution.length > 0) {
          setSelectedSemester(gradesEvolution[gradesEvolution.length - 1].semesterId);
        }
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

  const filteredWeeklyActivity = useMemo(() => {
    if (weeklyRange === "all") return weeklyActivity;

    const count = Number(weeklyRange);
    return weeklyActivity.slice(-count);
  }, [weeklyActivity, weeklyRange]);

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

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KpiCard
                      label="Moyenne générale"
                      value={formatAvg(globalKpis?.avgAll ?? null)}
                      sub="Normalisée sur 20"
                      icon="📈"
                      tone="purple"
                    />
                    <KpiCard
                      label="Taux de remise global"
                      value={formatPercent(globalKpis?.globalRate ?? null)}
                      sub="Rendus / Attendus"
                      icon="✅"
                      tone="green"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <StatChip
                      label="Devoirs en attente"
                      value={String(globalKpis?.totalUncorrected ?? 0)}
                      tone="amber"
                    />
                    <StatChip
                      label="Retards détectés"
                      value={String(globalKpis?.totalLate ?? 0)}
                      tone="red"
                    />
                  </div>
                </div>
              </section>

              {/* ── Graphe évolution par semestre ── */}
              <section className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                <SectionToggle
                  title="Évolution des moyennes par semestre"
                  subtitle="Moyenne globale (sur 20) et taux de remise (%) pour chaque semestre"
                  expanded={semesterTrendExpanded}
                  onToggle={() => setSemesterTrendExpanded((prev) => !prev)}
                />

                {semesterTrendExpanded && (
          <>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <p className="text-sm text-slate-600">
                {semesterTrendView === "combined" && "Lecture combinée : moyenne académique et taux de remise par semestre."}
                {semesterTrendView === "grades" && "Lecture ciblée : évolution de la moyenne académique sur 20."}
                {semesterTrendView === "submissionRate" && "Lecture ciblée : évolution du taux de remise des devoirs."}
              </p>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setSemesterTrendView("combined")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    semesterTrendView === "combined"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Vue combinée
                </button>
                <button
                  onClick={() => setSemesterTrendView("grades")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    semesterTrendView === "grades"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Moyennes
                </button>
                <button
                  onClick={() => setSemesterTrendView("submissionRate")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
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
                <LineChart
                data={lineChartData}
                margin={{ top: 18, right: 44, left: 44, bottom: 16 }}
              >
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

              {/* ── Activité hebdomadaire des dépôts ── */}
              <section className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                <SectionToggle
                  title="Activité hebdomadaire des dépôts"
                  subtitle={
                    weeklyView === "simple"
                      ? "Vue allégée : dépôts et retards par semaine"
                      : "Vue détaillée : dépôts, rendus uniques, corrections et retards"
                  }
                  expanded={weeklyExpanded}
                  onToggle={() => setWeeklyExpanded((prev) => !prev)}
                />

                {weeklyExpanded && (
                  <>
                    <div className="flex items-center gap-3 flex-wrap mb-6">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button
                          onClick={() => setWeeklyView("simple")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            weeklyView === "simple"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Vue simple
                        </button>
                        <button
                          onClick={() => setWeeklyView("detailed")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            weeklyView === "detailed"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Vue détaillée
                        </button>
                      </div>

                      <select
                        value={weeklyRange}
                        onChange={(e) => setWeeklyRange(e.target.value as "4" | "8" | "12" | "all")}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      >
                        <option value="4">4 dernières semaines</option>
                        <option value="8">8 dernières semaines</option>
                        <option value="12">12 dernières semaines</option>
                        <option value="all">Toute la période</option>
                      </select>
                    </div>

                    {filteredWeeklyActivity.length === 0 ? (
                      <div className="text-sm text-slate-400 py-8 text-center">
                        Aucune activité hebdomadaire disponible.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={filteredWeeklyActivity}
                          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ color: "#64748b", fontSize: 12 }} />

                          <Bar
                            dataKey="submissionCount"
                            name="Dépôts"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />

                          {weeklyView === "detailed" && (
                            <Bar
                              dataKey="uniqueSubmissionCount"
                              name="Rendus uniques"
                              fill="#22c55e"
                              radius={[4, 4, 0, 0]}
                            />
                          )}

                          {weeklyView === "detailed" && (
                            <Bar
                              dataKey="gradedCount"
                              name="Corrigés"
                              fill="#9333ea"
                              radius={[4, 4, 0, 0]}
                            />
                          )}

                          <Bar
                            dataKey="lateCount"
                            name="Retards"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </>
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <StatChip
                          label="Non corrigés"
                          value={String(activeSemester.totalUncorrected)}
                          tone="amber"
                        />
                        <StatChip
                          label="Retards"
                          value={String(activeSemester.totalLate)}
                          tone="red"
                        />
                        <StatChip
                          label="Devoirs rendus"
                          value={String(activeSemester.totalDelivered)}
                          tone="blue"
                        />
                      </div>
                    </div>

                    {/* BarChart des modules */}
                    {moduleChartData.length > 0 && (
                      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                        <SectionToggle
                          title={`Performance par module — ${activeSemester.semesterName}`}
                          subtitle="Moyenne, devoirs non corrigés et retards par module pédagogique"
                          expanded={moduleChartExpanded}
                          onToggle={() => setModuleChartExpanded((prev) => !prev)}
                        />

                        {moduleChartExpanded && (
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
                        )}
                      </div>
                    )}

                    {/* Cards modules */}
                    {activeSemester.moduleBreakdown.length > 0 && (
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => setModuleCardsExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span>{moduleCardsExpanded ? "Masquer les cartes modules" : "Voir les cartes modules"}</span>
                          <span className={`transition-transform ${moduleCardsExpanded ? "rotate-180" : ""}`}>⌄</span>
                        </button>
                      </div>
                    )}

                    {activeSemester.moduleBreakdown.length > 0 && moduleCardsExpanded && (
                      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
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
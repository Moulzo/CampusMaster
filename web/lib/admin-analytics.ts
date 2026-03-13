import { apiFetchJson } from "@/lib/auth";

export type AdminAnalyticsOverview = {
  totals: {
    students: number;
    teachers: number;
    courses: number;
    assignments: number;
    submissions: number;
  };
  kpis: {
    expectedSubmissions: number;
    deliveredAssignments: number;
    submissionRate: number | null;
    globalAverage: number | null;
  };
};

export type AdminCourseAnalytics = {
  courseId: string;
  courseTitle: string;
  learningModuleId: string | null;
  learningModuleName: string | null;
  semesterId: string | null;
  semesterName: string | null;
  studentCount: number;
  assignmentCount: number;
  submissionCount: number;
  deliveredAssignmentCount: number;
  expectedSubmissions: number;
  submissionRate: number | null;
  averageGrade: number | null;
};

// ✅ NOUVEAU
export type ModuleBreakdown = {
  moduleId: string;
  moduleName: string;
  averageGrade: number | null;
  gradedCount: number;
  uncorrectedCount: number;
  lateCount: number;
  deliveredCount: number;
  expectedCount: number;
  submissionRate: number | null;
};

export type SemesterGradesEvolution = {
  semesterId: string;
  semesterName: string;
  isCurrent: boolean;
  averageGrade: number | null;
  submissionRate: number | null;
  totalGraded: number;
  totalUncorrected: number;
  totalLate: number;
  totalExpected: number;
  totalDelivered: number;
  moduleBreakdown: ModuleBreakdown[];
};

export type WeeklyActivityPoint = {
  weekKey: string;
  label: string;
  submissionCount: number;
  uniqueSubmissionCount: number;
  gradedCount: number;
  lateCount: number;
};

export type WeeklyDownloadsPoint = {
  weekKey: string;
  label: string;
  downloadCount: number;
};

export type AdminConfigurableKpis = {
  counts: {
    expectedCount: number;
    deliveredUniqueCount: number;
    lateUniqueCount: number;
    pendingCorrectionCount: number;
    gradedCount: number;
    successCount: number;
  };
  kpis: {
    attendanceRate: number | null;
    lateRate: number | null;
    pendingCorrectionRate: number | null;
    successRate: number | null;
  };
};

export async function getAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  return apiFetchJson("/admin/analytics/overview");
}

export async function getAdminAnalyticsCourses(): Promise<AdminCourseAnalytics[]> {
  return apiFetchJson("/admin/analytics/courses");
}

// ✅ NOUVEAU
export async function getAdminAnalyticsGradesEvolution(): Promise<SemesterGradesEvolution[]> {
  return apiFetchJson("/admin/analytics/grades-evolution");
}

export async function getAdminAnalyticsWeeklyActivity(filters?: {
  semesterId?: string;
  moduleId?: string;
}): Promise<WeeklyActivityPoint[]> {
  const params = new URLSearchParams();

  if (filters?.semesterId) params.append("semesterId", filters.semesterId);
  if (filters?.moduleId) params.append("moduleId", filters.moduleId);

  const query = params.toString();
  return apiFetchJson(`/admin/analytics/weekly-activity${query ? `?${query}` : ""}`);
}

export async function getAdminAnalyticsWeeklyDownloads(filters?: {
  semesterId?: string;
  moduleId?: string;
}): Promise<WeeklyDownloadsPoint[]> {
  const params = new URLSearchParams();
  if (filters?.semesterId) params.append("semesterId", filters.semesterId);
  if (filters?.moduleId) params.append("moduleId", filters.moduleId);

  const query = params.toString();
  return apiFetchJson(`/admin/analytics/weekly-downloads${query ? `?${query}` : ""}`);
}

export async function getAdminAnalyticsConfigurableKpis(filters?: {
  semesterId?: string;
  moduleId?: string;
}): Promise<AdminConfigurableKpis> {
  const params = new URLSearchParams();
  if (filters?.semesterId) params.append("semesterId", filters.semesterId);
  if (filters?.moduleId) params.append("moduleId", filters.moduleId);

  const query = params.toString();
  return apiFetchJson(`/admin/analytics/configurable-kpis${query ? `?${query}` : ""}`);
}

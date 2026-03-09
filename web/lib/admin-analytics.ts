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

export async function getAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  return apiFetchJson("/admin/analytics/overview");
}

export async function getAdminAnalyticsCourses(): Promise<AdminCourseAnalytics[]> {
  return apiFetchJson("/admin/analytics/courses");
}

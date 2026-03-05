import { apiFetchJson as apiGet } from "@/lib/auth";

export type SemesterResultsDto = {
  semester: { 
    id: string; 
    name: string; 
    startDate: string | null; 
    endDate: string | null 
  };
  module: { 
    id: string; 
    name: string 
  };
  overallAverage: number | null; // sur 20
  courses: Array<{
    courseId: string;
    title: string;
    average: number | null; // sur 20
    gradedCount: number;
    pendingCount: number;
    missingCount: number;
    totalAssignments: number;
  }>;
};

export async function studentGetSemesterResults(params?: { semesterId?: string }) {
  const q = params?.semesterId ? `?semesterId=${encodeURIComponent(params.semesterId)}` : "";
  return apiGet<SemesterResultsDto>(`/student/semester-results${q}`);
}

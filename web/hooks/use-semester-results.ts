import { useState, useEffect } from "react";
import { apiGet } from "../lib/api";

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

export function useSemesterResults(semesterId?: string) {
  const [results, setResults] = useState<SemesterResultsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setError(null);
        const q = semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : "";
        const data = await apiGet<SemesterResultsDto>(`/student/semester-results${q}`);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [semesterId]);

  return { results, loading, error };
}

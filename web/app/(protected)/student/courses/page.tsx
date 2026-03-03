"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentCoursesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/subjects");
  }, [router]);

  return <div className="p-6">Redirection…</div>;
}

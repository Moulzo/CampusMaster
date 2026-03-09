import { RequireRole } from "@/lib/require-role";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole role="TEACHER">{children}</RequireRole>;
}
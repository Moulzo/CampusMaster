import { RequireRole } from "@/lib/require-role";
import { AppShell } from "@/lib/app-shell";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="TEACHER">
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

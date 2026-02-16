import { RequireRole } from "@/lib/require-role";
import { AppShell } from "@/lib/app-shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="STUDENT">
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

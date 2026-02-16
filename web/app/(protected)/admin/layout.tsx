import { RequireRole } from "@/lib/require-role";
import { AppShell } from "@/lib/app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="ADMIN">
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

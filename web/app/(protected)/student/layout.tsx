import { RequireRole } from "@/lib/require-role";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="STUDENT">
      {children}
    </RequireRole>
  );
}

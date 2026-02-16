"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Role } from "@/lib/auth-context";

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return; // le layout protégé gère déjà l'auth
    if (user.role !== role) router.replace("/forbidden");
  }, [loading, user, role, router]);

  if (loading) return <p style={{ padding: 24 }}>Chargement...</p>;
  if (!user) return null;
  if (user.role !== role) return null;

  return <>{children}</>;
}

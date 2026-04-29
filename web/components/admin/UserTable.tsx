import type { AdminUser } from "@/lib/admin-users";
import { getRoleLabel } from "@/lib/role-labels";

function formatLastLogin(lastLoginAt?: string | null) {
  if (!lastLoginAt) {
    return "Jamais connecté";
  }

  return new Date(lastLoginAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityStatus(lastLoginAt?: string | null) {
  if (!lastLoginAt) {
    return {
      label: "Jamais connecté",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  const lastLoginTime = new Date(lastLoginAt).getTime();

  if (Number.isNaN(lastLoginTime)) {
    return {
      label: "Inconnu",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  const daysSinceLogin =
    (Date.now() - lastLoginTime) / (1000 * 60 * 60 * 24);

  if (daysSinceLogin <= 7) {
    return {
      label: "Actif 7j",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (daysSinceLogin <= 30) {
    return {
      label: "Actif 30j",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "Inactif",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

type Props = {
  users: AdminUser[];
  onDelete: (id: string) => void;
  renderEditLink: (id: string) => React.ReactNode;
};

export function UserTable({ users, onDelete, renderEditLink }: Props) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-100">
          <tr className="text-left">
            <th className="p-3">Nom</th>
            <th className="p-3">Email</th>
            <th className="p-3">Rôle</th>
            <th className="p-3">Activité</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3">{u.fullName}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  u.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                  u.role === 'TEACHER' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {getRoleLabel(u.role)}
                </span>
              </td>
              <td className="p-3">
                {(() => {
                  const activity = getActivityStatus(u.lastLoginAt);

                  return (
                    <div className="space-y-1">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${activity.className}`}
                      >
                        {activity.label}
                      </span>
                      <p className="text-xs text-slate-500">
                        {formatLastLogin(u.lastLoginAt)}
                      </p>
                    </div>
                  );
                })()}
              </td>
              <td className="p-3 flex gap-3">
                {renderEditLink(u.id)}
                <button className="text-red-600 underline" onClick={() => onDelete(u.id)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td className="p-3 text-zinc-500" colSpan={5}>
                Aucun utilisateur.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

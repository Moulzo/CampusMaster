import type { AdminUser } from "@/lib/admin-users";

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
                  {u.role}
                </span>
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
              <td className="p-3 text-zinc-500" colSpan={4}>
                Aucun utilisateur.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

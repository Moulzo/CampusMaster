import { apiFetch } from './auth';

export async function getAcademicsTree() {
  const res = await apiFetch('/academics/tree');
  if (!res.ok) throw new Error('Failed to fetch academics tree');
  return res.json();
}

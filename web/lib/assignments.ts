import { getAccessToken } from './auth';

const API_URL = "http://localhost:3001/api";

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  courseId: string;
  teacherId: string;
  course: {
    id: string;
    title: string;
  };
  submissions: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  correctedAt: string | null;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    course: {
      id: string;
      title: string;
    };
  };
  student: {
    id: string;
    email: string;
    fullName: string;
  };
}

function authHeaders() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Access token manquant (utilisateur non connecté).");
  }
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

// ASSIGNMENTS
export async function getAssignments(courseId?: string): Promise<Assignment[]> {
  const url = courseId ? `${API_URL}/assignments?courseId=${courseId}` : `${API_URL}/assignments`;
  const res = await fetch(url, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch assignments: ${res.status}`);
  }
  return res.json();
}

export async function getAssignment(id: string): Promise<Assignment> {
  const res = await fetch(`${API_URL}/assignments/${id}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch assignment: ${res.status}`);
  }
  return res.json();
}

export async function createAssignment(title: string, description: string | null, dueDate: string, courseId: string): Promise<Assignment> {
  const res = await fetch(`${API_URL}/assignments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ title, description, dueDate, courseId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to create assignment: ${res.status}`);
  }
  return res.json();
}

export async function updateAssignment(id: string, title?: string, description?: string, dueDate?: string): Promise<Assignment> {
  const res = await fetch(`${API_URL}/assignments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ title, description, dueDate }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to update assignment: ${res.status}`);
  }
  return res.json();
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/assignments/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to delete assignment: ${res.status}`);
  }
}

// SUBMISSIONS
export async function getSubmissions(assignmentId: string): Promise<Submission[]> {
  const res = await fetch(`${API_URL}/submissions?assignmentId=${assignmentId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch submissions: ${res.status}`);
  }
  return res.json();
}

export async function getSubmission(id: string): Promise<Submission> {
  const res = await fetch(`${API_URL}/submissions/${id}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch submission: ${res.status}`);
  }
  return res.json();
}

export async function createSubmission(assignmentId: string, fileUrl?: string): Promise<Submission> {
  const res = await fetch(`${API_URL}/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ assignmentId, fileUrl }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to create submission: ${res.status}`);
  }
  return res.json();
}

export async function gradeSubmission(id: string, score: number, feedback?: string): Promise<Submission> {
  const res = await fetch(`${API_URL}/submissions/${id}/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ score, feedback }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to grade submission: ${res.status}`);
  }
  return res.json();
}

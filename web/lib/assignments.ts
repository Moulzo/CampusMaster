import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type UserLite = {
  id: string;
  email: string;
  fullName: string | null;
};

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxScore: number;

  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentMimeType?: string | null;

  courseId: string;

  // legacy teacherId supprimé (multi-teachers via course.teachers[])

  course: {
    id: string;
    title: string;
    // ✅ multi-teacher (si l'API l'inclut)
    teachers?: UserLite[];
  };

  submissions: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;

  fileUrls: string | null; // JSON array of file objects
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
      teachers?: UserLite[];
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

// Helpers (évite crash si relations absentes)
function normalizeAssignment(a: any): Assignment {
  return {
    ...a,
    course: {
      ...(a.course ?? {}),
      teachers: a.course?.teachers ?? [],
    },
    submissions: a.submissions ?? [],
  };
}

function normalizeSubmission(s: any): Submission {
  return {
    ...s,
    assignment: {
      ...(s.assignment ?? {}),
      course: {
        ...(s.assignment?.course ?? {}),
        teachers: s.assignment?.course?.teachers ?? [],
      },
    },
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

  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeAssignment);
}

export async function uploadFile(file: File): Promise<{ fileUrl: string; originalName?: string }> {
  console.log("uploadFile called", { file: file.name, size: file.size, type: file.type });
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/files/upload`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: form,
    cache: "no-store",
  });

  console.log("uploadFile response status", res.status);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("uploadFile error response", txt);
    throw new Error(txt || `Failed to upload file: ${res.status}`);
  }

  const data = await res.json();
  console.log("uploadFile response data", data);
  if (!data?.fileUrl) {
    throw new Error("Upload failed: fileUrl manquant");
  }
  return { fileUrl: data.fileUrl, originalName: data.originalName };
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

  return normalizeAssignment(await res.json());
}

export async function createAssignment(
  title: string,
  description: string | undefined,
  dueDate: string,
  courseId: string,
  opts?: {
    maxScore?: number;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentMimeType?: string;
  }
): Promise<Assignment> {
  console.log("createAssignment body", {
    title,
    description,
    dueDate,
    courseId,
    ...(opts ?? {}),
  });

  const res = await fetch(`${API_URL}/assignments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ title, description, dueDate, courseId, ...(opts ?? {}) }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to create assignment: ${res.status}`);
  }

  return normalizeAssignment(await res.json());
}

export async function updateAssignment(
  id: string,
  title?: string,
  description?: string,
  dueDate?: string
): Promise<Assignment> {
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

  return normalizeAssignment(await res.json());
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

  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeSubmission);
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

  return normalizeSubmission(await res.json());
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

  return normalizeSubmission(await res.json());
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

  const text = await res.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  return normalizeSubmission(data);
}

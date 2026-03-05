type NotificationType =
  | "ANNOUNCEMENT"
  | "NEW_ASSIGNMENT"
  | "NEW_GRADE"
  | string;

export type AppNotification = {
  id: string;
  type: NotificationType;
  title?: string | null;
  message?: string | null;
  isRead: boolean;
  createdAt: string | Date;
  metadata?: unknown;
};

function asRecord(v: unknown): Record<string, any> | null {
  return v && typeof v === "object" ? (v as Record<string, any>) : null;
}

function getMetaIds(metadata: unknown): { courseId?: string; assignmentId?: string } {
  const m = asRecord(metadata);
  if (!m) return {};

  // Tolérance si jamais tu avais d'autres noms
  const courseId = m.courseId ?? m.courseID ?? m.course?.id;
  const assignmentId = m.assignmentId ?? m.assignmentID ?? m.assignment?.id;

  return {
    courseId: typeof courseId === "string" ? courseId : undefined,
    assignmentId: typeof assignmentId === "string" ? assignmentId : undefined,
  };
}

export function getNotificationHref(n: AppNotification): string | null {
  const { courseId, assignmentId } = getMetaIds(n.metadata);

  console.log("[notifications.ts] getNotificationHref:", {
    type: n.type,
    courseId,
    assignmentId,
    metadata: n.metadata
  });

  switch (n.type) {
    case "ANNOUNCEMENT": {
      // Exemple: /student/courses/:courseId?tab=announcements#announcement-:announcementId
      const m = asRecord(n.metadata);
      const announcementId = m?.announcementId;
      if (!courseId) return null;
      const base = `/student/courses/${courseId}?tab=announcements`;
      return announcementId ? `${base}#announcement-${announcementId}` : base;
    }

    case "NEW_ASSIGNMENT": {
      if (!courseId || !assignmentId) return null;
      return `/student/courses/${courseId}?tab=assignments#assignment-${assignmentId}`;
    }

    case "NEW_GRADE": {
      if (!courseId || !assignmentId) return null;
      return `/student/courses/${courseId}?tab=grades#grade-${assignmentId}`;
    }

    default:
      console.log("[notifications.ts] Type non géré:", n.type);
      return null;
  }
}

export function onOpenNotification(n: AppNotification, routerPush: (href: string) => void) {
  const href = getNotificationHref(n);
  if (!href) {
    console.warn("[notifications.ts] no href for", { id: n.id, type: n.type, metadata: n.metadata });
    return;
  }
  console.log("[notifications.ts] click:", {
    id: n.id,
    type: n.type,
    href,
    metadata: n.metadata,
  });
  routerPush(href);
}

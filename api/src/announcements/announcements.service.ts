import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { NotificationsGateway } from "../websockets/notifications.gateway";
import { NotificationType } from "@prisma/client";

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async listByCourse(courseId: string) {
    return this.prisma.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async create(courseId: string, authorId: string, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.announcement.create({
      data: {
        courseId,
        authorId,
        title: dto.title,
        content: dto.content,
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, email: true, fullName: true } },
      },
    });

    // ✅ Récupérer les étudiants inscrits au cours
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        learningModuleId: true,
        students: { select: { id: true } },
      },
    });

    let studentIds = (course?.students ?? [])
      .map((s) => s.id)
      .filter((id) => id !== authorId); // évite de notifier l'auteur

    // ✅ Fallback: si aucun étudiant inscrit directement, notifier les étudiants du module
    if (!studentIds.length && course?.learningModuleId) {
      console.log("ANNOUNCE fallback: no direct students, checking module students for module", course.learningModuleId);
      
      const moduleStudents = await this.prisma.user.findMany({
        where: { 
          role: "STUDENT", 
          learningModuleId: course.learningModuleId 
        },
        select: { id: true },
      });
      
      studentIds = moduleStudents
        .map((s) => s.id)
        .filter((id) => id !== authorId);
      
      console.log("ANNOUNCE fallback: found module students", studentIds);
    }

    console.log("[ANNOUNCE] recipients", studentIds);

    if (studentIds.length) {
      const message = `${announcement.title} — ${course?.title ?? "Cours"}`;

      // ✅ Créer les notifications en base et push en temps réel
      for (const userId of studentIds) {
        const notif = await this.prisma.notification.create({
          data: {
            userId,
            type: NotificationType.ANNOUNCEMENT,
            title: "Nouvelle annonce",
            message,
            metadata: { courseId, announcementId: announcement.id },
          },
        });

        // ✅ Push en temps réel (event EXACT: "notification:new")
        await this.notificationsGateway.sendNotificationToUser(userId, {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          isRead: notif.isRead,
          createdAt: notif.createdAt.toISOString(),
          readAt: notif.readAt ? notif.readAt.toISOString() : null,
          metadata: notif.metadata,
        });

        // ✅ Refresh badge unread côté client
        await this.notificationsGateway.updateNotificationCount(userId);
      }
    }

    return announcement;
  }

  async update(id: string, authorId: string, dto: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
      select: { id: true, authorId: true, courseId: true },
    });
    if (!existing) throw new NotFoundException("Annonce introuvable");
    if (existing.authorId !== authorId) throw new ForbiddenException("Vous ne pouvez pas modifier cette annonce");

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, email: true, fullName: true } },
      },
    });

    // ✅ Notifier les étudiants de la modification
    const course = await this.prisma.course.findUnique({
      where: { id: existing.courseId },
      select: {
        id: true,
        title: true,
        learningModuleId: true,
        students: { select: { id: true } },
      },
    });

    let studentIds = (course?.students ?? [])
      .map((s) => s.id)
      .filter((id) => id !== authorId);

    // ✅ Fallback: si aucun étudiant inscrit directement, notifier les étudiants du module
    if (!studentIds.length && course?.learningModuleId) {
      console.log("ANNOUNCE update fallback: no direct students, checking module students for module", course.learningModuleId);
      
      const moduleStudents = await this.prisma.user.findMany({
        where: { 
          role: "STUDENT", 
          learningModuleId: course.learningModuleId 
        },
        select: { id: true },
      });
      
      studentIds = moduleStudents
        .map((s) => s.id)
        .filter((id) => id !== authorId);
      
      console.log("ANNOUNCE update fallback: found module students", studentIds);
    }

    if (studentIds.length) {
      const message = `Annonce modifiée: ${announcement.title} — ${course?.title ?? "Cours"}`;

      // ✅ Créer les notifications en base et push en temps réel
      for (const userId of studentIds) {
        const notif = await this.prisma.notification.create({
          data: {
            userId,
            type: NotificationType.ANNOUNCEMENT,
            title: "Annonce modifiée",
            message,
            metadata: {
              courseId: existing.courseId,
              announcementId: announcement.id,
              action: "updated",
            },
          },
        });

        // ✅ Push en temps réel
        await this.notificationsGateway.sendNotificationToUser(userId, {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          isRead: notif.isRead,
          createdAt: notif.createdAt.toISOString(),
          readAt: notif.readAt ? notif.readAt.toISOString() : null,
          metadata: notif.metadata,
        });

        await this.notificationsGateway.updateNotificationCount(userId);
      }
    }

    return announcement;
  }

  async remove(id: string, authorId: string, isAdmin = false) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
      select: { id: true, authorId: true, courseId: true, title: true },
    });
    if (!existing) throw new NotFoundException("Annonce introuvable");
    if (!isAdmin && existing.authorId !== authorId) {
      throw new ForbiddenException("Vous ne pouvez pas supprimer cette annonce");
    }

    await this.prisma.announcement.delete({ where: { id } });

    // ✅ Notifier les étudiants de la suppression
    const course = await this.prisma.course.findUnique({
      where: { id: existing.courseId },
      select: {
        id: true,
        title: true,
        learningModuleId: true,
        students: { select: { id: true } },
      },
    });

    let studentIds = (course?.students ?? [])
      .map((s) => s.id)
      .filter((id) => id !== authorId);

    // ✅ Fallback: si aucun étudiant inscrit directement, notifier les étudiants du module
    if (!studentIds.length && course?.learningModuleId) {
      console.log("ANNOUNCE remove fallback: no direct students, checking module students for module", course.learningModuleId);
      
      const moduleStudents = await this.prisma.user.findMany({
        where: { 
          role: "STUDENT", 
          learningModuleId: course.learningModuleId 
        },
        select: { id: true },
      });
      
      studentIds = moduleStudents
        .map((s) => s.id)
        .filter((id) => id !== authorId);
      
      console.log("ANNOUNCE remove fallback: found module students", studentIds);
    }

    if (studentIds.length) {
      const message = `Annonce supprimée: ${existing.title} — ${course?.title ?? "Cours"}`;

      // ✅ Créer les notifications en base et push en temps réel
      for (const userId of studentIds) {
        const notif = await this.prisma.notification.create({
          data: {
            userId,
            type: NotificationType.ANNOUNCEMENT,
            title: "Annonce supprimée",
            message,
            metadata: {
              courseId: existing.courseId,
              announcementId: existing.id,
              action: "deleted",
            },
          },
        });

        // ✅ Push en temps réel
        await this.notificationsGateway.sendNotificationToUser(userId, {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          isRead: notif.isRead,
          createdAt: notif.createdAt.toISOString(),
          readAt: notif.readAt ? notif.readAt.toISOString() : null,
          metadata: notif.metadata,
        });

        await this.notificationsGateway.updateNotificationCount(userId);
      }
    }

    return { ok: true };
  }
}

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class DiscussionsService {
  constructor(private prisma: PrismaService) {}

  private async assertCanAccessCourse(courseId: string, user: { id: string; role: Role }) {
    if (user.role === "ADMIN") return;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        learningModuleId: true,
        teachers: { select: { id: true } },
        students: { select: { id: true } },
      },
    });

    if (!course) throw new NotFoundException("Cours introuvable");

    if (user.role === "TEACHER") {
      const isTeacher = course.teachers.some((t) => t.id === user.id);
      if (!isTeacher) throw new ForbiddenException("Accès interdit");
      return;
    }

    if (user.role === "STUDENT") {
      // ✅ Étudiant : accès si inscrit AU SI même module
      const student = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { learningModuleId: true },
      });

      const isEnrolled = course.students.some((s) => s.id === user.id);
      const sameModule =
        !!student?.learningModuleId &&
        !!course.learningModuleId &&
        student.learningModuleId === course.learningModuleId;

      if (!isEnrolled && !sameModule) {
        throw new ForbiddenException("Accès interdit : vous n'êtes pas inscrit à ce cours");
      }
      return;
    }

    throw new ForbiddenException("Accès interdit");
  }

  async listThreads(courseId: string, user: any) {
    await this.assertCanAccessCourse(courseId, user);

    const threads = await this.prisma.discussionThread.findMany({
      where: { courseId },
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        _count: { select: { messages: true } },
        course: { include: { teachers: { select: { id: true } } } },
      },
    });

    // Calculer canDelete pour chaque thread
    return threads.map((thread) => {
      const isAdmin = user.role === "ADMIN";
      const isAuthor = thread.createdById === user.id;
      const isCourseTeacher =
        user.role === "TEACHER" && thread.course.teachers.some((t) => t.id === user.id);

      const { course, ...threadWithoutCourse } = thread;
      return {
        ...threadWithoutCourse,
        canDelete: isAdmin || isAuthor || isCourseTeacher,
      };
    });
  }

  async createThread(courseId: string, user: any, title: string) {
    await this.assertCanAccessCourse(courseId, user);

    return this.prisma.discussionThread.create({
      data: {
        courseId,
        title,
        createdById: user.id,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, fullName: true, role: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async listMessages(threadId: string, user: any) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { id: threadId },
      select: { id: true, courseId: true },
    });
    if (!thread) throw new NotFoundException("Discussion introuvable");

    await this.assertCanAccessCourse(thread.courseId, user);

    return this.prisma.discussionMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async createMessage(threadId: string, user: any, content: string) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { id: threadId },
      select: { id: true, courseId: true },
    });
    if (!thread) throw new NotFoundException("Discussion introuvable");

    await this.assertCanAccessCourse(thread.courseId, user);

    const msg = await this.prisma.discussionMessage.create({
      data: {
        threadId,
        authorId: user.id,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, fullName: true, role: true } },
      },
    });

    // bump updatedAt sur thread (pour tri)
    await this.prisma.discussionThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });

    return msg;
  }

  async deleteThread(threadId: string, user: any) {
    const thread = await this.prisma.discussionThread.findUnique({
      where: { id: threadId },
      include: { 
        course: { 
          include: { 
            teachers: { select: { id: true } } 
          } 
        } 
      },
    });
    if (!thread) throw new NotFoundException("Discussion introuvable");

    const isAdmin = user.role === "ADMIN";
    const isAuthor = thread.createdById === user.id;
    const isCourseTeacher =
      user.role === "TEACHER" && thread.course.teachers.some((t) => t.id === user.id);

    if (!isAdmin && !isAuthor && !isCourseTeacher) {
      throw new ForbiddenException("Accès interdit");
    }

    await this.prisma.discussionThread.delete({ where: { id: threadId } });
    return { ok: true };
  }
}

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourseResourceDto } from "./dto/create-course-resource.dto";
import * as fs from "fs";
import * as path from "path";

type Role = "STUDENT" | "TEACHER" | "ADMIN" | string;

@Injectable()
export class CourseResourcesService {
  constructor(private prisma: PrismaService) {}

  private async studentCanAccessCourseByModule(courseId: string, studentId: string) {
    const [student, course] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { learningModuleId: true, role: true },
      }),
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { learningModuleId: true },
      }),
    ]);

    if (!student || student.role !== "STUDENT") return false;
    if (!student.learningModuleId) return false;
    if (!course || !course.learningModuleId) return false;

    return student.learningModuleId === course.learningModuleId;
  }

  private async assertCanViewCourse(courseId: string, userId: string, role: Role) {
    if (role === "ADMIN") return;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        teachers: { select: { id: true } },
        learningModuleId: true, // ✅
      },
    });
    if (!course) throw new NotFoundException("Course not found");

    if (role === "TEACHER" && course.teachers.some((t) => t.id === userId)) return;

    if (role === "STUDENT") {
      const ok = await this.studentCanAccessCourseByModule(courseId, userId);
      if (ok) return;
    }

    throw new ForbiddenException("Accès interdit");
  }

  async listCourseResources(courseId: string, userId: string, role: Role) {
    await this.assertCanViewCourse(courseId, userId, role);

    const resources = await this.prisma.courseResource.findMany({
      where: { courseId },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } }, // uploader en DB
      },
      orderBy: { createdAt: "desc" },
    });

    return resources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      filename: r.filename,
      mimeType: r.mimeType,
      size: r.size,
      createdAt: r.createdAt,
      uploadedBy: r.teacher,
    }));
  }

  async createResource(
    courseId: string,
    teacherId: string,
    dto: CreateCourseResourceDto,
    file: Express.Multer.File
  ) {
    // seul le prof "owner" de la matière peut upload (avec ton modèle actuel)
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teachers: { select: { id: true } } },
    });
    if (!course) throw new NotFoundException("Course not found");

    const isTeacher = course.teachers.some(t => t.id === teacherId);
    if (!isTeacher) throw new ForbiddenException("Not your course");

    const relPath = path.join("courses", courseId, file.filename).replaceAll("\\", "/");

    return this.prisma.courseResource.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        type: "FILE",
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: relPath,
        courseId,
        teacherId,
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    }).then((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      filename: r.filename,
      mimeType: r.mimeType,
      size: r.size,
      createdAt: r.createdAt,
      uploadedBy: r.teacher,
    }));
  }

  async getResourceForDownload(id: string, userId: string, role: Role) {
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        path: true,
        courseId: true,
        course: {
          select: {
            teachers: { select: { id: true } },
            learningModuleId: true, // ✅
          },
        },
      },
    });
    if (!resource) throw new NotFoundException("Resource not found");

    if (role !== "ADMIN") {
      if (role === "TEACHER" && !resource.course.teachers.some((t) => t.id === userId)) {
        throw new ForbiddenException();
      }

      if (role === "STUDENT") {
        const ok = await this.studentCanAccessCourseByModule(resource.courseId, userId);
        if (!ok) throw new ForbiddenException();
      }
    }

    return resource;
  }

  async deleteResource(id: string, userId: string, role: Role) {
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
      select: { teacherId: true, path: true },
    });
    if (!resource) throw new NotFoundException("Resource not found");

    if (role !== "ADMIN" && resource.teacherId !== userId) {
      throw new ForbiddenException("Not your resource");
    }

    // delete DB first or file first: je préfère DB first puis best-effort file
    await this.prisma.courseResource.delete({ where: { id } });

    const absPath = path.join(process.cwd(), "uploads", resource.path);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    return { ok: true };
  }
}

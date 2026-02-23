import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourseResourceDto } from "./dto/create-course-resource.dto";
import * as fs from "fs";
import * as path from "path";

type Role = "STUDENT" | "TEACHER" | "ADMIN" | string;

@Injectable()
export class CourseResourcesService {
  constructor(private prisma: PrismaService) {}

  private async assertCanViewCourse(courseId: string, userId: string, role: Role) {
    if (role === "ADMIN") return;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, students: { select: { id: true } } },
    });
    if (!course) throw new NotFoundException("Course not found");

    if (role === "TEACHER" && course.teacherId === userId) return;
    if (role === "STUDENT" && course.students.some((s) => s.id === userId)) return;

    throw new ForbiddenException("Accès interdit");
  }

  async listCourseResources(courseId: string, userId: string, role: Role) {
    await this.assertCanViewCourse(courseId, userId, role);

    return this.prisma.courseResource.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        description: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        teacher: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
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
      select: { teacherId: true },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (course.teacherId !== teacherId) throw new ForbiddenException("Not your course");

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
      select: {
        id: true,
        title: true,
        description: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });
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
        course: { select: { teacherId: true, students: { select: { id: true } } } },
      },
    });
    if (!resource) throw new NotFoundException("Resource not found");

    // check accès au cours
    if (role !== "ADMIN") {
      const course = resource.course;
      if (role === "TEACHER" && course.teacherId !== userId) throw new ForbiddenException();
      if (role === "STUDENT" && !course.students.some((s) => s.id === userId))
        throw new ForbiddenException();
    }

    return resource;
  }

  async deleteResource(id: string, teacherId: string) {
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
      select: { teacherId: true, path: true },
    });
    if (!resource) throw new NotFoundException("Resource not found");
    if (resource.teacherId !== teacherId) throw new ForbiddenException("Not your resource");

    // delete DB first or file first: je préfère DB first puis best-effort file
    await this.prisma.courseResource.delete({ where: { id } });

    const absPath = path.join(process.cwd(), "uploads", resource.path);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    return { ok: true };
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto, teacherId: string) {
    return this.prisma.course.create({
      data: {
        title: createCourseDto.title,
        description: createCourseDto.description ?? null,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        students: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, role: Role) {
    // ADMIN: tous les cours
    if (role === 'ADMIN') {
      return this.prisma.course.findMany({
        include: {
          teacher: { select: { id: true, email: true, fullName: true } },
          students: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // TEACHER: ses cours créés
    if (role === 'TEACHER') {
      return this.prisma.course.findMany({
        where: { teacherId: userId },
        include: {
          teacher: { select: { id: true, email: true, fullName: true } },
          students: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // ✅ STUDENT: tous les cours (pour afficher "cours disponibles" + "mes inscriptions" côté front)
    return this.prisma.course.findMany({
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, teacherId: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      select: { teacherId: true },
    });

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...updateCourseDto,
        ...(updateCourseDto.description !== undefined
          ? { description: updateCourseDto.description || null }
          : {}),
      },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      select: { teacherId: true },
    });

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    return this.prisma.course.delete({
      where: { id },
    });
  }

  async enrollStudent(courseId: string, studentId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          connect: { id: studentId },
        },
      },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async unenrollStudent(courseId: string, studentId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: studentId },
        },
      },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }
}

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createAssignmentDto: CreateAssignmentDto, teacherId: string) {
    // Vérifier que le teacher est bien le teacher du cours
    const course = await this.prisma.course.findUnique({
      where: { id: createAssignmentDto.courseId },
      select: { teacherId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    const maxScore = createAssignmentDto.maxScore ?? 20;
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) {
      throw new BadRequestException('maxScore must be between 1 and 1000');
    }

    return this.prisma.assignment.create({
      data: {
        title: createAssignmentDto.title,
        description: createAssignmentDto.description ?? null,
        dueDate: new Date(createAssignmentDto.dueDate),
        maxScore,
        attachmentUrl: createAssignmentDto.attachmentUrl ?? null,
        attachmentName: createAssignmentDto.attachmentName ?? null,
        attachmentSize: createAssignmentDto.attachmentSize ?? null,
        attachmentMimeType: createAssignmentDto.attachmentMimeType ?? null,
        courseId: createAssignmentDto.courseId,
        teacherId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(userId: string, role: Role, courseId?: string) {
    // Si courseId est spécifié, vérifier l'accès
    if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      // ADMIN: tous les devoirs du cours
      if (role === 'ADMIN') {
        return this.getAssignmentsWithRelations({ courseId });
      }

      // TEACHER: seulement si c'est son cours
      if (role === 'TEACHER' && course.teacherId === userId) {
        return this.getAssignmentsWithRelations({ courseId });
      }

      // STUDENT: seulement si inscrit au cours
      const enrollment = await this.prisma.course.findUnique({
        where: {
          id: courseId,
          students: {
            some: { id: userId },
          },
        },
        select: { id: true },
      });

      if (enrollment) {
        return this.getAssignmentsWithRelations({ courseId });
      }
    }

    // Sans courseId spécifique
    // ADMIN: tous les devoirs
    if (role === 'ADMIN') {
      return this.getAssignmentsWithRelations({});
    }

    // TEACHER: ses devoirs créés
    if (role === 'TEACHER') {
      return this.getAssignmentsWithRelations({ teacherId: userId });
    }

    // STUDENT: devoirs des cours où il est inscrit
    return this.getAssignmentsWithRelations({
      course: {
        students: {
          some: { id: userId },
        },
      },
    });
  }

  private async getAssignmentsWithRelations(where: Prisma.AssignmentWhereInput = {}) {
    return this.prisma.assignment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        submissions: {
          include: {
            student: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
          },
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Vérifier les permissions
    if (role === 'ADMIN') {
      return assignment;
    }

    if (role === 'TEACHER' && assignment.course.teacherId === userId) {
      return assignment;
    }

    if (role === 'STUDENT') {
      // Vérifier que l'étudiant est inscrit au cours
      const isEnrolled = await this.prisma.course.findUnique({
        where: {
          id: assignment.courseId,
          students: {
            some: { id: userId },
          },
        },
        select: { id: true },
      });

      if (isEnrolled) {
        return assignment;
      }
    }

    throw new ForbiddenException('Access denied');
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: { teacherId: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this assignment');
    }

    if (updateAssignmentDto.maxScore !== undefined) {
      const maxScore = updateAssignmentDto.maxScore;
      if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) {
        throw new BadRequestException('maxScore must be between 1 and 1000');
      }
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...updateAssignmentDto,
        ...(updateAssignmentDto.dueDate !== undefined
          ? { dueDate: new Date(updateAssignmentDto.dueDate) }
          : {}),
        ...(updateAssignmentDto.description !== undefined
          ? { description: updateAssignmentDto.description || null }
          : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        submissions: {
          include: {
            student: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: { teacherId: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this assignment');
    }

    return this.prisma.assignment.delete({
      where: { id },
    });
  }
}

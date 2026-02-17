import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  async create(assignmentId: string, studentId: string, fileUrl?: string) {
    // Vérifier que l'étudiant est inscrit au cours du devoir
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          select: {
            id: true,
            students: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Vérifier que l'étudiant est inscrit au cours
    const isEnrolled = assignment.course.students.some(student => student.id === studentId);
    if (!isEnrolled) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        fileUrl: fileUrl ?? null,
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findByAssignment(assignmentId: string, userId: string, role: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
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
      return assignment.submissions;
    }

    if (role === 'TEACHER' && assignment.course.teacherId === userId) {
      return assignment.submissions;
    }

    if (role === 'STUDENT') {
      const isEnrolled = await this.prisma.course.findUnique({
        where: {
          id: assignment.course.id,
          students: {
            some: { id: userId },
          },
        },
        select: { id: true },
      });

      if (isEnrolled) {
        return assignment.submissions.filter((submission) => submission.studentId === userId);
      }
    }

    throw new ForbiddenException('Access denied');
  }

  async findOne(id: string, userId: string, role: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            course: {
              select: {
                id: true,
                title: true,
                teacherId: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Vérifier les permissions
    if (role === 'ADMIN') {
      return submission;
    }

    if (role === 'TEACHER' && submission.assignment.course.teacherId === userId) {
      return submission;
    }

    if (role === 'STUDENT' && submission.studentId === userId) {
      return submission;
    }

    throw new ForbiddenException('Access denied');
  }

  async grade(id: string, score: number, teacherId: string, feedback?: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            course: {
              select: { teacherId: true },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Seul le teacher du cours peut noter
    if (submission.assignment.course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    return this.prisma.submission.update({
      where: { id },
      data: {
        score,
        feedback: feedback ?? null,
        correctedAt: new Date(),
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LearningModulesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; description?: string; semesterId: string }) {
    return this.prisma.learningModule.create({
      data,
      include: {
        semester: true,
        subjects: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            _count: {
              select: {
                students: true,
                assignments: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(semesterId?: string) {
    return this.prisma.learningModule.findMany({
      where: semesterId ? { semesterId } : {},
      include: {
        semester: true,
        subjects: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            _count: {
              select: {
                students: true,
                assignments: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.learningModule.findUnique({
      where: { id },
      include: {
        semester: true,
        subjects: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            _count: {
              select: {
                students: true,
                assignments: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.learningModule.update({
      where: { id },
      data,
      include: {
        semester: true,
        subjects: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            _count: {
              select: {
                students: true,
                assignments: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.learningModule.delete({
      where: { id },
    });
  }
}

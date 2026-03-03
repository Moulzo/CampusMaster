import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SemestersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; startDate?: Date; endDate?: Date }) {
    return this.prisma.semester.create({
      data,
      include: {
        learningModules: {
          include: {
            subjects: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.semester.findMany({
      include: {
        learningModules: {
          include: {
            subjects: {
              include: {
                teachers: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.semester.findUnique({
      where: { id },
      include: {
        learningModules: {
          include: {
            subjects: {
              include: {
                teachers: {
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
        },
      },
    });
  }

  async update(id: string, data: { name?: string; startDate?: Date; endDate?: Date }) {
    return this.prisma.semester.update({
      where: { id },
      data,
      include: {
        learningModules: {
          include: {
            subjects: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.semester.delete({
      where: { id },
    });
  }
}

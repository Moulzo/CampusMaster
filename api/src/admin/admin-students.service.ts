import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudentModuleDto } from './dto/admin-student.dto';

@Injectable()
export class AdminStudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { moduleId?: string; q?: string }) {
    const where: any = {};

    // Filtrer par rôle STUDENT uniquement
    where.role = 'STUDENT';

    // Filtrer par module si spécifié
    if (filters?.moduleId) {
      where.learningModuleId = filters.moduleId;
    }

    // Filtrer par recherche (nom ou email)
    if (filters?.q) {
      const searchQuery = filters.q.trim().toLowerCase();
      where.OR = [
        { fullName: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        learningModule: {
          select: {
            id: true,
            name: true,
            semester: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async setModule(studentId: string, learningModuleId: string | null) {
    // Vérifier que l'étudiant existe et est bien un étudiant
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestException('User is not a student');
    }

    // Si learningModuleId est fourni, vérifier que le module existe
    if (learningModuleId !== null) {
      const module = await this.prisma.learningModule.findUnique({
        where: { id: learningModuleId },
        select: { id: true },
      });

      if (!module) {
        throw new NotFoundException('Learning module not found');
      }
    }

    return this.prisma.user.update({
      where: { id: studentId },
      data: { learningModuleId: learningModuleId ?? null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
                learningModule: {
          select: {
            id: true,
            name: true,
            semester: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async unsetModule(studentId: string) {
    // Vérifier que l'étudiant existe
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestException('User is not a student');
    }

    return this.prisma.user.update({
      where: { id: studentId },
      data: { learningModuleId: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
                learningModule: {
          select: {
            id: true,
            name: true,
            semester: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { moduleId?: string; q?: string }) {
    const where: any = {};
    where.role = 'STUDENT';

    if (filters?.moduleId) {
      where.learningModuleId = filters.moduleId;
    }

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
            semester: { select: { id: true, name: true } },
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
      select: {
        id: true,
        role: true,
        fullName: true,
        learningModuleId: true,
      },
    });

    if (!student) throw new NotFoundException('Student not found');
    if (student.role !== 'STUDENT') throw new BadRequestException('User is not a student');

    // Vérifier que le nouveau module existe
    let newModule: { id: string; name: string; semesterId: string } | null = null;
    if (learningModuleId !== null) {
      newModule = await this.prisma.learningModule.findUnique({
        where: { id: learningModuleId },
        select: { id: true, name: true, semesterId: true },
      });
      if (!newModule) throw new NotFoundException('Learning module not found');
    }

    // ─── Détection de réaffectation risquée ──────────────────────────────────
    let warning: string | null = null;

    if (
      student.learningModuleId &&
      student.learningModuleId !== learningModuleId
    ) {
      // L'étudiant avait déjà un module — vérifier s'il a des soumissions dedans
      const submissionsInCurrentModule = await this.prisma.submission.count({
        where: {
          studentId,
          assignment: {
            course: {
              learningModuleId: student.learningModuleId,
            },
          },
        },
      });

      if (submissionsInCurrentModule > 0) {
        // Vérifier si les deux modules sont dans le même semestre (cas le plus risqué)
        const currentModule = await this.prisma.learningModule.findUnique({
          where: { id: student.learningModuleId },
          select: { name: true, semesterId: true },
        });

        const isSameSemester =
          currentModule && newModule
            ? currentModule.semesterId === newModule.semesterId
            : false;

        if (isSameSemester) {
          // ⚠️ Cas le plus risqué : réaffectation dans le même semestre
          // Les stats courantes (getOverview, getCourseAnalytics) seront faussées
          warning = `Attention : cet étudiant a ${submissionsInCurrentModule} soumission(s) dans le module "${currentModule!.name}". ` +
            `Le réaffecter au module "${newModule!.name}" (même semestre) peut fausser les statistiques courantes. ` +
            `Les analytics historiques (évolution des notes) ne sont pas affectées.`;
        } else {
          // Passage au semestre suivant — cas normal, juste informatif
          warning = `Info : cet étudiant a ${submissionsInCurrentModule} soumission(s) dans son module précédent. ` +
            `Les analytics historiques restent correctes.`;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const updated = await this.prisma.user.update({
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
            semester: { select: { id: true, name: true } },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // On retourne toujours l'étudiant mis à jour + le warning éventuel
    return {
      ...updated,
      warning, // null si tout va bien, string si réaffectation risquée
    };
  }

  async unsetModule(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student) throw new NotFoundException('Student not found');
    if (student.role !== 'STUDENT') throw new BadRequestException('User is not a student');

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
            semester: { select: { id: true, name: true } },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
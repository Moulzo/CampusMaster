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
        learningModuleId: true,
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

  async findOne(id: string) {
    const student = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        learningModuleId: true,
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

    if (!student || student.role !== "STUDENT") {
      throw new NotFoundException("Student not found");
    }

    return student;
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

  async getStudentAnalytics(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        learningModule: {
          select: {
            id: true,
            name: true,
            semester: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (!student || student.role !== "STUDENT") {
      throw new NotFoundException("Student not found");
    }

    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId,
        score: { not: null },
      },
      select: {
        id: true,
        score: true,
        submittedAt: true,
        createdAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            dueDate: true,
            course: {
              select: {
                id: true,
                title: true,
                learningModule: {
                  select: {
                    id: true,
                    name: true,
                    semester: {
                      select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    const semesterMap = new Map<
      string,
      {
        semesterId: string;
        semesterName: string;
        startDate: Date | null;
        endDate: Date | null;
        grades: number[];
        subjects: Map<
          string,
          {
            subjectId: string;
            subjectTitle: string;
            grades: number[];
            assignments: Array<{
              assignmentId: string;
              assignmentTitle: string;
              grade: number;
              submittedAt: Date;
              dueDate: Date;
            }>;
          }
        >;
      }
    >();

    // Pré-remplir le semestre courant même sans notes
    const currentSemester = student.learningModule?.semester;
    if (currentSemester && !semesterMap.has(currentSemester.id)) {
      semesterMap.set(currentSemester.id, {
        semesterId: currentSemester.id,
        semesterName: currentSemester.name,
        startDate: currentSemester.startDate,
        endDate: currentSemester.endDate,
        grades: [],
        subjects: new Map(),
      });
    }

    for (const sub of submissions) {
      const semester = sub.assignment.course.learningModule?.semester;
      const subject = sub.assignment.course;
      const rawScore = sub.score;
      const maxScore = sub.assignment.maxScore;

      if (!semester || rawScore === null || !maxScore) continue;

      const normalized = Number(((rawScore / maxScore) * 20).toFixed(2));

      if (!semesterMap.has(semester.id)) {
        semesterMap.set(semester.id, {
          semesterId: semester.id,
          semesterName: semester.name,
          startDate: semester.startDate,
          endDate: semester.endDate,
          grades: [],
          subjects: new Map(),
        });
      }

      const semesterEntry = semesterMap.get(semester.id)!;
      semesterEntry.grades.push(normalized);

      if (!semesterEntry.subjects.has(subject.id)) {
        semesterEntry.subjects.set(subject.id, {
          subjectId: subject.id,
          subjectTitle: subject.title,
          grades: [],
          assignments: [],
        });
      }

      const subjectEntry = semesterEntry.subjects.get(subject.id)!;
      subjectEntry.grades.push(normalized);
      subjectEntry.assignments.push({
        assignmentId: sub.assignment.id,
        assignmentTitle: sub.assignment.title,
        grade: normalized,
        submittedAt: sub.submittedAt,
        dueDate: sub.assignment.dueDate,
      });
    }

    const semesters = Array.from(semesterMap.values())
      .sort((a, b) => {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aTime - bTime;
      })
      .map((semester) => {
      const subjects = Array.from(semester.subjects.values()).map((subject) => ({
        subjectId: subject.subjectId,
        subjectTitle: subject.subjectTitle,
        averageGrade:
          subject.grades.length > 0
            ? Number(
                (
                  subject.grades.reduce((sum, grade) => sum + grade, 0) /
                  subject.grades.length
                ).toFixed(2),
              )
            : null,
        assignments: subject.assignments.sort(
          (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
        ),
      }));

      return {
        semesterId: semester.semesterId,
        semesterName: semester.semesterName,
        averageGrade:
          semester.grades.length > 0
            ? Number(
                (
                  semester.grades.reduce((sum, grade) => sum + grade, 0) /
                  semester.grades.length
                ).toFixed(2),
              )
            : null,
        subjects: subjects.sort((a, b) => a.subjectTitle.localeCompare(b.subjectTitle)),
      };
    });

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
      },
      semesters,
    };
  }
}
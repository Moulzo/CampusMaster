import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

// ─── Logique d'éligibilité ────────────────────────────────────────────────────
//
// Semestre COURANT (startDate <= today <= endDate) :
//   → on utilise module.students (affectation courante, fiable)
//   → permet de détecter les étudiants qui n'ont encore rien soumis
//
// Semestre PASSÉ (ou sans dates) :
//   → on utilise les soumissions comme proxy historique
//   → garantit que les stats restent correctes après réaffectation au semestre suivant
//
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Détermine si un semestre est le semestre courant
  private isCurrent(semester: { startDate: Date | null; endDate: Date | null }): boolean {
    if (!semester.startDate || !semester.endDate) return false;
    const now = new Date();
    return semester.startDate <= now && now <= semester.endDate;
  }

  async getOverview() {
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      users,
      students,
      teachers,
      admins,
      courses,
      assignments,
      resources,
      resourceViews,
      resourceDownloads,
      totalLogins,
      loginsLast7Days,
      activeUsersLast7Days,
      activeUsersLast30Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.TEACHER } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.course.count(),
      this.prisma.assignment.count(),
      this.prisma.courseResource.count(),
      this.prisma.resourceViewEvent.count(),
      this.prisma.resourceDownloadEvent.count(),
      this.prisma.loginEvent.count(),
      this.prisma.loginEvent.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    // Récupérer tous les cours avec leurs infos de semestre
    const coursesData = await this.prisma.course.findMany({
      select: {
        id: true,
        learningModule: {
          select: {
            students: { select: { id: true } },
            semester: {
              select: { startDate: true, endDate: true },
            },
          },
        },
        assignments: {
          select: {
            id: true,
            maxScore: true,
            submissions: {
              select: { studentId: true, score: true },
            },
          },
        },
      },
    });

    let totalExpected = 0;
    let totalDelivered = 0;
    let totalScore = 0;
    let totalScored = 0;
    let totalSubmissions = 0;

    for (const course of coursesData) {
      const semester = course.learningModule?.semester ?? null;
      const current = semester ? this.isCurrent(semester) : false;

      // Étudiants éligibles selon le type de semestre
      const eligibleStudentIds: Set<string> = current
        ? // Semestre courant → affectation courante
          new Set(course.learningModule?.students.map((s) => s.id) ?? [])
        : // Semestre passé → étudiants ayant soumis (proxy historique)
          new Set(
            course.assignments.flatMap((a) => a.submissions.map((s) => s.studentId)),
          );

      const assignmentCount = course.assignments.length;
      totalExpected += eligibleStudentIds.size * assignmentCount;

      for (const assignment of course.assignments) {
        const eligibleSubs = assignment.submissions.filter((s) =>
          eligibleStudentIds.has(s.studentId),
        );

        // Rendus uniques pour ce devoir
        const uniqueStudents = new Set(eligibleSubs.map((s) => s.studentId));
        totalDelivered += uniqueStudents.size;
        totalSubmissions += eligibleSubs.length;

        for (const sub of eligibleSubs) {
          if (sub.score !== null) {
            totalScore += (sub.score / assignment.maxScore) * 20;
            totalScored++;
          }
        }
      }
    }

    const submissionRate =
      totalExpected > 0
        ? Number(((totalDelivered / totalExpected) * 100).toFixed(2))
        : null;

    const globalAverage =
      totalScored > 0 ? Number((totalScore / totalScored).toFixed(2)) : null;

    return {
      totals: {
        users,
        students,
        teachers,
        admins,
        courses,
        assignments,
        submissions: totalSubmissions,
        resources,
        resourceViews,
        resourceDownloads,
        totalLogins,
        loginsLast7Days,
        activeUsersLast7Days,
        activeUsersLast30Days,
      },
      kpis: {
        expectedSubmissions: totalExpected,
        deliveredAssignments: totalDelivered,
        submissionRate,
        globalAverage,
      },
    };
  }

  async getCourseAnalytics() {
    const courses = await this.prisma.course.findMany({
      select: {
        id: true,
        title: true,
        learningModuleId: true,
        learningModule: {
          select: {
            id: true,
            name: true,
            students: { select: { id: true } },
            semester: {
              select: { id: true, name: true, startDate: true, endDate: true },
            },
          },
        },
        assignments: {
          select: {
            id: true,
            maxScore: true,
            submissions: {
              select: { id: true, studentId: true, score: true },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    return courses.map((course) => {
      const semester = course.learningModule?.semester ?? null;
      const current = semester ? this.isCurrent(semester) : false;

      // Étudiants éligibles selon le type de semestre
      const eligibleStudentIds: Set<string> = current
        ? new Set(course.learningModule?.students.map((s) => s.id) ?? [])
        : new Set(
            course.assignments.flatMap((a) => a.submissions.map((s) => s.studentId)),
          );

      const studentCount = eligibleStudentIds.size;
      const assignmentCount = course.assignments.length;
      const expectedSubmissions = studentCount * assignmentCount;

      const allSubmissions = course.assignments.flatMap((a) =>
        a.submissions
          .filter((s) => eligibleStudentIds.has(s.studentId))
          .map((s) => ({ ...s, assignmentId: a.id, maxScore: a.maxScore })),
      );

      const submissionCount = allSubmissions.length;

      const uniqueKeys = new Set(
        allSubmissions.map((s) => `${s.assignmentId}:${s.studentId}`),
      );
      const deliveredAssignmentCount = uniqueKeys.size;

      const submissionRate =
        expectedSubmissions > 0
          ? Number(((deliveredAssignmentCount / expectedSubmissions) * 100).toFixed(2))
          : null;

      const scoredSubmissions = allSubmissions.filter((s) => s.score !== null);
      const averageScore =
        scoredSubmissions.length > 0
          ? Number(
              (
                scoredSubmissions.reduce((sum, s) => sum + (s.score! / s.maxScore) * 20, 0) /
                scoredSubmissions.length
              ).toFixed(2),
            )
          : null;

      return {
        courseId: course.id,
        courseTitle: course.title,
        learningModuleId: course.learningModuleId,
        learningModuleName: course.learningModule?.name ?? null,
        semesterId: semester?.id ?? null,
        semesterName: semester?.name ?? null,
        isCurrent: current,
        studentCount,
        assignmentCount,
        submissionCount,
        deliveredAssignmentCount,
        expectedSubmissions,
        submissionRate,
        averageGrade: averageScore,
      };
    });
  }

  async getGradesEvolution() {
    const semesters = await this.prisma.semester.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        learningModules: {
          select: {
            id: true,
            name: true,
            students: { select: { id: true } },
            subjects: {
              select: {
                id: true,
                assignments: {
                  select: {
                    id: true,
                    dueDate: true,
                    maxScore: true,
                    submissions: {
                      select: { studentId: true, score: true, submittedAt: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return semesters.map((semester) => {
      const current = this.isCurrent(semester);
      const allScoredGrades: number[] = [];
      let totalUncorrected = 0;
      let totalLate = 0;
      let totalDelivered = 0;
      let totalExpected = 0;

      const moduleBreakdown = semester.learningModules.map((module) => {
        const moduleScoredGrades: number[] = [];
        let moduleUncorrected = 0;
        let moduleLate = 0;
        let moduleDelivered = 0;

        // Étudiants éligibles selon semestre courant ou passé
        const eligibleStudentIds: Set<string> = current
          ? new Set(module.students.map((s) => s.id))
          : new Set(
              module.subjects.flatMap((course) =>
                course.assignments.flatMap((a) => a.submissions.map((s) => s.studentId)),
              ),
            );

        const totalAssignmentsInModule = module.subjects.reduce(
          (sum, course) => sum + course.assignments.length,
          0,
        );
        const moduleExpected = eligibleStudentIds.size * totalAssignmentsInModule;

        for (const course of module.subjects) {
          for (const assignment of course.assignments) {
            const eligibleSubs = assignment.submissions.filter((s) =>
              eligibleStudentIds.has(s.studentId),
            );

            const uniqueStudents = new Set(eligibleSubs.map((s) => s.studentId));
            moduleDelivered += uniqueStudents.size;

            for (const sub of eligibleSubs) {
              if (sub.submittedAt > assignment.dueDate) {
                totalLate++;
                moduleLate++;
              }
              if (sub.score === null) {
                totalUncorrected++;
                moduleUncorrected++;
              } else {
                const normalized = (sub.score / assignment.maxScore) * 20;
                moduleScoredGrades.push(normalized);
                allScoredGrades.push(normalized);
              }
            }
          }
        }

        totalDelivered += moduleDelivered;
        totalExpected += moduleExpected;

        const moduleAvg =
          moduleScoredGrades.length > 0
            ? Number(
                (moduleScoredGrades.reduce((a, b) => a + b, 0) / moduleScoredGrades.length).toFixed(2),
              )
            : null;

        const moduleRate =
          moduleExpected > 0
            ? Number(((moduleDelivered / moduleExpected) * 100).toFixed(2))
            : null;

        return {
          moduleId: module.id,
          moduleName: module.name,
          averageGrade: moduleAvg,
          gradedCount: moduleScoredGrades.length,
          uncorrectedCount: moduleUncorrected,
          lateCount: moduleLate,
          deliveredCount: moduleDelivered,
          expectedCount: moduleExpected,
          submissionRate: moduleRate,
        };
      });

      const semesterAvg =
        allScoredGrades.length > 0
          ? Number(
              (allScoredGrades.reduce((a, b) => a + b, 0) / allScoredGrades.length).toFixed(2),
            )
          : null;

      const submissionRate =
        totalExpected > 0
          ? Number(((totalDelivered / totalExpected) * 100).toFixed(2))
          : null;

      return {
        semesterId: semester.id,
        semesterName: semester.name,
        isCurrent: current,
        averageGrade: semesterAvg,
        submissionRate,
        totalGraded: allScoredGrades.length,
        totalUncorrected,
        totalLate,
        totalExpected,
        totalDelivered,
        moduleBreakdown,
      };
    });
  }

  async getWeeklyActivity(filters?: { semesterId?: string; moduleId?: string }) {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        ...(filters?.moduleId
          ? {
              course: {
                learningModuleId: filters.moduleId,
              },
            }
          : {}),
        ...(filters?.semesterId
          ? {
              course: {
                learningModule: {
                  semesterId: filters.semesterId,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        dueDate: true,
        course: {
          select: {
            id: true,
            title: true,
            learningModule: {
              select: {
                id: true,
                name: true,
                students: { select: { id: true } },
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
        submissions: {
          select: {
            id: true,
            studentId: true,
            score: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    type WeekBucket = {
      weekKey: string;
      label: string;
      submissionCount: number;
      uniqueSubmissionCount: number;
      gradedCount: number;
      lateCount: number;
      uniqueKeys: Set<string>;
    };

    const buckets = new Map<string, WeekBucket>();

    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day; // lundi = début de semaine
      d.setDate(d.getDate() + diff);
      return d;
    };

    const toWeekKey = (date: Date) => {
      const start = getWeekStart(date);
      return start.toISOString().slice(0, 10);
    };

    const toWeekLabel = (date: Date) => {
      const start = getWeekStart(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
    };

    for (const assignment of assignments) {
      const semester = assignment.course.learningModule?.semester ?? null;
      const current = semester ? this.isCurrent(semester) : false;

      const eligibleStudentIds: Set<string> = current
        ? new Set(assignment.course.learningModule?.students.map((s) => s.id) ?? [])
        : new Set(assignment.submissions.map((s) => s.studentId));

      const eligibleSubs = assignment.submissions.filter((s) =>
        eligibleStudentIds.has(s.studentId),
      );

      for (const sub of eligibleSubs) {
        const submittedAt = sub.submittedAt;
        const weekKey = toWeekKey(submittedAt);
        const uniqueKey = `${assignment.id}:${sub.studentId}`;

        if (!buckets.has(weekKey)) {
          buckets.set(weekKey, {
            weekKey,
            label: toWeekLabel(submittedAt),
            submissionCount: 0,
            uniqueSubmissionCount: 0,
            gradedCount: 0,
            lateCount: 0,
            uniqueKeys: new Set(),
          });
        }

        const bucket = buckets.get(weekKey)!;
        bucket.submissionCount += 1;

        if (sub.score !== null) {
          bucket.gradedCount += 1;
        }

        if (sub.submittedAt > assignment.dueDate) {
          bucket.lateCount += 1;
        }

        bucket.uniqueKeys.add(uniqueKey);
      }
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
      .map((bucket) => ({
        weekKey: bucket.weekKey,
        label: bucket.label,
        submissionCount: bucket.submissionCount,
        uniqueSubmissionCount: bucket.uniqueKeys.size,
        gradedCount: bucket.gradedCount,
        lateCount: bucket.lateCount,
      }));
  }

  async getWeeklyDownloads(filters?: { semesterId?: string; moduleId?: string }) {
    const events = await this.prisma.resourceDownloadEvent.findMany({
      where: {
        resource: {
          course: {
            ...(filters?.moduleId ? { learningModuleId: filters.moduleId } : {}),
            ...(filters?.semesterId
              ? {
                  learningModule: {
                    semesterId: filters.semesterId,
                  },
                }
              : {}),
          },
        },
      },
      select: {
        downloadedAt: true,
      },
      orderBy: { downloadedAt: 'asc' },
    });

    type WeekBucket = {
      weekKey: string;
      label: string;
      downloadCount: number;
    };

    const buckets = new Map<string, WeekBucket>();

    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day; // lundi
      d.setDate(d.getDate() + diff);
      return d;
    };

    const toWeekKey = (date: Date) => {
      const start = getWeekStart(date);
      return start.toISOString().slice(0, 10);
    };

    const toWeekLabel = (date: Date) => {
      const start = getWeekStart(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
    };

    for (const event of events) {
      const weekKey = toWeekKey(event.downloadedAt);

      if (!buckets.has(weekKey)) {
        buckets.set(weekKey, {
          weekKey,
          label: toWeekLabel(event.downloadedAt),
          downloadCount: 0,
        });
      }

      buckets.get(weekKey)!.downloadCount += 1;
    }

    return Array.from(buckets.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  }

  async getWeeklyViews(filters?: { semesterId?: string; moduleId?: string }) {
    const events = await this.prisma.resourceViewEvent.findMany({
      where: {
        resource: {
          course: {
            ...(filters?.moduleId ? { learningModuleId: filters.moduleId } : {}),
            ...(filters?.semesterId
              ? {
                  learningModule: {
                    semesterId: filters.semesterId,
                  },
                }
              : {}),
          },
        },
      },
      select: {
        viewedAt: true,
      },
      orderBy: { viewedAt: 'asc' },
    });

    type WeekBucket = {
      weekKey: string;
      label: string;
      viewCount: number;
    };

    const buckets = new Map<string, WeekBucket>();

    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day; // lundi
      d.setDate(d.getDate() + diff);
      return d;
    };

    const toWeekKey = (date: Date) => {
      const start = getWeekStart(date);
      return start.toISOString().slice(0, 10);
    };

    const toWeekLabel = (date: Date) => {
      const start = getWeekStart(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
    };

    for (const event of events) {
      const weekKey = toWeekKey(event.viewedAt);

      if (!buckets.has(weekKey)) {
        buckets.set(weekKey, {
          weekKey,
          label: toWeekLabel(event.viewedAt),
          viewCount: 0,
        });
      }

      buckets.get(weekKey)!.viewCount += 1;
    }

    return Array.from(buckets.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  }

  async getConfigurableKpis() {
    const assignments = await this.prisma.assignment.findMany({
      select: {
        id: true,
        dueDate: true,
        maxScore: true,
        course: {
          select: {
            learningModule: {
              select: {
                students: { select: { id: true } },
                semester: {
                  select: {
                    startDate: true,
                    endDate: true,
                  },
                },
              },
            },
          },
        },
        submissions: {
          select: {
            studentId: true,
            score: true,
            submittedAt: true,
          },
        },
      },
    });

    let expectedCount = 0;
    let deliveredUniqueCount = 0;
    let lateUniqueCount = 0;
    let pendingCorrectionCount = 0;
    let gradedCount = 0;
    let successCount = 0;

    for (const assignment of assignments) {
      const semester = assignment.course.learningModule?.semester ?? null;
      const current = semester ? this.isCurrent(semester) : false;

      const eligibleStudentIds: Set<string> = current
        ? new Set(assignment.course.learningModule?.students.map((s) => s.id) ?? [])
        : new Set(assignment.submissions.map((s) => s.studentId));

      expectedCount += eligibleStudentIds.size;

      const grouped = new Map<
        string,
        Array<{ studentId: string; score: number | null; submittedAt: Date }>
      >();

      for (const sub of assignment.submissions) {
        if (!eligibleStudentIds.has(sub.studentId)) continue;
        if (!grouped.has(sub.studentId)) grouped.set(sub.studentId, []);
        grouped.get(sub.studentId)!.push(sub);
      }

      for (const [, subs] of grouped) {
        if (subs.length === 0) continue;

        subs.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        const latest = subs[0];

        deliveredUniqueCount += 1;

        if (latest.submittedAt > assignment.dueDate) {
          lateUniqueCount += 1;
        }

        if (latest.score === null) {
          pendingCorrectionCount += 1;
        } else {
          gradedCount += 1;
          const normalized = (latest.score / assignment.maxScore) * 20;
          if (normalized >= 10) {
            successCount += 1;
          }
        }
      }
    }

    const attendanceRate =
      expectedCount > 0 ? Number(((deliveredUniqueCount / expectedCount) * 100).toFixed(2)) : null;

    const lateRate =
      deliveredUniqueCount > 0 ? Number(((lateUniqueCount / deliveredUniqueCount) * 100).toFixed(2)) : null;

    const pendingCorrectionRate =
      deliveredUniqueCount > 0
        ? Number(((pendingCorrectionCount / deliveredUniqueCount) * 100).toFixed(2))
        : null;

    const successRate =
      gradedCount > 0 ? Number(((successCount / gradedCount) * 100).toFixed(2)) : null;

    return {
      counts: {
        expectedCount,
        deliveredUniqueCount,
        lateUniqueCount,
        pendingCorrectionCount,
        gradedCount,
        successCount,
      },
      kpis: {
        attendanceRate,
        lateRate,
        pendingCorrectionRate,
        successRate,
      },
    };
  }
}
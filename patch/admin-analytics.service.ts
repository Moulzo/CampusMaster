import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [students, teachers, courses, assignments, allSubmissions, expectedSubmissions, coursesData] =
      await Promise.all([
        this.prisma.user.count({ where: { role: Role.STUDENT } }),
        this.prisma.user.count({ where: { role: Role.TEACHER } }),
        this.prisma.course.count(),
        this.prisma.assignment.count(),
        this.prisma.submission.findMany({
          select: { id: true, studentId: true, assignmentId: true, score: true },
        }),
        this.computeExpectedSubmissions(),
        this.prisma.course.findMany({
          select: {
            id: true,
            learningModule: { select: { students: { select: { id: true } } } },
            students: { select: { id: true } },
            assignments: { select: { id: true } },
          },
        }),
      ]);

    const assignmentEligibleStudentMap = new Map<string, Set<string>>();
    for (const course of coursesData) {
      const eligibleStudentIds = new Set(
        (course.learningModule?.students ?? course.students).map((s) => s.id),
      );
      for (const assignment of course.assignments) {
        assignmentEligibleStudentMap.set(assignment.id, eligibleStudentIds);
      }
    }

    const eligibleSubmissions = allSubmissions.filter((submission) => {
      if (!submission.studentId) return false;
      const eligible = assignmentEligibleStudentMap.get(submission.assignmentId);
      return eligible?.has(submission.studentId) ?? false;
    });

    const uniqueSubmissionKeys = new Set(
      eligibleSubmissions.map((s) => `${s.assignmentId}:${s.studentId}`),
    );
    const deliveredAssignmentCount = uniqueSubmissionKeys.size;

    const scoredEligible = eligibleSubmissions.filter((s) => s.score !== null);
    const totalScore = scoredEligible.reduce((sum, s) => sum + (s.score ?? 0), 0);
    const globalAverage =
      scoredEligible.length > 0
        ? Number((totalScore / scoredEligible.length).toFixed(2))
        : null;

    const submissionRate =
      expectedSubmissions > 0
        ? Number(((deliveredAssignmentCount / expectedSubmissions) * 100).toFixed(2))
        : null;

    return {
      totals: { students, teachers, courses, assignments, submissions: allSubmissions.length },
      kpis: { expectedSubmissions, deliveredAssignments: deliveredAssignmentCount, submissionRate, globalAverage },
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
            semester: { select: { id: true, name: true } },
            students: { select: { id: true } },
          },
        },
        students: { select: { id: true } },
        assignments: {
          select: {
            id: true,
            submissions: { select: { id: true, studentId: true, score: true } },
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    return courses.map((course) => {
      const eligibleStudentIds = new Set(
        (course.learningModule?.students ?? course.students).map((s) => s.id),
      );
      const studentCount = eligibleStudentIds.size;
      const assignmentCount = course.assignments.length;

      const allSubmissions = course.assignments.flatMap((a) =>
        a.submissions.map((s) => ({ ...s, assignmentId: a.id })),
      );

      const submissionCount = allSubmissions.length;
      const eligibleSubmissions = allSubmissions.filter(
        (s) => !!s.studentId && eligibleStudentIds.has(s.studentId),
      );

      const uniqueKeys = new Set(eligibleSubmissions.map((s) => `${s.assignmentId}:${s.studentId}`));
      const deliveredAssignmentCount = uniqueKeys.size;

      const scoredEligible = eligibleSubmissions.filter((s) => s.score !== null);
      const averageScore =
        scoredEligible.length > 0
          ? Number(
              (scoredEligible.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredEligible.length).toFixed(2),
            )
          : null;

      const expectedSubmissions = studentCount * assignmentCount;
      const submissionRate =
        expectedSubmissions > 0
          ? Number(((deliveredAssignmentCount / expectedSubmissions) * 100).toFixed(2))
          : null;

      return {
        courseId: course.id,
        courseTitle: course.title,
        learningModuleId: course.learningModuleId,
        learningModuleName: course.learningModule?.name ?? null,
        semesterId: course.learningModule?.semester?.id ?? null,
        semesterName: course.learningModule?.semester?.name ?? null,
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

  // ✅ NOUVEAU : Évolution des moyennes par semestre
  async getGradesEvolution() {
    const semesters = await this.prisma.semester.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        learningModules: {
          select: {
            id: true,
            name: true,
            students: { select: { id: true } },
            subjects: {
              select: {
                id: true,
                title: true,
                students: { select: { id: true } },
                assignments: {
                  select: {
                    id: true,
                    title: true,
                    dueDate: true,
                    maxScore: true,
                    submissions: {
                      select: {
                        studentId: true,
                        score: true,
                        submittedAt: true,
                        correctedAt: true,
                      },
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
      // Agrégation de toutes les soumissions notées du semestre
      const allScoredSubmissions: { score: number; studentId: string; assignmentId?: string }[] = [];
      let totalUncorrected = 0;
      let totalLate = 0;
      let totalExpected = 0;
      let totalDelivered = 0;

      const moduleBreakdown = semester.learningModules.map((module) => {
        const moduleEligibleStudents = new Set(module.students.map((s) => s.id));
        const moduleScoredSubmissions: number[] = [];
        let moduleUncorrected = 0;
        let moduleLate = 0;

        for (const course of module.subjects) {
          const eligibleIds =
            moduleEligibleStudents.size > 0
              ? moduleEligibleStudents
              : new Set(course.students.map((s) => s.id));

          const expectedForCourse = eligibleIds.size * course.assignments.length;
          totalExpected += expectedForCourse;

          for (const assignment of course.assignments) {
            const eligibleSubs = assignment.submissions.filter(
              (s) => s.studentId && eligibleIds.has(s.studentId),
            );

            // Rendus uniques
            const uniqueKeys = new Set(eligibleSubs.map((s) => s.studentId));
            totalDelivered += uniqueKeys.size;

            for (const sub of eligibleSubs) {
              // Retards
              if (sub.submittedAt > assignment.dueDate) {
                totalLate++;
                moduleLate++;
              }

              // Non corrigés
              if (sub.score === null) {
                totalUncorrected++;
                moduleUncorrected++;
              } else {
                // Normaliser sur 20
                const normalized = (sub.score / assignment.maxScore) * 20;
                moduleScoredSubmissions.push(normalized);
                allScoredSubmissions.push({
                  score: normalized,
                  studentId: sub.studentId,
                });
              }
            }
          }
        }

        const moduleAvg =
          moduleScoredSubmissions.length > 0
            ? Number(
                (moduleScoredSubmissions.reduce((a, b) => a + b, 0) / moduleScoredSubmissions.length).toFixed(2),
              )
            : null;

        return {
          moduleId: module.id,
          moduleName: module.name,
          averageGrade: moduleAvg,
          gradedCount: moduleScoredSubmissions.length,
          uncorrectedCount: moduleUncorrected,
          lateCount: moduleLate,
        };
      });

      const semesterAvg =
        allScoredSubmissions.length > 0
          ? Number(
              (allScoredSubmissions.reduce((sum, s) => sum + s.score, 0) / allScoredSubmissions.length).toFixed(2),
            )
          : null;

      const submissionRate =
        totalExpected > 0
          ? Number(((totalDelivered / totalExpected) * 100).toFixed(2))
          : null;

      return {
        semesterId: semester.id,
        semesterName: semester.name,
        averageGrade: semesterAvg,
        submissionRate,
        totalGraded: allScoredSubmissions.length,
        totalUncorrected,
        totalLate,
        totalExpected,
        totalDelivered,
        moduleBreakdown,
      };
    });
  }

  private async computeExpectedSubmissions(): Promise<number> {
    const courses = await this.prisma.course.findMany({
      select: {
        learningModuleId: true,
        learningModule: { select: { students: { select: { id: true } } } },
        students: { select: { id: true } },
        assignments: { select: { id: true } },
      },
    });

    return courses.reduce((sum, course) => {
      const studentCount = course.learningModule?.students.length ?? course.students.length;
      return sum + studentCount * course.assignments.length;
    }, 0);
  }
}

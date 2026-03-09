import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
  const [students, teachers, courses, assignments, allSubmissions, expectedSubmissions, coursesData] =
    await Promise.all([
      this.prisma.user.count({
        where: { role: Role.STUDENT },
      }),
      this.prisma.user.count({
        where: { role: Role.TEACHER },
      }),
      this.prisma.course.count(),
      this.prisma.assignment.count(),
      this.prisma.submission.findMany({
        select: {
          id: true,
          studentId: true,
          assignmentId: true,
          score: true,
        },
      }),
      this.computeExpectedSubmissions(),
      this.prisma.course.findMany({
        select: {
          id: true,
          learningModule: {
            select: {
              students: {
                select: { id: true },
              },
            },
          },
          students: {
            select: { id: true },
          },
          assignments: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

  const assignmentEligibleStudentMap = new Map<string, Set<string>>();

  for (const course of coursesData) {
    const eligibleStudentIds = new Set(
      (course.learningModule?.students ?? course.students).map((student) => student.id),
    );

    for (const assignment of course.assignments) {
      assignmentEligibleStudentMap.set(assignment.id, eligibleStudentIds);
    }
  }

  const eligibleSubmissions = allSubmissions.filter((submission) => {
    if (!submission.studentId) return false;
    const eligibleStudents = assignmentEligibleStudentMap.get(submission.assignmentId);
    return eligibleStudents?.has(submission.studentId) ?? false;
  });

  const uniqueSubmissionKeys = new Set(
    eligibleSubmissions.map(
      (submission) => `${submission.assignmentId}:${submission.studentId}`,
    ),
  );

  const deliveredAssignmentCount = uniqueSubmissionKeys.size;

  const scoredEligibleSubmissions = eligibleSubmissions.filter(
    (submission) => submission.score !== null,
  );

  const totalScore = scoredEligibleSubmissions.reduce((sum, submission) => {
    return sum + (submission.score ?? 0);
  }, 0);

  const globalAverage =
    scoredEligibleSubmissions.length > 0
      ? Number((totalScore / scoredEligibleSubmissions.length).toFixed(2))
      : null;

  const submissionRate =
    expectedSubmissions > 0
      ? Number(((deliveredAssignmentCount / expectedSubmissions) * 100).toFixed(2))
      : null;

  return {
    totals: {
      students,
      teachers,
      courses,
      assignments,
      submissions: allSubmissions.length, // nombre brut de versions déposées
    },
    kpis: {
      expectedSubmissions,
      deliveredAssignments: deliveredAssignmentCount, // rendus uniques + filtrés
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
          semester: {
            select: {
              id: true,
              name: true,
            },
          },
          students: {
            select: {
              id: true,
            },
          },
        },
      },
      students: {
        select: {
          id: true,
        },
      },
      assignments: {
        select: {
          id: true,
          submissions: {
            select: {
              id: true,
              studentId: true,
              score: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });

  return courses.map((course) => {
    const eligibleStudentIds = new Set(
      (course.learningModule?.students ?? course.students).map((student) => student.id),
    );

    const studentCount = eligibleStudentIds.size;
    const assignmentCount = course.assignments.length;

    const allSubmissions = course.assignments.flatMap((assignment) =>
      assignment.submissions.map((submission) => ({
        ...submission,
        assignmentId: assignment.id,
      })),
    );

    const submissionCount = allSubmissions.length; // nombre brut de versions

    const eligibleSubmissions = allSubmissions.filter(
      (submission) =>
        !!submission.studentId && eligibleStudentIds.has(submission.studentId),
    );

    const uniqueSubmissionKeys = new Set(
      eligibleSubmissions.map(
        (submission) => `${submission.assignmentId}:${submission.studentId}`,
      ),
    );

    const deliveredAssignmentCount = uniqueSubmissionKeys.size;

    const scoredEligibleSubmissions = eligibleSubmissions.filter(
      (submission) => submission.score !== null,
    );

    const averageScore =
      scoredEligibleSubmissions.length > 0
        ? Number(
            (
              scoredEligibleSubmissions.reduce(
                (sum, submission) => sum + (submission.score ?? 0),
                0,
              ) / scoredEligibleSubmissions.length
            ).toFixed(2),
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
      submissionCount, // versions totales
      deliveredAssignmentCount, // rendus uniques + filtrés sur éligibles
      expectedSubmissions,
      submissionRate,
      averageGrade: averageScore,
    };
  });
}

  private async computeExpectedSubmissions(): Promise<number> {
    const courses = await this.prisma.course.findMany({
      select: {
        id: true,
        learningModuleId: true,
        learningModule: {
          select: {
            students: {
              select: { id: true },
            },
          },
        },
        students: {
          select: { id: true },
        },
        assignments: {
          select: { id: true },
        },
      },
    });

    return courses.reduce((sum, course) => {
      const studentCount =
        course.learningModule?.students.length ?? course.students.length;

      return sum + studentCount * course.assignments.length;
    }, 0);
  }
}

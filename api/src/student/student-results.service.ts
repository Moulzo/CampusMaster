import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { SemesterResultsDto } from "./dto/semester-results.dto";

@Injectable()
export class StudentResultsService {
  constructor(private prisma: PrismaService) {}

  async getSemesterResults(studentId: string, semesterId?: string): Promise<SemesterResultsDto> {
    // 1) Charger l'étudiant + module + semestre
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        role: true,
        learningModuleId: true,
        learningModule: {
          select: {
            id: true,
            name: true,
            semesterId: true,
            semester: { 
              select: { 
                id: true, 
                name: true, 
                startDate: true, 
                endDate: true 
              } 
            },
          },
        },
      },
    });

    if (!student) throw new NotFoundException("Étudiant introuvable");
    if (!student.learningModuleId || !student.learningModule) {
      throw new ForbiddenException("Aucun module n'est affecté à cet étudiant");
    }

    const activeSemesterId = student.learningModule.semesterId;

    // MVP: si semesterId fourni, on n'autorise que le semestre "actif"
    const targetSemesterId = semesterId ?? activeSemesterId;
    if (targetSemesterId !== activeSemesterId) {
      throw new ForbiddenException("Accès interdit à ce semestre (pas d'historique d'affectation)");
    }

    // 2) Récupérer les cours du module (matières)
    const courses = await this.prisma.course.findMany({
      where: { learningModuleId: student.learningModuleId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });

    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) {
      const courseResults = courses.map((course) => ({
        courseId: course.id,
        title: course.title,
        average: null,
        gradedCount: 0,
        pendingCount: 0,
        missingCount: 0,
        totalAssignments: 0,
      }));

      return {
        semester: {
          id: student.learningModule.semester.id,
          name: student.learningModule.semester.name,
          startDate: student.learningModule.semester.startDate?.toISOString() ?? null,
          endDate: student.learningModule.semester.endDate?.toISOString() ?? null,
        },
        module: { id: student.learningModule.id, name: student.learningModule.name },
        overallAverage: null,
        courses: courseResults,
      };
    }

    // 3) Charger les devoirs de ces cours
    const assignments = await this.prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true },
    });

    const assignmentIds = assignments.map((a) => a.id);

    // 4) Si 0 devoirs, retourner les cours avec totalAssignments 0
    if (assignmentIds.length === 0) {
      const courseResults = courses.map((course) => ({
        courseId: course.id,
        title: course.title,
        average: null,
        gradedCount: 0,
        pendingCount: 0,
        missingCount: 0,
        totalAssignments: 0,
      }));

      return {
        semester: {
          id: student.learningModule.semester.id,
          name: student.learningModule.semester.name,
          startDate: student.learningModule.semester.startDate?.toISOString() ?? null,
          endDate: student.learningModule.semester.endDate?.toISOString() ?? null,
        },
        module: { id: student.learningModule.id, name: student.learningModule.name },
        overallAverage: null,
        courses: courseResults,
      };
    }

    // 5) Charger les submissions de l'étudiant pour ces devoirs (1 max par devoir via @@unique)
    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId,
        assignmentId: { in: assignmentIds },
      },
      select: { assignmentId: true, score: true },
    });

    // Index pour lookup rapide
    const submissionsByAssignmentId = new Map(submissions.map((s) => [s.assignmentId, s]));

    // Regrouper devoirs par cours
    const assignmentsByCourseId = new Map<string, string[]>();
    for (const a of assignments) {
      const arr = assignmentsByCourseId.get(a.courseId) ?? [];
      arr.push(a.id);
      assignmentsByCourseId.set(a.courseId, arr);
    }

    // 5) Calcul par matière
    const courseResults: SemesterResultsDto["courses"] = courses.map((course) => {
      const aIds = assignmentsByCourseId.get(course.id) ?? [];
      let gradedCount = 0;
      let pendingCount = 0;
      let missingCount = 0;

      let sum = 0;
      let countForAvg = 0;

      for (const aid of aIds) {
        const sub = submissionsByAssignmentId.get(aid);
        if (!sub) {
          missingCount += 1;
          continue;
        }
        if (sub.score == null) {
          pendingCount += 1;
          continue;
        }
        gradedCount += 1;
        sum += sub.score; // score déjà sur 20
        countForAvg += 1;
      }

      const average =
        countForAvg > 0 ? Math.round((sum / countForAvg) * 10) / 10 : null; // 1 décimale

      return {
        courseId: course.id,
        title: course.title,
        average,
        gradedCount,
        pendingCount,
        missingCount,
        totalAssignments: aIds.length,
      };
    });

    // 6) Moyenne semestrielle = moyenne des moyennes matières disponibles
    const avgs = courseResults.map((c) => c.average).filter((v): v is number => typeof v === "number");
    const overallAverage =
      avgs.length > 0 ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null;

    return {
      semester: {
        id: student.learningModule.semester.id,
        name: student.learningModule.semester.name,
        startDate: student.learningModule.semester.startDate?.toISOString() ?? null,
        endDate: student.learningModule.semester.endDate?.toISOString() ?? null,
      },
      module: { id: student.learningModule.id, name: student.learningModule.name },
      overallAverage,
      courses: courseResults,
    };
  }
}

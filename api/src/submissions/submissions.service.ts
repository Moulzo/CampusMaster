import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private async assertStudentCanAccessCourse(studentId: string, courseId: string): Promise<boolean> {
    const [student, course] = await Promise.all([
      this.prisma.user.findUnique({ 
        where: { id: studentId }, 
        select: { learningModuleId: true } 
      }),
      this.prisma.course.findUnique({ 
        where: { id: courseId }, 
        select: { learningModuleId: true } 
      }),
    ]);

    if (!student || !student.learningModuleId) return false;
    if (!course || !course.learningModuleId) return false;

    return student.learningModuleId === course.learningModuleId;
  }

  async create(assignmentId: string, studentId: string, fileUrl?: string) {
  const assignment = await this.prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      courseId: true,
      dueDate: true,
      course: { select: { learningModuleId: true } },
    },
  });

  if (!assignment) throw new NotFoundException("Assignment not found");

  const student = await this.prisma.user.findUnique({
    where: { id: studentId },
    select: { role: true, learningModuleId: true },
  });

  if (!student || student.role !== "STUDENT") {
    throw new ForbiddenException("User is not a student");
  }

  const ok =
    !!student.learningModuleId &&
    !!assignment.course.learningModuleId &&
    student.learningModuleId === assignment.course.learningModuleId;

  if (!ok) {
    throw new ForbiddenException("You are not allowed to submit for this course (module mismatch)");
  }

    const existing = await this.prisma.submission.findUnique({
      where: {
        studentId_assignmentId: {
          studentId,
          assignmentId,
        },
      },
      select: { id: true, correctedAt: true, fileUrls: true },
    });

    if (existing?.correctedAt) {
      throw new ForbiddenException('Submission is already corrected');
    }

    // Gérer les fichiers : si fileUrl est une chaîne JSON, la parser
    interface FileInfo {
      url: string;
      name: string;
      size: number;
      type: string;
    }
    
    let filesArray: FileInfo[] = [];
    if (fileUrl) {
      try {
        // Essayer de parser comme JSON
        const parsed = JSON.parse(fileUrl);
        if (Array.isArray(parsed)) {
          filesArray = parsed as FileInfo[];
        } else {
          // Si c'est une simple chaîne (compatibilité ancien format)
          filesArray = [{ url: fileUrl, name: 'file', size: 0, type: 'application/octet-stream' }];
        }
      } catch {
        // Si ce n'est pas du JSON, utiliser comme simple URL (compatibilité)
        filesArray = [{ url: fileUrl, name: 'file', size: 0, type: 'application/octet-stream' }];
      }
    }

    return this.prisma.submission.upsert({
      where: {
        studentId_assignmentId: {
          studentId,
          assignmentId,
        },
      },
      create: {
        assignmentId,
        studentId,
        fileUrls: JSON.stringify(filesArray),
      },
      update: {
        fileUrls: JSON.stringify(filesArray),
        submittedAt: new Date(),
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            maxScore: true,
            attachmentUrl: true,
            attachmentName: true,
            attachmentSize: true,
            attachmentMimeType: true,
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
            teachers: { select: { id: true } },
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

    if (role === 'TEACHER') {
      const isTeacher = assignment.course.teachers.some(t => t.id === userId);
      if (isTeacher) return assignment.submissions;
    }

    if (role === 'STUDENT') {
      // ✅ autorisé uniquement si le devoir est dans un cours du module de l'étudiant
      const [student, course] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { learningModuleId: true, role: true },
        }),
        this.prisma.course.findUnique({
          where: { id: assignment.course.id },
          select: { learningModuleId: true },
        }),
      ]);

      const ok =
        student?.role === "STUDENT" &&
        !!student.learningModuleId &&
        !!course?.learningModuleId &&
        student.learningModuleId === course.learningModuleId;

      if (ok) {
        return assignment.submissions.filter((s) => s.studentId === userId);
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
                teachers: { select: { id: true } },
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

    if (role === 'TEACHER') {
      const isTeacher = submission.assignment.course.teachers.some(t => t.id === userId);
      if (isTeacher) return submission;
    }

    if (role === 'STUDENT' && submission.studentId === userId) {
      const [student, course] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { learningModuleId: true, role: true },
        }),
        this.prisma.course.findUnique({
          where: { id: submission.assignment.course.id },
          select: { learningModuleId: true },
        }),
      ]);

      const ok =
        student?.role === "STUDENT" &&
        !!student.learningModuleId &&
        !!course?.learningModuleId &&
        student.learningModuleId === course.learningModuleId;

      if (ok) return submission;
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
              select: { teachers: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Seul le teacher du cours peut noter
    const isTeacher = submission.assignment.course.teachers.some(t => t.id === teacherId);
    if (!isTeacher) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    const maxScore = submission.assignment.maxScore ?? 20;
    if (score < 0 || score > maxScore) {
      throw new BadRequestException(`score must be between 0 and ${maxScore}`);
    }

    const updatedSubmission = await this.prisma.submission.update({
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

    // ✅ Déclencher notification "devoir corrigé"
    try {
      if (updatedSubmission.score !== null) {
        await this.notificationsService.notifyNewGrade(
          updatedSubmission.student.id,
          updatedSubmission.assignment.title,
          updatedSubmission.score,
          maxScore,
          updatedSubmission.assignment.course.id,
          updatedSubmission.assignment.id,
        );
      }
    } catch (e) {
      // Log uniquement - ne pas casser la logique métier
      console.error('Failed to send grade notification:', e);
    }

    return updatedSubmission; // ✅ IMPORTANT
  }

  async upsertAndGrade(input: {
    assignmentId: string;
    studentId: string;
    teacherId: string;
    score: number;
    feedback?: string;
  }) {
    // (optionnel mais recommandé) vérifier que teacher a bien accès à ce course/assignment
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: input.assignmentId },
      select: { id: true, courseId: true },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");

    const now = new Date();

    const submission = await this.prisma.submission.upsert({
      where: {
        studentId_assignmentId: {
          studentId: input.studentId,
          assignmentId: input.assignmentId,
        },
      },
      create: {
        studentId: input.studentId,
        assignmentId: input.assignmentId,
        fileUrls: null,          // "sans fichier"
        submittedAt: now,        // trace (tu peux aussi mettre null si tu préfères)
        score: input.score,
        feedback: input.feedback ?? null,
        correctedAt: now,
      },
      update: {
        score: input.score,
        feedback: input.feedback ?? null,
        correctedAt: now,
      },
      select: {
        id: true,
        studentId: true,
        assignmentId: true,
        score: true,
        feedback: true,
        submittedAt: true,
        correctedAt: true,
        student: { select: { id: true, email: true, fullName: true } },
      },
    });

    return submission;
  }
}

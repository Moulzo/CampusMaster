import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { NotificationsService } from '../notifications/notifications.service';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

@Injectable()
export class AssignmentsService {
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

  async create(createAssignmentDto: CreateAssignmentDto, teacherId: string) {
    // Vérifier que le teacher est bien le teacher du cours
    const course = await this.prisma.course.findUnique({
      where: { id: createAssignmentDto.courseId },
      include: { teachers: { select: { id: true } } },
    });

    if (!course) throw new NotFoundException('Course not found');

    const dueDate = new Date(createAssignmentDto.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('dueDate must be a valid date');
    }

    if (dueDate.getTime() <= Date.now()) {
      throw new BadRequestException('dueDate must be in the future');
    }

    const isTeacher = course.teachers.some(t => t.id === teacherId);
    if (!isTeacher) {
      throw new ForbiddenException('You are not teacher of this course');
    }

    const maxScore = createAssignmentDto.maxScore ?? 20;
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) {
      throw new BadRequestException('maxScore must be between 1 and 1000');
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        title: createAssignmentDto.title,
        description: createAssignmentDto.description ?? null,
        dueDate,
        maxScore,
        courseId: createAssignmentDto.courseId,
        teacherId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            learningModuleId: true,
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

    console.log(`[AssignmentsService] Assignment created: ${assignment.id} - ${assignment.title}`);

    // Send notifications to students of the module (after assignment is created)
    if (assignment.course?.learningModuleId) {
      const recipients = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
          learningModuleId: assignment.course.learningModuleId,
          id: { not: teacherId }, // ✅ safety: éviter de notifier le prof s'il est aussi STUDENT
        },
        select: { id: true },
      });

      console.log(`[AssignmentsService] Sending notifications to ${recipients.length} students in module ${assignment.course.learningModuleId}`);

      await Promise.all(
        recipients.map((u) =>
          this.notificationsService.notifyNewAssignment(
            u.id,
            assignment.title,
            assignment.course?.title || 'Cours inconnu',
            assignment.courseId,  // ✅ Ajouté
            assignment.id,
          ),
        ),
      );
    } else {
      console.log(`[AssignmentsService] No learning module found for course ${assignment.course?.id}`);
    }

    return assignment;
  }

  async findAll(userId: string, role: Role, courseId?: string) {
    const studentIdForSubmissions = role === 'STUDENT' ? userId : undefined;

    // Si courseId est spécifié, vérifier l'accès
    if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: { teachers: { select: { id: true } } },
      });

      if (!course) throw new NotFoundException('Course not found');

      // ADMIN: tous les devoirs du cours
      if (role === 'ADMIN') {
        return this.getAssignmentsWithRelations({ courseId, studentIdForSubmissions });
      }

      // TEACHER: seulement si c'est son cours
      if (role === 'TEACHER') {
        const isTeacher = course.teachers.some(t => t.id === userId);
        if (isTeacher) {
          return this.getAssignmentsWithRelations({ courseId, studentIdForSubmissions });
        }
      }

      // STUDENT: seulement si inscrit au cours (via module)
      if (role === 'STUDENT') {
        const canAccess = await this.assertStudentCanAccessCourse(userId, courseId);
        if (canAccess) {
          return this.getAssignmentsWithRelations({ courseId, studentIdForSubmissions });
        }
      }
    }

    // Sans courseId spécifique
    // ADMIN: tous les devoirs
    if (role === 'ADMIN') {
      return this.getAssignmentsWithRelations({ studentIdForSubmissions });
    }

    // TEACHER: devoirs des cours où il enseigne (multi-teacher support)
    if (role === 'TEACHER') {
      return this.getAssignmentsWithRelations({
        courseTeacherId: userId,
        studentIdForSubmissions,
      });
    }

    // STUDENT: devoirs des cours où il est inscrit
    return this.getAssignmentsWithRelations({
      studentId: userId,
      studentIdForSubmissions,
    });
  }

  private async getAssignmentsWithRelations(filter: { 
    courseId?: string;
    studentId?: string;
    teacherId?: string; // legacy: auteur du devoir
    courseTeacherId?: string; // ✅ nouveau: enseigne le cours
    studentIdForSubmissions?: string; // ✅ filtre submissions pour STUDENT
  } = {}) {
    const where: any = {};

    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.teacherId) where.teacherId = filter.teacherId; // legacy si besoin

    // ✅ Pour éviter l'écrasement, on utilise AND: [] si plusieurs conditions sur course
    const courseConditions: any[] = [];

    // ✅ clé de la migration multi-teacher
    if (filter.courseTeacherId) {
      courseConditions.push({
        teachers: { some: { id: filter.courseTeacherId } },
      });
    }

    // ✅ filtre pour les étudiants
    if (filter.studentId) {
      courseConditions.push({
        students: { some: { id: filter.studentId } },
      });
    }

    // Si on a des conditions sur course, on les combine avec AND
    if (courseConditions.length > 0) {
      where.course = {
        AND: courseConditions,
      };
    }

    return this.prisma.assignment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            learningModule: {
              select: {
                students: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            teachers: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        submissions: {
          where: filter.studentIdForSubmissions ? { studentId: filter.studentIdForSubmissions } : undefined,
          include: {
            student: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
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
      return assignment;
    }

    if (role === 'TEACHER') {
      const isTeacher = assignment.course.teachers.some(t => t.id === userId);
      if (isTeacher) return assignment;
    }

    if (role === 'STUDENT') {
      // Vérifier que l'étudiant a accès au cours via module
      const canAccess = await this.assertStudentCanAccessCourse(userId, assignment.courseId);
      if (canAccess) {
        return assignment;
      }
    }

    throw new ForbiddenException('Access denied');
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: { teachers: { select: { id: true } } },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const isTeacher = assignment.course.teachers.some(t => t.id === teacherId);
    if (!isTeacher) {
      throw new ForbiddenException('You are not the teacher of this assignment');
    }

    if (updateAssignmentDto.maxScore !== undefined) {
      const maxScore = updateAssignmentDto.maxScore;
      if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) {
        throw new BadRequestException('maxScore must be between 1 and 1000');
      }
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...updateAssignmentDto,
        ...(updateAssignmentDto.dueDate !== undefined
          ? { dueDate: new Date(updateAssignmentDto.dueDate) }
          : {}),
        ...(updateAssignmentDto.description !== undefined
          ? { description: updateAssignmentDto.description || null }
          : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        submissions: {
          include: {
            student: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: { teachers: { select: { id: true } } },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const isTeacher = assignment.course.teachers.some(t => t.id === teacherId);
    if (!isTeacher) {
      throw new ForbiddenException('You are not the teacher of this assignment');
    }

    return this.prisma.assignment.delete({
      where: { id },
    });
  }
}

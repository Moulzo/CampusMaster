import { Injectable, ForbiddenException, BadRequestException, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSubjectDto, UpdateSubjectDto } from '../admin/dto/admin-subject.dto';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

type SimpleUser = { id: string; email: string; fullName: string };

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  private normalizeTeachersList<T extends { teachers?: any[] | null }>(courses: T[]) {
  return courses.map(c => ({ ...c, teachers: c.teachers ?? [] }));
}

  async create(createCourseDto: CreateCourseDto, teacherId: string) {
    return this.prisma.course.create({
      data: {
        title: createCourseDto.title,
        description: createCourseDto.description ?? null,
        learningModuleId: createCourseDto.learningModuleId ?? null,
        teachers: { connect: [{ id: teacherId }] }, // ✅ nouveau modèle
      } as any, // temporaire pour contourner les types Prisma
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
        students: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, role: Role) {
    // ADMIN: tous les cours
    if (role === 'ADMIN') {
      const courses = await this.prisma.course.findMany({
        include: {
          teachers: { select: { id: true, email: true, fullName: true } },
          learningModule: { include: { semester: true } },
          students: { select: { id: true, email: true, fullName: true } }, // ok pour admin
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.normalizeTeachersList(courses);
    }

    // TEACHER: uniquement ses cours (nouveau modèle)
    if (role === 'TEACHER') {
      const courses = await this.prisma.course.findMany({
        where: {
          teachers: { some: { id: userId } },
        },
        include: {
          teachers: { select: { id: true, email: true, fullName: true } },
          learningModule: { include: { semester: true } },
          students: { select: { id: true, email: true, fullName: true } }, // ok si tu l'affiches côté teacher/admin
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.normalizeTeachersList(courses);
    }

    // ✅ STUDENT: uniquement les cours du module de l'étudiant
    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, learningModuleId: true },
    });

    if (!student || student.role !== 'STUDENT' || !student.learningModuleId) {
      // étudiant sans module -> aucun cours
      return [];
    }

    const courses = await this.prisma.course.findMany({
      where: { learningModuleId: student.learningModuleId },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
        // students: ❌ pas utile côté étudiant
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.normalizeTeachersList(courses);
  }

  async findOne(courseId: string, userId: string, role: Role) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
        // students: ❌ retirer (fuite d'info / legacy)
      },
    });

    // ADMIN: OK
    if (role === 'ADMIN') return course;

    // TEACHER: OK si fait partie des teachers du cours
    if (role === 'TEACHER') {
      const isTeacher = course.teachers?.some((t) => t.id === userId);
      if (!isTeacher) {
        throw new ForbiddenException('Access denied');
      }
      return course;
    }

    // STUDENT: OK si module match
    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, learningModuleId: true },
    });

    const ok =
      student?.role === 'STUDENT' &&
      !!student.learningModuleId &&
      !!course.learningModuleId &&
      student.learningModuleId === course.learningModuleId;

    if (!ok) {
      throw new ForbiddenException('Access denied');
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, teacherId: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        teachers: { select: { id: true } },
      },
    });

    // ✅ vérifier si le prof est dans teachers[] (nouveau modèle)
    const isTeacherOfCourse = course.teachers.some(t => t.id === teacherId);
    if (!isTeacherOfCourse) {
      throw new ForbiddenException('You are not a teacher of this course');
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...updateCourseDto,
        ...(updateCourseDto.description !== undefined
          ? { description: updateCourseDto.description || null }
          : {}),
      },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        teachers: { select: { id: true } },
      },
    });

    // ✅ vérifier si le prof est dans teachers[] (nouveau modèle)
    const isTeacherOfCourse = course.teachers.some(t => t.id === teacherId);
    if (!isTeacherOfCourse) {
      throw new ForbiddenException('You are not a teacher of this course');
    }

    return this.prisma.course.delete({
      where: { id },
    });
  }

  // ✅ Admin methods for multi-teacher support
  async adminCreateSubject(dto: CreateSubjectDto) {
    const { teacherIds, ...data } = dto;

    let connectTeachers: { id: string }[] = [];
    if (teacherIds?.length) {
      const teachers = await this.prisma.user.findMany({
        where: { id: { in: teacherIds }, role: "TEACHER" },
        select: { id: true },
      });
      if (teachers.length !== teacherIds.length) {
        throw new BadRequestException("Un ou plusieurs teacherIds sont invalides");
      }
      connectTeachers = teachers.map((t) => ({ id: t.id }));
    }

    const createData: any = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      learningModuleId: data.learningModuleId ?? null,
    };

    if (connectTeachers.length) {
      createData.teachers = { connect: connectTeachers };
    }

    return this.prisma.course.create({
      data: createData,
      include: {
        teachers: true,
        learningModule: { include: { semester: true } },
      },
    });
  }

  async adminUpdateSubject(id: string, dto: UpdateSubjectDto) {
    const exists = await this.prisma.course.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException("Course not found");

    let teachersUpdate: any = undefined;
    if (dto.teacherIds !== undefined) {
      const teachers = await this.prisma.user.findMany({
        where: { id: { in: dto.teacherIds }, role: "TEACHER" },
        select: { id: true },
      });
      if (teachers.length !== dto.teacherIds.length) {
        throw new BadRequestException("Un ou plusieurs teacherIds sont invalides");
      }
      teachersUpdate = { set: teachers.map((t) => ({ id: t.id })) };
    }

    // Construire l'objet de mise à jour progressivement
    const updateData: any = {};
    
    if (dto.title !== undefined) {
      updateData.title = dto.title.trim();
    }
    
    if (dto.description !== undefined) {
      updateData.description = dto.description?.trim() || null;
    }
    
    if (dto.learningModuleId !== undefined) {
      updateData.learningModuleId = dto.learningModuleId === null ? null : dto.learningModuleId;
    }
    

    return this.prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
      },
    });
  }

  async adminDeleteSubject(id: string) {
    // si tu as des FK sur assignments/resources etc, il faudra gérer onDelete cascade
    await this.prisma.course.delete({ where: { id } });
  }

  async adminSetTeachers(courseId: string, teacherIds: string[]) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException("Course not found");

    const teachers = await this.prisma.user.findMany({
      where: { id: { in: teacherIds }, role: "TEACHER" },
      select: { id: true },
    });

    if (teachers.length !== teacherIds.length) {
      throw new BadRequestException("Un ou plusieurs teacherIds sont invalides");
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        teachers: { set: teachers.map((t) => ({ id: t.id })) },
      },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
      },
    });
  }

  async adminRemoveTeacher(courseId: string, teacherId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        teachers: { disconnect: { id: teacherId } },
      },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
      },
    });
  }

  async studentFindMySubjects(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { learningModule: true },
    });

    if (!student?.learningModule?.id) return [];

    const courses = await this.prisma.course.findMany({
      where: { learningModuleId: student.learningModule.id },
      orderBy: { createdAt: "desc" },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: {
          include: { semester: true },
        },
      },
    });

    return this.normalizeTeachersList(courses);
  }

  async teacherFindAllSubjects(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      where: {
        teachers: { some: { id: teacherId } },
      },
      include: {
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return this.normalizeTeachersList(courses);
  }
}

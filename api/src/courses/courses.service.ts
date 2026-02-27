import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSubjectDto, UpdateSubjectDto } from '../admin/dto/admin-subject.dto';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | string;

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto, teacherId: string) {
    return this.prisma.course.create({
      data: {
        title: createCourseDto.title,
        description: createCourseDto.description ?? null,
        teacherId,
        learningModuleId: createCourseDto.learningModuleId ?? null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
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
      return this.prisma.course.findMany({
        include: {
          teacher: { select: { id: true, email: true, fullName: true } },
          teachers: { select: { id: true, email: true, fullName: true } },
          learningModule: { include: { semester: true } },
          students: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // TEACHER: ses cours créés
    if (role === 'TEACHER') {
      return this.prisma.course.findMany({
        where: { teacherId: userId },
        include: {
          teacher: { select: { id: true, email: true, fullName: true } },
          teachers: { select: { id: true, email: true, fullName: true } },
          learningModule: { include: { semester: true } },
          students: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // ✅ STUDENT: tous les cours (pour afficher "cours disponibles" + "mes inscriptions" côté front)
    return this.prisma.course.findMany({
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        teachers: { select: { id: true, email: true, fullName: true } },
        learningModule: { include: { semester: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, teacherId: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      select: { teacherId: true },
    });

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this course');
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
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id },
      select: { teacherId: true },
    });

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You are not the teacher of this course');
    }

    return this.prisma.course.delete({
      where: { id },
    });
  }

  async enrollStudent(courseId: string, studentId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          connect: { id: studentId },
        },
      },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async unenrollStudent(courseId: string, studentId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: studentId },
        },
      },
      include: {
        teacher: { select: { id: true, email: true, fullName: true } },
        students: { select: { id: true, email: true, fullName: true } },
      },
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
    if (dto.teacherIds) {
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
    
    if (teachersUpdate) {
      updateData.teachers = teachersUpdate;
    }

    return this.prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        teachers: true,
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
        teachers: true,
        learningModule: { include: { semester: true } },
      },
    });
  }

  async adminRemoveTeacher(courseId: string, teacherId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        teachers: { disconnect: { id: teacherId } },
        // Optionnel temporaire : si on retirait le legacy teacherId
        // ...(teacherId === course.teacherId ? { teacherId: null } : {}),
      },
      include: {
        teachers: true,
        learningModule: { include: { semester: true } },
      },
    });
  }
}

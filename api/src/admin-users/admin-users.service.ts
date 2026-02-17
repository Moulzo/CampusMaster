import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: AdminUpdateUserDto) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const data: any = {};

    if (dto.email !== undefined) {
      data.email = dto.email.toLowerCase();
    }

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }

    if (dto.role !== undefined) {
      const role = dto.role as Role;
      if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
        throw new BadRequestException('Role invalide');
      }
      data.role = role;
    }

    if (dto.password !== undefined) {
      if (!dto.password) {
        throw new BadRequestException('Password cannot be empty');
      }
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      data.refreshTokenHash = null;
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      if (e?.code === 'P2002') {
        throw new BadRequestException('Email déjà utilisé');
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw e;
    }
  }
}

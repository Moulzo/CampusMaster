import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  create(requesterId: string, dto: CreateTicketDto) {
    return this.prisma.ticket.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        type: dto.type,
        requesterId,
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  findMine(requesterId: string) {
    return this.prisma.ticket.findMany({
      where: { requesterId },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(filters?: { status?: TicketStatus }) {
    return this.prisma.ticket.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: TicketStatus) {
    try {
      return await this.prisma.ticket.update({
        where: { id },
        data: { status },
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Ticket not found');
      }

      throw error;
    }
  }
}

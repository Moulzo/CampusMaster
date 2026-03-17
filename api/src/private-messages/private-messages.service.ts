import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendPrivateMessageDto } from './dto/send-private-message.dto';

@Injectable()
export class PrivateMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertConversationParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.privateConversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Accès interdit à cette conversation');
    }

    return participant;
  }

  async listConversations(currentUserId: string) {
    const participations = await this.prisma.privateConversationParticipant.findMany({
      where: { userId: currentUserId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    });

    return participations.map((participation) => {
      const conversation = participation.conversation;
      const lastMessage = conversation.messages[0] ?? null;

      const otherParticipants = conversation.participants
        .filter((p) => p.userId !== currentUserId)
        .map((p) => p.user);

      const unreadCount = conversation.messages.filter((m) => {
        if (m.senderId === currentUserId) return false;
        if (!participation.lastReadAt) return true;
        return m.createdAt > participation.lastReadAt;
      }).length;

      return {
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map((p) => ({
          userId: p.userId,
          joinedAt: p.joinedAt,
          lastReadAt: p.lastReadAt,
          user: p.user,
        })),
        otherParticipants,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              sender: lastMessage.sender,
            }
          : null,
        unreadCount,
      };
    });
  }

  async createConversation(currentUserId: string, dto: CreateConversationDto) {
    const uniqueParticipantIds = Array.from(
      new Set(dto.participantIds.map((id) => id.trim()).filter(Boolean)),
    ).filter((id) => id !== currentUserId);

    if (uniqueParticipantIds.length === 0) {
      throw new BadRequestException('Au moins un autre participant est requis');
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: uniqueParticipantIds },
      },
      select: {
        id: true,
      },
    });

    if (users.length !== uniqueParticipantIds.length) {
      throw new BadRequestException('Un ou plusieurs participants sont invalides');
    }

    if (uniqueParticipantIds.length === 1) {
      const targetUserId = uniqueParticipantIds[0];

      const existing = await this.prisma.privateConversation.findFirst({
        where: {
          AND: [
            {
              participants: {
                some: { userId: currentUserId },
              },
            },
            {
              participants: {
                some: { userId: targetUserId },
              },
            },
          ],
        },
        include: {
          participants: true,
        },
      });

      if (existing && existing.participants.length === 2) {
        return this.getConversation(existing.id, currentUserId);
      }
    }

    const allParticipantIds = [currentUserId, ...uniqueParticipantIds];

    const conversation = await this.prisma.privateConversation.create({
      data: {
        createdById: currentUserId,
        participants: {
          create: allParticipantIds.map((userId) => ({
            userId,
            lastReadAt: userId === currentUserId ? new Date() : null,
          })),
        },
      },
    });

    return this.getConversation(conversation.id, currentUserId);
  }

  async getConversation(conversationId: string, currentUserId: string) {
    await this.assertConversationParticipant(conversationId, currentUserId);

    const conversation = await this.prisma.privateConversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation introuvable');
    }

    return {
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        joinedAt: p.joinedAt,
        lastReadAt: p.lastReadAt,
        user: p.user,
      })),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        senderId: m.senderId,
        sender: m.sender,
      })),
    };
  }

  async listMessages(conversationId: string, currentUserId: string) {
    await this.assertConversationParticipant(conversationId, currentUserId);

    const messages = await this.prisma.privateMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      senderId: m.senderId,
      sender: m.sender,
    }));
  }

  async sendMessage(
    conversationId: string,
    currentUserId: string,
    dto: SendPrivateMessageDto,
  ) {
    await this.assertConversationParticipant(conversationId, currentUserId);

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Le contenu du message est vide');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.privateMessage.create({
        data: {
          conversationId,
          senderId: currentUserId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await tx.privateConversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
        },
      });

      await tx.privateConversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: currentUserId,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      return created;
    });

    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderId: message.senderId,
      sender: message.sender,
    };
  }

  async markAsRead(conversationId: string, currentUserId: string) {
    await this.assertConversationParticipant(conversationId, currentUserId);

    await this.prisma.privateConversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return { ok: true };
  }
}

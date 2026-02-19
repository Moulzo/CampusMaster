import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Define enum values as string literals
type NotificationType = 'NEW_ASSIGNMENT' | 'NEW_GRADE' | 'DEADLINE_REMINDER' | 'ANNOUNCEMENT' | 'SYSTEM';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    assignmentId?: string,
  ) {
    console.log(`[NotificationService] Creating notification for user: ${userId} - ${title} - ${type}`);
    
    try {
      const notification = await (this.prisma as any).notification.create({
        data: {
          userId,
          title,
          message,
          type,
          assignmentId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignment: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });
      
      console.log(`[NotificationService] Notification created successfully: ${notification.id}`);
      return notification;
    } catch (error) {
      console.error(`[NotificationService] Error creating notification:`, error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    return (this.prisma as any).notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return (this.prisma as any).notification.updateMany({
      where: {
        id: notificationId,
        userId, // Security: ensure user owns notification
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return (this.prisma as any).notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return (this.prisma as any).notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Security: ensure user owns notification
      },
    });
  }

  async getUnreadCount(userId: string) {
    return (this.prisma as any).notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // Helper methods for common notification types
  async notifyNewAssignment(userId: string, assignmentTitle: string, courseTitle: string, assignmentId: string) {
    return this.createNotification(
      userId,
      assignmentTitle,
      `Un nouveau devoir "${assignmentTitle}" a été publié dans le cours "${courseTitle}".`,
      'NEW_ASSIGNMENT' as NotificationType,
      assignmentId,
    );
  }

  async notifyNewGrade(userId: string, assignmentTitle: string, score: number, maxScore: number) {
    return this.createNotification(
      userId,
      'Note disponible',
      `Votre note pour le devoir "${assignmentTitle}" est disponible : ${score}/${maxScore}.`,
      'NEW_GRADE' as NotificationType,
    );
  }

  async notifyDeadlineReminder(userId: string, assignmentTitle: string, courseTitle: string, hoursLeft: number) {
    const timeText = hoursLeft <= 24 
      ? `${hoursLeft} heure${hoursLeft > 1 ? 's' : ''}`
      : `${Math.floor(hoursLeft / 24)} jour${Math.floor(hoursLeft / 24) > 1 ? 's' : ''}`;
    
    return this.createNotification(
      userId,
      'Rappel de deadline',
      `Le devoir "${assignmentTitle}" (${courseTitle}) doit être rendu dans ${timeText}.`,
      'DEADLINE_REMINDER' as NotificationType,
    );
  }

  async notifySystem(userId: string, title: string, message: string) {
    return this.createNotification(
      userId,
      title,
      message,
      'SYSTEM' as NotificationType,
    );
  }
}

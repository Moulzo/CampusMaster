import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketService } from '../websockets/websocket-simple.service';
import { NotificationType, Prisma } from '@prisma/client';

function assertUserId(userId: string) {
  if (!userId) throw new UnauthorizedException('Missing userId');
}

@Injectable()
export class NotificationsService {
  private logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private webSocketService: WebSocketService,
  ) {}

  /**
   * ✅ Méthode centrale : Créer une notification
   * 
   * 1. Stocke en base de données
   * 2. Envoie par email (si service disponible)
   * 3. Émet via WebSocket en temps réel
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    options?: {
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    try {
      // Sécuriser : merger courseId/assignmentId dans metadata selon le type
      const baseMetadata =
        options?.metadata && typeof options.metadata === "object"
          ? (options.metadata as Record<string, any>)
          : {};

      const mergedMetadata = { ...baseMetadata };

      // NEW_ASSIGNMENT / NEW_GRADE doivent avoir courseId + assignmentId
      if (type === "NEW_ASSIGNMENT" || type === "NEW_GRADE") {
        // Note: ces champs doivent être passés dans options.metadata
        if (options?.metadata && typeof options.metadata === "object") {
          const meta = options.metadata as Record<string, any>;
          if (meta.courseId) mergedMetadata.courseId = meta.courseId;
          if (meta.assignmentId) mergedMetadata.assignmentId = meta.assignmentId;
        }
      }

      // ✅ 1. Créer en base de données
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          isRead: false,
          metadata: Object.keys(mergedMetadata).length ? mergedMetadata : undefined,
        },
      });

      this.logger.log(`[Create] Notification créée en DB : ${notification.id} pour user ${userId}`);

      // ✅ 3. Émettre via WebSocket en temps réel
      try {
        this.webSocketService.sendToUser(userId, 'notification:new', notification);
        this.logger.log(`[WebSocket] 📤 Envoyée à user ${userId}`);
      } catch (error) {
        this.logger.error(`[WebSocket] Échec pour user ${userId}:`, error.message);
        // Ne pas bloquer si WebSocket échoue
      }

      return notification;
    } catch (error) {
      this.logger.error(`[Create] Erreur lors de la création:`, error);
      throw error;
    }
  }

  /**
   * ✅ Broadcast : Envoyer à tous les utilisateurs
   */
  async createBroadcastNotification(
    title: string,
    message: string,
    type: NotificationType = 'ANNOUNCEMENT',
  ) {
    try {
      const notification = {
        id: `broadcast_${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      // Envoyer à tous les utilisateurs connectés
      this.webSocketService.broadcast('notification:new', notification);
      
      this.logger.log(`[Broadcast] 📢 Broadcast envoyé`);

      return { notification };
    } catch (error) {
      this.logger.error(`[Broadcast] Erreur:`, error);
      throw error;
    }
  }

  /**
   * ✅ Marquer comme lu
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Sécurité: vérifier que c'est bien sa notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      if (notification.count > 0) {
        // Informer le client via WebSocket
        this.webSocketService.sendToUser(userId, 'notification:marked-read', {
          notificationId,
        });
        
        this.logger.log(`[MarkRead] Notification ${notificationId} marquée comme lue`);
      }

      return notification;
    } catch (error) {
      this.logger.error(`[MarkRead] Erreur:`, error);
      throw error;
    }
  }

  /**
   * ✅ Supprimer une notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId, // Sécurité
        },
      });

      if (notification.count > 0) {
        // Informer le client via WebSocket
        this.webSocketService.sendToUser(userId, 'notification:deleted', {
          notificationId,
        });
        
        this.logger.log(`[Delete] Notification ${notificationId} supprimée`);
      }

      return notification;
    } catch (error) {
      this.logger.error(`[Delete] Erreur:`, error);
      throw error;
    }
  }

  /**
   * ✅ Récupérer les notifications d'un utilisateur
   */
  async getUserNotifications(userId: string, limit = 50) {
    assertUserId(userId);
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      this.logger.log(`[Get] ${notifications.length} notifications pour user ${userId}`);
      return notifications;
    } catch (error) {
      this.logger.error(`[Get] Erreur:`, error);
      throw error;
    }
  }

  /**
   * ✅ Compter les notifications non lues
   */
  async getUnreadCount(userId: string) {
    assertUserId(userId);
    try {
      const count = await this.prisma.notification.count({
        where: { 
          userId, 
          isRead: false 
        },
      });

      return count;
    } catch (error) {
      this.logger.error(`[UnreadCount] Erreur:`, error);
      throw error;
    }
  }

  /**
   * ✅ Compter le total des notifications
   */
  async getTotalCount(userId: string) {
    assertUserId(userId);
    try {
      const count = await this.prisma.notification.count({
        where: { userId },
      });

      return count;
    } catch (error) {
      this.logger.error(`[TotalCount] Erreur:`, error);
      throw error;
    }
  }

  /**
   * ✅ Marquer toutes comme lues
   */
  async markAllAsRead(userId: string) {
    assertUserId(userId);
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Informer le client via WebSocket
      this.webSocketService.sendToUser(userId, 'notifications:all-read', {
        count: result.count,
      });

      this.logger.log(`[MarkAllRead] ${result.count} notifications marquées comme lues pour user ${userId}`);
      
      return result;
    } catch (error) {
      this.logger.error(`[MarkAllRead] Erreur:`, error);
      throw error;
    }
  }

  // Helper methods for common notification types
  async notifyNewAssignment(userId: string, assignmentTitle: string, courseTitle: string, courseId: string, assignmentId: string) {
    return this.createNotification(
      userId,
      assignmentTitle,
      `Un nouveau devoir "${assignmentTitle}" a été publié dans le cours "${courseTitle}".`,
      'NEW_ASSIGNMENT',
      { 
        metadata: { courseId, assignmentId }
      }
    );
  }

  async notifyNewGrade(userId: string, assignmentTitle: string, score: number, maxScore: number, courseId: string, assignmentId: string) {
    return this.createNotification(
      userId,
      'Note disponible',
      `Votre note pour le devoir "${assignmentTitle}" est disponible : ${score}/${maxScore}.`,
      'NEW_GRADE',
      { 
        metadata: { courseId, assignmentId }
      }
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
      'DEADLINE_REMINDER'
    );
  }

  async notifySystem(userId: string, title: string, message: string) {
    return this.createNotification(
      userId,
      title,
      message,
      'SYSTEM'
    );
  }

  async notifyNewMessage(userId: string, senderName: string, messagePreview: string) {
    return this.createNotification(
      userId,
      'Nouveau message',
      `${senderName}: ${messagePreview}`,
      'NEW_MESSAGE'
    );
  }
}

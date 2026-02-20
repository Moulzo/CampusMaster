import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketService } from './websocket-simple.service';
import { NotificationsService } from '../notifications/notifications.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://192.168.56.1:3000'],
    credentials: true,
  },
  // Laisser les paramètres par défaut (pas de pingTimeout/pingInterval à 0)
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  constructor(
    private jwtService: JwtService,
    private webSocketService: WebSocketService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extraire le token du handshake
      const token = client.handshake.auth.token || 
                   client.handshake.headers.authorization?.replace('Bearer ', '');
      
      this.logger.log(`[${client.id}] Tentative de connexion`);
      
      if (!token) {
        this.logger.warn(`[${client.id}] Pas de token fourni`);
        client.emit('error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      // Valider le token JWT avec gestion d'erreur détaillée
      let payload;
      try {
        payload = this.jwtService.verify(token);
      } catch (jwtError: any) {
        this.logger.error(`[${client.id}] Erreur JWT: ${jwtError.name} - ${jwtError.message}`);
        
        // Envoyer un message d'erreur détaillé au client
        if (jwtError.name === 'TokenExpiredError') {
          client.emit('error', { message: 'Token expired', code: 'TOKEN_EXPIRED' });
        } else if (jwtError.name === 'JsonWebTokenError') {
          client.emit('error', { message: 'Invalid token signature', code: 'INVALID_SIGNATURE' });
        } else {
          client.emit('error', { message: 'Invalid token', code: 'INVALID_TOKEN' });
        }
        
        client.disconnect();
        return;
      }

      // Vérifier que le payload contient les infos nécessaires
      if (!payload.sub) {
        this.logger.error(`[${client.id}] Token valide mais pas de 'sub' (userId)`);
        client.emit('error', { message: 'Invalid token payload', code: 'INVALID_PAYLOAD' });
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      client.userRole = payload.role;

      // Ajouter le client connecté
      if (client.userId) {
        this.webSocketService.addClient(client.userId, client);
      }
      
      this.logger.log(`[${client.id}] Authentifié - User: ${client.userId}, Role: ${client.userRole}`);
      
      // Confirmer l'authentification au client
      client.emit('authenticated', { 
        userId: client.userId,
        role: client.userRole,
      });
      
    } catch (error: any) {
      this.logger.error(`[${client.id}] Erreur inattendue lors de l'authentification:`, error.message);
      client.emit('error', { message: 'Authentication failed', details: error.message });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId || 'Non authentifié';
    this.logger.log(`[${client.id}] Déconnecté - User: ${userId}`);
    
    if (client.userId) {
      this.webSocketService.removeClient(client.userId);
    }
  }

  @SubscribeMessage('notifications:mark-read')
  async handleMarkAsRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        this.logger.warn(`[${client.id}] Tentative de mark-read sans authentification`);
        return { success: false, error: 'Not authenticated' };
      }

      this.logger.log(`[${client.id}] Mark as read: ${data.notificationId}`);
      
      // Mettre à jour en base de données
      await this.notificationsService.markAsRead(data.notificationId, client.userId);
      
      // Mettre à jour le compteur pour ce client
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('notifications:count', unreadCount);
      
      this.logger.log(`Notification ${data.notificationId} marked as read by user ${client.userId}`);
      
      // Envoyer la confirmation au client
      client.emit('notification:marked-read', { notificationId: data.notificationId });
      
      return { success: true };
    } catch (error: any) {
      this.logger.error(`[${client.id}] Erreur mark-read:`, error.message);
      client.emit('error', { message: 'Failed to mark notification as read' });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('notifications:delete')
  async handleDelete(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        this.logger.warn(`[${client.id}] Tentative de delete sans authentification`);
        return { success: false, error: 'Not authenticated' };
      }

      this.logger.log(`[${client.id}] Delete notification: ${data.notificationId}`);
      
      // Supprimer en base de données
      await this.notificationsService.deleteNotification(data.notificationId, client.userId);
      
      // Mettre à jour le compteur pour ce client
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      client.emit('notifications:count', unreadCount);
      
      this.logger.log(`Notification ${data.notificationId} deleted by user ${client.userId}`);
      
      // Envoyer la confirmation au client
      client.emit('notification:deleted', { notificationId: data.notificationId });
      
      return { success: true };
    } catch (error: any) {
      this.logger.error(`[${client.id}] Erreur delete:`, error.message);
      client.emit('error', { message: 'Failed to delete notification' });
      return { success: false, error: error.message };
    }
  }

  // Méthode pour envoyer une notification à un utilisateur spécifique
  async sendNotificationToUser(userId: string, notification: any) {
    this.webSocketService.sendToUser(userId, 'notification:new', notification);
    this.logger.log(`Notification sent to user ${userId}`);
  }

  // Méthode pour envoyer le compteur de notifications mis à jour
  async updateNotificationCount(userId: string) {
    this.webSocketService.updateNotificationCount(userId);
  }

  // Méthode pour envoyer à tous les utilisateurs d'un rôle spécifique
  async sendNotificationToRole(role: string, notification: any) {
    this.webSocketService.sendToRole(role, 'notification:new', notification);
  }

  // Méthode pour envoyer à tous les utilisateurs connectés
  async sendBroadcastNotification(notification: any) {
    this.webSocketService.broadcast('notification:new', notification);
  }
}

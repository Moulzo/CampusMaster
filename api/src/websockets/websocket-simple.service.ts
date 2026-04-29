import { Injectable, Logger, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebSocketService {
  private connectedClients: Map<string, any> = new Map();
  private server?: Server;
  private logger: Logger = new Logger('WebSocketService');

  constructor(private prisma: PrismaService) {}

  addClient(userId: string, client: any) {
    this.connectedClients.set(userId, client);
    this.logger.log(`[+] Client ajouté: ${userId} (total: ${this.connectedClients.size})`);
  }

  removeClient(userId: string) {
    this.connectedClients.delete(userId);
    this.logger.log(`[-] Client retiré: ${userId} (total: ${this.connectedClients.size})`);
  }

  getClient(userId: string) {
    return this.connectedClients.get(userId);
  }

  getAllClients() {
    return Array.from(this.connectedClients.values());
  }

  getStats() {
    const connectedUsers = Array.from(this.connectedClients.keys());
    return {
      connectedUsers,
      totalClients: this.connectedClients.size,
    };
  }

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Socket.IO server registered in WebSocketService');
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  sendNotificationToUser(userId: string, notification: any) {
    this.sendToUser(userId, 'notification:new', notification);
  }

  sendToUser(userId: string, event: string, data: any) {
    const room = this.userRoom(userId);

    if (this.server) {
      this.server.to(room).emit(event, data);
      this.logger.log(`📤 Message envoyé à ${room}: ${event}`);
      return;
    }

    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(event, data);
      this.logger.log(`📤 Message envoyé à ${userId}: ${event}`);
    } else {
      this.logger.warn(`⚠️ Client ${userId} non trouvé pour l'événement ${event}`);
    }
  }

  sendToRole(role: string, event: string, data: any) {
    let sentCount = 0;
    for (const [userId, client] of this.connectedClients) {
      if (client.userRole === role) {
        client.emit(event, data);
        sentCount++;
      }
    }
    this.logger.log(`📤 Message envoyé à ${sentCount} clients de rôle ${role}: ${event}`);
  }

  broadcast(event: string, data: any) {
    const clientCount = this.connectedClients.size;
    this.logger.log(`📢 Broadcast de l'événement "${event}" à ${clientCount} clients`);
    
    for (const [userId, client] of this.connectedClients) {
      if (client.connected) {
        client.emit(event, data);
        this.logger.log(`  → Envoyé à ${userId}`);
      } else {
        this.logger.warn(`  ⚠️ Client ${userId} non connecté`);
      }
    }
    
    this.logger.log(`✅ Broadcast terminé (${clientCount} clients)`);
  }

  async updateNotificationCount(userId: string) {
    const client = this.connectedClients.get(userId);
    if (!client) return;

    try {
      const unread = await this.prisma.notification.count({
        where: { 
          userId,
          readAt: null,
        },
      });

      client.emit('notifications:count', unread);
      this.logger.log(`📊 Compteur de notifications mis à jour pour ${userId}: ${unread}`);
    } catch (error) {
      this.logger.error(`❌ Erreur updateNotificationCount pour ${userId}:`, error);
    }
  }
}

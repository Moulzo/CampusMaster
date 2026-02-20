import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WebSocketService } from '../websockets/websocket-simple.service';

@Controller('test-notifications')
export class TestNotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private webSocketService: WebSocketService,
  ) {}

  @Post('send')
  async sendTestNotification(@Body() body: { userId: string; title?: string; message?: string }) {
    const { userId, title = 'Notification de test', message = 'Ceci est une notification de test' } = body;
    
    const notification = await this.notificationsService.createNotification(
      userId,
      title,
      message,
      'ANNOUNCEMENT'
    );

    return { success: true, notification };
  }

  @Post('broadcast')
  async sendBroadcastNotification(@Body() body: { title?: string; message?: string }) {
    const { title = 'Annonce générale', message = 'Ceci est une annonce pour tous les utilisateurs' } = body;
    
    const notification = {
      id: `broadcast_${Date.now()}`,
      title,
      message,
      type: 'ANNOUNCEMENT',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // ✅ FIX: Utiliser 'notification:new' pour être cohérent avec le reste du système
    console.log(`[Broadcast] 📢 Envoi d'un broadcast: "${title}"`);
    this.webSocketService.broadcast('notification:new', notification);
    console.log(`[Broadcast] ✅ Notification broadcastée avec succès`);

    return { success: true, notification };
  }

  @Get('stats')
  async getStats() {
    // Obtenir les stats depuis le WebSocketService
    const stats = this.webSocketService.getStats();
    console.log(`[Stats] 📊 Utilisateurs connectés:`, stats);
    
    return {
      connectedUsers: stats.connectedUsers,
      totalClients: stats.totalClients,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('connected-users')
  async getConnectedUsers() {
    const stats = this.webSocketService.getStats();
    return { 
      connectedUsers: stats.connectedUsers,
      totalClients: stats.totalClients,
    };
  }
}

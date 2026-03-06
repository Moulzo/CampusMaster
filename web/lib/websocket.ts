import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentToken: string | null = null;

  connect(token: string) {
    // Sauvegarder le token pour les reconnexions
    this.currentToken = token;

    if (this.socket?.connected) {
      console.log('[WS] Déconnexion du socket existant avant nouvelle connexion');
      this.socket.disconnect();
    }

    console.log('[WS] Connexion avec token:', token ? token.substring(0, 20) + '...' : 'No token');

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: {
        token: token,
      },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: false, // Désactiver la reconnexion auto de socket.io (on gère manuellement)
    });

    this.setupEventListeners();
  }

  reconnectWithNewToken(token: string) {
    console.log('[WS] Reconnexion avec nouveau token');
    this.reconnectAttempts = 0;
    this.connect(token);
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WS] Connecté au serveur WebSocket');
      this.reconnectAttempts = 0;
    });

    this.socket.on('authenticated', (data) => {
      console.log('[WS] Authentifié:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Déconnecté:', reason);
      
      // Ne pas se reconnecter si c'est une déconnexion volontaire
      if (reason === 'io client disconnect') {
        console.log('[WS] Déconnexion volontaire - pas de reconnexion');
        return;
      }

      // Se reconnecter automatiquement pour les autres raisons
      console.log('[WS] Tentative de reconnexion...');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Erreur de connexion:', error.message);
      
      // Ne pas se reconnecter si c'est une erreur d'authentification
      if (error.message?.includes('Invalid token') || 
          error.message?.includes('No token') ||
          error.message?.includes('Invalid signature')) {
        console.error('[WS] Erreur d\'authentification - arrêt des tentatives de reconnexion');
        this.reconnectAttempts = this.maxReconnectAttempts; // Arrêter les tentatives
        return;
      }

      // Pour les autres erreurs, tenter de se reconnecter
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('[WS] Erreur WebSocket:', error);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    if (!this.currentToken) {
      console.error('[WS] Pas de token disponible pour la reconnexion');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.currentToken) {
        this.connect(this.currentToken);
      }
    }, delay);
  }

  disconnect() {
    console.log('[WS] Déconnexion manuelle');
    this.currentToken = null;
    this.reconnectAttempts = 0;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) {
      console.error('[WS] Impossible d\'émettre - socket non connecté');
      return;
    }
    
    this.socket.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  onBroadcastNotification(callback: (notification: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('notification:broadcast', callback);
  }

  markNotificationAsRead(notificationId: string) {
    if (!this.socket) return;
    
    this.socket.emit('notifications:mark-read', { notificationId });
  }

  deleteNotification(notificationId: string) {
    if (!this.socket) return;
    
    this.socket.emit('notifications:delete', { notificationId });
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();

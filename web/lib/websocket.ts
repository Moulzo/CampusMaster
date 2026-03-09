import { io, Socket } from 'socket.io-client';

type ConnectionListener = (connected: boolean) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private connectionListeners = new Set<ConnectionListener>();

  connect(token: string) {
    this.currentToken = token;

    // Si un socket existe déjà avec le même token, on le réutilise
    if (this.socket) {
      const sameToken = (this.socket.auth as any)?.token === token;

      if (sameToken) {
        if (!this.socket.connected) {
          this.socket.connect();
        }
        return this.socket;
      }

      // Token différent : on nettoie et on recrée
      this.cleanupSocket();
    }

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: { token },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.emitConnectionState(true);
    });

    this.socket.on('disconnect', (reason) => {
      this.emitConnectionState(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Erreur de connexion:', error.message);
      this.emitConnectionState(false);
    });

    // Selon la version/client, ces événements peuvent être émis par le manager.
    this.socket.io.on('reconnect_attempt', (attempt) => {
      // Tentative de reconnexion
    });

    this.socket.io.on('reconnect', (attempt) => {
      this.emitConnectionState(true);
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.error('[WS] Erreur de reconnexion:', error);
    });
  }

  private cleanupSocket() {
    if (!this.socket) return;

    this.socket.removeAllListeners();
    this.socket.io.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }

  disconnect() {
    this.cleanupSocket();
    this.emitConnectionState(false);
  }

  emit(event: string, data: any) {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit(event, data);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
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

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  getSocket(): Socket | null {
    // On retourne le socket même s'il est momentanément déconnecté
    return this.socket;
  }

  subscribeConnection(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    listener(this.isConnected());

    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  private emitConnectionState(connected: boolean) {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }
}

export const websocketService = new WebSocketService();

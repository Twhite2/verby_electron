// WebSocketService.ts
// This service handles WebSocket communication with the backend

import { EventEmitter } from 'events';

export enum MessageTypes {
  TRANSCRIPT = 'transcript',
  TRANSLATION = 'translation',
  CONFIG = 'config',
  AUDIO = 'audio',
  TTS = 'tts',
  ERROR = 'error',
  SESSION_UPDATE = 'session_update',
  CONNECTION_STATUS = 'connection_status',
}

export interface TranscriptMessage {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  sourceLanguage: string;
}

export interface TranslationMessage {
  id: string;
  text: string;
  timestamp: number;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface ConfigMessage {
  role: 'speaker' | 'listener';
  sourceLanguage: string;
  targetLanguage: string;
}

export interface SessionUpdateMessage {
  sessionId: string;
  participants: number;
  status: 'active' | 'ended';
}

export interface ErrorMessage {
  code: string;
  message: string;
  details?: string;
}

export class WebSocketService extends EventEmitter {
  private socket: WebSocket | null = null;
  private url: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 2000; // Start with 2 seconds
  private sessionId: string | null = null;
  private audioChunksQueue: ArrayBuffer[] = [];
  private processingAudio: boolean = false;
  private config: ConfigMessage = {
    role: 'listener',
    sourceLanguage: 'en-US',
    targetLanguage: 'es-ES'
  };
  
  constructor(baseUrl: string = 'ws://localhost:8000') {
    super();
    this.url = baseUrl;
  }
  
  /**
   * Connect to the WebSocket server with a specific session ID
   */
  public connect(sessionId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;
      
      try {
        const fullUrl = `${this.url}/ws/${sessionId}`;
        this.socket = new WebSocket(fullUrl);
        
        this.socket.binaryType = 'arraybuffer';
        
        this.socket.onopen = () => {
          console.log(`WebSocket connected to session: ${sessionId}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectTimeout = 2000;
          
          // Send initial config when connecting
          this.sendConfig(this.config);
          
          this.emit(MessageTypes.CONNECTION_STATUS, { connected: true, sessionId });
          resolve(true);
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit(MessageTypes.ERROR, { 
            code: 'websocket_error', 
            message: 'WebSocket connection error' 
          });
        };
        
        this.socket.onclose = (event) => {
          console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          this.emit(MessageTypes.CONNECTION_STATUS, { connected: false, sessionId });
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => this.reconnect(), this.reconnectTimeout);
            // Exponential backoff for reconnect
            this.reconnectTimeout = Math.min(this.reconnectTimeout * 1.5, 30000);
            this.reconnectAttempts++;
          }
        };
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        this.emit(MessageTypes.ERROR, { 
          code: 'connection_failed', 
          message: 'Failed to establish WebSocket connection' 
        });
        reject(error);
      }
    });
  }
  
  /**
   * Reconnect to the WebSocket server
   */
  private reconnect(): void {
    if (this.sessionId) {
      console.log(`Attempting to reconnect to session: ${this.sessionId}`);
      this.connect(this.sessionId).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }
  }
  
  /**
   * Send audio data to the WebSocket server
   */
  public sendAudio(audioData: ArrayBuffer): void {
    // Add to queue
    this.audioChunksQueue.push(audioData);
    
    // Process queue if not already processing
    if (!this.processingAudio) {
      this.processAudioQueue();
    }
  }
  
  /**
   * Process audio queue to send chunks sequentially
   */
  private async processAudioQueue(): Promise<void> {
    if (this.audioChunksQueue.length === 0) {
      this.processingAudio = false;
      return;
    }
    
    this.processingAudio = true;
    
    // Get the next chunk from the queue
    const chunk = this.audioChunksQueue.shift();
    
    if (chunk && this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        // Send audio data as binary message
        this.socket.send(chunk);
        
        // Process next chunk with a small delay to avoid overwhelming the connection
        setTimeout(() => this.processAudioQueue(), 10);
      } catch (error) {
        console.error('Error sending audio data:', error);
        this.emit(MessageTypes.ERROR, { 
          code: 'audio_send_error', 
          message: 'Failed to send audio data' 
        });
        this.processingAudio = false;
      }
    } else {
      this.processingAudio = false;
    }
  }
  
  /**
   * Send configuration to the WebSocket server
   */
  public sendConfig(config: Partial<ConfigMessage>): void {
    // Update local config with new values
    this.config = { ...this.config, ...config };
    
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: MessageTypes.CONFIG,
        data: this.config
      };
      
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending config:', error);
        this.emit(MessageTypes.ERROR, { 
          code: 'config_send_error', 
          message: 'Failed to send configuration' 
        });
      }
    }
  }
  
  /**
   * Request TTS for a text
   */
  public requestTTS(text: string, language: string): void {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: MessageTypes.TTS,
        data: {
          text,
          language
        }
      };
      
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error requesting TTS:', error);
        this.emit(MessageTypes.ERROR, { 
          code: 'tts_request_error', 
          message: 'Failed to request text-to-speech' 
        });
      }
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    // Handle binary messages (audio data)
    if (event.data instanceof ArrayBuffer) {
      // TTS audio response
      this.emit(MessageTypes.TTS, event.data);
      return;
    }
    
    // Handle JSON messages
    try {
      const message = JSON.parse(event.data);
      
      if (!message.type) {
        console.warn('Received message without type:', message);
        return;
      }
      
      switch (message.type) {
        case MessageTypes.TRANSCRIPT:
          this.emit(MessageTypes.TRANSCRIPT, message.data);
          break;
          
        case MessageTypes.TRANSLATION:
          this.emit(MessageTypes.TRANSLATION, message.data);
          break;
          
        case MessageTypes.SESSION_UPDATE:
          this.emit(MessageTypes.SESSION_UPDATE, message.data);
          break;
          
        case MessageTypes.ERROR:
          this.emit(MessageTypes.ERROR, message.data);
          break;
          
        default:
          console.warn(`Unknown message type: ${message.type}`, message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
    }
  }
  
  /**
   * Check if WebSocket is connected
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
  
  /**
   * Get current session ID
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }
  
  /**
   * Get current config
   */
  public getConfig(): ConfigMessage {
    return { ...this.config };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;

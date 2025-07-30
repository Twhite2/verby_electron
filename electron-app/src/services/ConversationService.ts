// ConversationService.ts
// This service manages the conversation state and ties together audio, session, and WebSocket services

import { EventEmitter } from 'events';
import audioService, { AudioEvents } from './AudioService';
import webSocketService, { MessageTypes, TranscriptMessage, TranslationMessage } from './WebSocketService';
import sessionService from './SessionService';

export enum ConversationRole {
  SPEAKER = 'speaker',
  LISTENER = 'listener'
}

export enum ConversationEvents {
  ROLE_CHANGED = 'role_changed',
  TRANSCRIPT_RECEIVED = 'transcript_received',
  TRANSLATION_RECEIVED = 'translation_received',
  TTS_AUDIO_RECEIVED = 'tts_audio_received',
  ERROR = 'error',
  STATE_CHANGED = 'state_changed'
}

export interface TranscriptItem {
  id: string;
  text: string;
  translation?: string;
  timestamp: number;
  isSelf: boolean;
  isFinal: boolean;
  sourceLanguage: string;
  targetLanguage?: string;
}

export interface ConversationState {
  role: ConversationRole;
  isActive: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  transcripts: TranscriptItem[];
  currentAudioLevel: number;
}

class ConversationService extends EventEmitter {
  private role: ConversationRole = ConversationRole.LISTENER;
  private isActive: boolean = false;
  private sourceLanguage: string = 'en-US';
  private targetLanguage: string = 'es-ES';
  private transcripts: Map<string, TranscriptItem> = new Map();
  private audioContext: AudioContext | null = null;
  private currentAudioLevel: number = 0;
  
  constructor() {
    super();
    this.setupEventListeners();
  }
  
  /**
   * Initialize the conversation service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize audio service
      const audioInitialized = await audioService.initialize();
      
      if (!audioInitialized) {
        throw new Error('Failed to initialize audio service');
      }
      
      // Create audio context for TTS playback
      this.audioContext = new AudioContext();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize conversation service:', error);
      this.emit(ConversationEvents.ERROR, {
        code: 'init_failed',
        message: 'Failed to initialize conversation',
        details: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Set up event listeners for audio and WebSocket services
   */
  private setupEventListeners(): void {
    // Audio service events
    audioService.on(AudioEvents.AUDIO_DATA, this.handleAudioData.bind(this));
    audioService.on(AudioEvents.AUDIO_LEVEL, this.handleAudioLevel.bind(this));
    audioService.on(AudioEvents.ERROR, this.handleAudioError.bind(this));
    
    // WebSocket service events
    webSocketService.on(MessageTypes.TRANSCRIPT, this.handleTranscript.bind(this));
    webSocketService.on(MessageTypes.TRANSLATION, this.handleTranslation.bind(this));
    webSocketService.on(MessageTypes.TTS, this.handleTTSAudio.bind(this));
    webSocketService.on(MessageTypes.ERROR, this.handleWebSocketError.bind(this));
    webSocketService.on(MessageTypes.CONNECTION_STATUS, this.handleConnectionStatus.bind(this));
  }
  
  /**
   * Start the conversation
   */
  public start(): boolean {
    if (!sessionService.isInSession()) {
      console.error('Cannot start conversation: not in a session');
      this.emit(ConversationEvents.ERROR, {
        code: 'not_in_session',
        message: 'Cannot start conversation: not in a session'
      });
      return false;
    }
    
    // Set initial role as listener
    this.setRole(ConversationRole.LISTENER);
    
    this.isActive = true;
    this.emitStateChanged();
    
    return true;
  }
  
  /**
   * Stop the conversation
   */
  public stop(): void {
    if (!this.isActive) return;
    
    // Stop audio recording
    if (this.role === ConversationRole.SPEAKER) {
      audioService.stopRecording();
    }
    
    this.isActive = false;
    this.emitStateChanged();
  }
  
  /**
   * Set conversation role (speaker or listener)
   */
  public setRole(role: ConversationRole): boolean {
    if (role === this.role) return true;
    
    try {
      if (role === ConversationRole.SPEAKER) {
        // Switching to speaker
        const started = audioService.startRecording();
        if (!started) {
          throw new Error('Failed to start audio recording');
        }
      } else {
        // Switching to listener
        audioService.stopRecording();
      }
      
      // Update role
      this.role = role;
      
      // Send config update to WebSocket
      webSocketService.sendConfig({ role });
      
      // Emit role change event
      this.emit(ConversationEvents.ROLE_CHANGED, this.role);
      this.emitStateChanged();
      
      return true;
    } catch (error) {
      console.error('Failed to set role:', error);
      this.emit(ConversationEvents.ERROR, {
        code: 'role_change_failed',
        message: 'Failed to change conversation role',
        details: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Toggle conversation role
   */
  public toggleRole(): boolean {
    const newRole = this.role === ConversationRole.SPEAKER 
      ? ConversationRole.LISTENER 
      : ConversationRole.SPEAKER;
    
    return this.setRole(newRole);
  }
  
  /**
   * Set language preferences
   */
  public setLanguages(sourceLanguage: string, targetLanguage: string): void {
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    
    // Send config update to WebSocket
    webSocketService.sendConfig({
      sourceLanguage,
      targetLanguage
    });
    
    this.emitStateChanged();
  }
  
  /**
   * Handle audio data from microphone
   */
  private handleAudioData(blob: Blob): void {
    if (!this.isActive || this.role !== ConversationRole.SPEAKER) return;
    
    // Convert blob to ArrayBuffer
    blob.arrayBuffer()
      .then(buffer => {
        // Send audio data to WebSocket
        webSocketService.sendAudio(buffer);
      })
      .catch(error => {
        console.error('Error converting audio blob:', error);
      });
  }
  
  /**
   * Handle audio level updates
   */
  private handleAudioLevel(level: { instant: number }): void {
    this.currentAudioLevel = level.instant;
    this.emitStateChanged();
  }
  
  /**
   * Handle transcript message from WebSocket
   */
  private handleTranscript(message: TranscriptMessage): void {
    const isSelf = this.role === ConversationRole.SPEAKER;
    
    // Create or update transcript
    const transcript: TranscriptItem = {
      id: message.id,
      text: message.text,
      timestamp: message.timestamp,
      isSelf,
      isFinal: message.isFinal,
      sourceLanguage: message.sourceLanguage
    };
    
    // Store transcript
    this.transcripts.set(message.id, transcript);
    
    // Emit transcript event
    this.emit(ConversationEvents.TRANSCRIPT_RECEIVED, transcript);
    this.emitStateChanged();
  }
  
  /**
   * Handle translation message from WebSocket
   */
  private handleTranslation(message: TranslationMessage): void {
    // Find the corresponding transcript
    const transcript = this.transcripts.get(message.id);
    
    if (transcript) {
      // Update transcript with translation
      transcript.translation = message.text;
      transcript.targetLanguage = message.targetLanguage;
      
      // Store updated transcript
      this.transcripts.set(message.id, transcript);
      
      // Emit translation event
      this.emit(ConversationEvents.TRANSLATION_RECEIVED, transcript);
      this.emitStateChanged();
    }
  }
  
  /**
   * Handle TTS audio from WebSocket
   */
  private handleTTSAudio(audioData: ArrayBuffer): void {
    if (!this.audioContext) return;
    
    // Play TTS audio
    this.audioContext.decodeAudioData(audioData)
      .then(decodedData => {
        // Create audio buffer source
        const source = this.audioContext!.createBufferSource();
        source.buffer = decodedData;
        source.connect(this.audioContext!.destination);
        source.start(0);
        
        // Emit TTS audio event
        this.emit(ConversationEvents.TTS_AUDIO_RECEIVED);
      })
      .catch(error => {
        console.error('Error decoding TTS audio:', error);
      });
  }
  
  /**
   * Handle audio service errors
   */
  private handleAudioError(error: { code: string, message: string }): void {
    this.emit(ConversationEvents.ERROR, {
      code: `audio_${error.code}`,
      message: `Audio error: ${error.message}`
    });
  }
  
  /**
   * Handle WebSocket service errors
   */
  private handleWebSocketError(error: { code: string, message: string }): void {
    this.emit(ConversationEvents.ERROR, {
      code: `websocket_${error.code}`,
      message: `WebSocket error: ${error.message}`
    });
  }
  
  /**
   * Handle WebSocket connection status changes
   */
  private handleConnectionStatus(status: { connected: boolean }): void {
    if (!status.connected && this.isActive) {
      // WebSocket disconnected, stop conversation
      this.stop();
    }
  }
  
  /**
   * Get conversation state
   */
  public getState(): ConversationState {
    return {
      role: this.role,
      isActive: this.isActive,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      transcripts: Array.from(this.transcripts.values())
        .sort((a, b) => a.timestamp - b.timestamp),
      currentAudioLevel: this.currentAudioLevel
    };
  }
  
  /**
   * Play a translation via TTS
   */
  public playTranslation(text: string, language: string): void {
    webSocketService.requestTTS(text, language);
  }
  
  /**
   * Emit state changed event
   */
  private emitStateChanged(): void {
    this.emit(ConversationEvents.STATE_CHANGED, this.getState());
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    
    // Clean up audio resources
    audioService.dispose();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Create singleton instance
const conversationService = new ConversationService();
export default conversationService;

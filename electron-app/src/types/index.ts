// Types for the Verby application

/**
 * Session related types
 */
export interface Session {
  id: string;
  name: string;
  createdAt: string;
  status: 'active' | 'ended';
  participants: number;
}

/**
 * Transcript related types
 */
export interface Transcript {
  id: string;
  text: string;
  translation?: string;
  timestamp: number;
  isSelf: boolean;
  isFinal: boolean;
  sourceLanguage: string;
  targetLanguage?: string;
}

/**
 * Audio related types
 */
export interface AudioLevel {
  instant: number; // 0-1 scale
  slow: number;    // 0-1 scale, smoothed
  clip: boolean;   // True if audio is clipping
}

/**
 * Language related types
 */
export interface Language {
  code: string;    // e.g. 'en-US'
  name: string;    // e.g. 'English (US)'
}

/**
 * WebSocket message types
 */
export enum MessageType {
  TRANSCRIPT = 'transcript',
  TRANSLATION = 'translation',
  CONFIG = 'config',
  AUDIO = 'audio',
  TTS = 'tts',
  ERROR = 'error',
  SESSION_UPDATE = 'session_update',
  CONNECTION_STATUS = 'connection_status',
}

export interface WebSocketMessage {
  type: MessageType;
  data: any;
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
  role?: 'speaker' | 'listener';
  sourceLanguage?: string;
  targetLanguage?: string;
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

/**
 * Electron API types
 */
export interface ElectronAPI {
  ping: () => Promise<string>;
  
  createSession: (name: string) => Promise<{
    success: boolean;
    sessionId: string;
    name: string;
  }>;
  
  joinSession: (sessionId: string) => Promise<{
    success: boolean;
    sessionId: string;
  }>;
  
  exportTranscript: (transcripts: Transcript[], filename: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  
  getAppVersion: () => string;
}

// Extend Window interface to include the Electron API
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

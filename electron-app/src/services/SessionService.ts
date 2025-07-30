// SessionService.ts
// This service handles session management for the application

import webSocketService from './WebSocketService';

export interface Session {
  id: string;
  name: string;
  createdAt: Date;
  status: 'active' | 'ended';
  participants: number;
}

class SessionService {
  private currentSession: Session | null = null;
  private activeSessionPromise: Promise<{ success: boolean, sessionId: string }> | null = null;
  
  /**
   * Create a new session
   */
  public async createSession(name: string): Promise<{ success: boolean; sessionId: string; name: string }> {
    try {
      // Check if we have the Electron API
      if (window.electronAPI?.createSession) {
        const result = await window.electronAPI.createSession(name);
        
        if (result.success) {
          // Store session information
          this.currentSession = {
            id: result.sessionId,
            name: result.name,
            createdAt: new Date(),
            status: 'active',
            participants: 1
          };
          
          // Connect to WebSocket for this session
          await webSocketService.connect(result.sessionId);
        }
        
        return result;
      }
      
      // Fallback for web browser testing
      const mockSessionId = `session-${Date.now()}`;
      
      // Store mock session
      this.currentSession = {
        id: mockSessionId,
        name: name,
        createdAt: new Date(),
        status: 'active',
        participants: 1
      };
      
      return { success: true, sessionId: mockSessionId, name };
    } catch (error) {
      console.error('Failed to create session:', error);
      return { success: false, sessionId: '', name: '' };
    }
  }
  
  /**
   * Join an existing session
   */
  public async joinSession(sessionId: string): Promise<{ success: boolean; sessionId: string }> {
    try {
      // Avoid duplicate join requests
      if (this.activeSessionPromise) {
        return this.activeSessionPromise;
      }
      
      this.activeSessionPromise = new Promise(async (resolve) => {
        try {
          // Check if we have the Electron API
          if (window.electronAPI?.joinSession) {
            const result = await window.electronAPI.joinSession(sessionId);
            
            if (result.success) {
              // Store session information (name will be updated via WebSocket)
              this.currentSession = {
                id: result.sessionId,
                name: 'Joined Session', // Will be updated later
                createdAt: new Date(),
                status: 'active',
                participants: 2 // Assuming there's at least one other participant
              };
              
              // Connect to WebSocket for this session
              await webSocketService.connect(result.sessionId);
            }
            
            this.activeSessionPromise = null;
            resolve(result);
            return;
          }
          
          // Fallback for web browser testing
          this.currentSession = {
            id: sessionId,
            name: 'Test Session',
            createdAt: new Date(),
            status: 'active',
            participants: 2
          };
          
          this.activeSessionPromise = null;
          resolve({ success: true, sessionId });
        } catch (error) {
          console.error('Failed to join session:', error);
          this.activeSessionPromise = null;
          resolve({ success: false, sessionId: '' });
        }
      });
      
      return this.activeSessionPromise;
    } catch (error) {
      console.error('Failed to join session:', error);
      return { success: false, sessionId: '' };
    }
  }
  
  /**
   * Leave the current session
   */
  public leaveSession(): void {
    // Disconnect WebSocket
    webSocketService.disconnect();
    
    // Clear current session
    this.currentSession = null;
  }
  
  /**
   * Get current session
   */
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }
  
  /**
   * Update session info (called when receiving session updates from WebSocket)
   */
  public updateSessionInfo(update: Partial<Session>): void {
    if (this.currentSession && update) {
      this.currentSession = {
        ...this.currentSession,
        ...update
      };
    }
  }
  
  /**
   * Check if currently in a session
   */
  public isInSession(): boolean {
    return this.currentSession !== null && this.currentSession.status === 'active';
  }
}

// Create singleton instance
const sessionService = new SessionService();
export default sessionService;

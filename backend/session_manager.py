"""
Session Manager Module for VerbyFlow
Handles session creation, joining, and call pairing between users
"""

import logging
import uuid
import asyncio
from typing import Dict, Set, Optional, List, Any
from datetime import datetime, timedelta
from fastapi import WebSocket
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verbyflow.session")

class Session:
    """
    Represents a conversation session between two or more participants
    """
    def __init__(self, session_id: str, name: str = "", max_participants: int = 2):
        self.session_id = session_id
        self.name = name if name else f"Session {session_id[:8]}"
        self.created_at = datetime.now()
        self.max_participants = max_participants
        self.participants: Dict[WebSocket, Dict[str, Any]] = {}
        self.last_activity = datetime.now()
    
    def add_participant(self, websocket: WebSocket, user_info: Dict[str, Any]) -> bool:
        """Add a participant to the session"""
        if len(self.participants) >= self.max_participants:
            return False
        
        self.participants[websocket] = user_info
        self.last_activity = datetime.now()
        return True
    
    def remove_participant(self, websocket: WebSocket) -> bool:
        """Remove a participant from the session"""
        if websocket in self.participants:
            del self.participants[websocket]
            self.last_activity = datetime.now()
            return True
        return False
    
    def get_participant_count(self) -> int:
        """Get the number of participants in the session"""
        return len(self.participants)
    
    def is_full(self) -> bool:
        """Check if the session is full"""
        return len(self.participants) >= self.max_participants
    
    def is_empty(self) -> bool:
        """Check if the session is empty"""
        return len(self.participants) == 0
    
    def get_other_participants(self, websocket: WebSocket) -> List[WebSocket]:
        """Get all other participants except the given one"""
        return [ws for ws in self.participants.keys() if ws != websocket]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "participant_count": len(self.participants),
            "max_participants": self.max_participants
        }

class SessionManager:
    """
    Manages all active sessions and provides methods for session operations
    """
    def __init__(self):
        self.sessions: Dict[str, Session] = {}
        self.client_sessions: Dict[WebSocket, str] = {}
        self.cleanup_task = None
    
    def create_session(self, name: str = "", max_participants: int = 2) -> Session:
        """Create a new session"""
        session_id = str(uuid.uuid4())
        session = Session(session_id, name, max_participants)
        self.sessions[session_id] = session
        logger.info(f"Created session: {session_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID"""
        return self.sessions.get(session_id)
    
    def get_client_session(self, websocket: WebSocket) -> Optional[Session]:
        """Get the session for a client"""
        session_id = self.client_sessions.get(websocket)
        if session_id:
            return self.get_session(session_id)
        return None
    
    def join_session(self, session_id: str, websocket: WebSocket, user_info: Dict[str, Any]) -> bool:
        """Join a session by ID"""
        session = self.get_session(session_id)
        if not session:
            logger.warning(f"Attempted to join non-existent session: {session_id}")
            return False
        
        if session.is_full():
            logger.warning(f"Attempted to join full session: {session_id}")
            return False
        
        # Add to session
        if session.add_participant(websocket, user_info):
            self.client_sessions[websocket] = session_id
            logger.info(f"Client joined session: {session_id}")
            return True
        
        return False
    
    def leave_session(self, websocket: WebSocket) -> bool:
        """Leave the current session"""
        session = self.get_client_session(websocket)
        if not session:
            return False
        
        session_id = session.session_id
        
        # Remove from session
        if session.remove_participant(websocket):
            del self.client_sessions[websocket]
            logger.info(f"Client left session: {session_id}")
            
            # Clean up empty sessions
            if session.is_empty():
                del self.sessions[session_id]
                logger.info(f"Removed empty session: {session_id}")
                
            return True
        
        return False
    
    def get_available_sessions(self) -> List[Dict[str, Any]]:
        """Get list of available (non-full) sessions"""
        return [
            session.to_dict() for session in self.sessions.values() 
            if not session.is_full()
        ]
    
    def get_session_participants(self, session_id: str) -> List[WebSocket]:
        """Get all participants in a session"""
        session = self.get_session(session_id)
        if not session:
            return []
        return list(session.participants.keys())
    
    def get_other_session_participants(self, websocket: WebSocket) -> List[WebSocket]:
        """Get other participants in the client's session"""
        session = self.get_client_session(websocket)
        if not session:
            return []
        return session.get_other_participants(websocket)
    
    def broadcast_to_session(self, websocket: WebSocket, message: Dict) -> int:
        """Broadcast a message to all other participants in the session"""
        others = self.get_other_session_participants(websocket)
        if not others:
            return 0
        
        # Create async tasks to send messages
        tasks = []
        for other in others:
            tasks.append(asyncio.create_task(other.send_json(message)))
        
        # Return number of recipients
        return len(tasks)
    
    async def start_cleanup_task(self):
        """Start the background task to clean up inactive sessions"""
        if self.cleanup_task is None or self.cleanup_task.done():
            self.cleanup_task = asyncio.create_task(self._cleanup_inactive_sessions())
    
    async def _cleanup_inactive_sessions(self):
        """Periodically clean up inactive sessions"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                now = datetime.now()
                inactive_threshold = now - timedelta(minutes=30)
                
                # Find inactive sessions
                inactive_sessions = [
                    session_id for session_id, session in self.sessions.items()
                    if session.last_activity < inactive_threshold
                ]
                
                # Remove inactive sessions
                for session_id in inactive_sessions:
                    logger.info(f"Removing inactive session: {session_id}")
                    del self.sessions[session_id]
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in session cleanup: {str(e)}")

# Create global session manager instance
session_manager = SessionManager()

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, WebSocket, Response, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any, Union
import uvicorn
import logging
import asyncio
from datetime import datetime
import json
import os
import base64

# Import custom modules
from speech_recognition import transcribe_audio
from translation import translate_text
from text_to_speech import text_to_speech
from streaming_transcription import StreamingTranscriber
from message_queue import MessageQueue, ClientMessageManager
from session_manager import session_manager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("verbyflow")

# Initialize FastAPI app
app = FastAPI(title="VerbyFlow Backend API", description="Backend API for VerbyFlow real-time bilingual call translation")

# Add CORS middleware to allow requests from Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Models for request/response data
class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str

class SpeakRequest(BaseModel):
    text: str
    language: str
    voice: Optional[str] = None

class TranscriptionResponse(BaseModel):
    text: str
    confidence: float

class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str

# Connected WebSocket clients
active_connections: List[WebSocket] = []

# Store client configurations
client_configs: Dict[WebSocket, Dict[str, str]] = {}

# Message queue manager for bidirectional communication
message_manager = ClientMessageManager()

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "0.1.0"}

@app.get("/sessions")
async def list_sessions():
    """List all available sessions"""
    return {
        "status": "ok",
        "sessions": session_manager.get_available_sessions()
    }

@app.post("/sessions")
async def create_session(name: str = "", max_participants: int = 2):
    """Create a new session"""
    session = session_manager.create_session(name, max_participants)
    return {
        "status": "ok",
        "session": session.to_dict()
    }

@app.post("/speech-to-text", response_model=TranscriptionResponse)
async def speech_to_text(audio_file: UploadFile = File(...)):
    """
    Convert speech audio to text using Whisper streaming
    """
    try:
        logger.info(f"Received audio file: {audio_file.filename}")
        
        # Process audio with our speech recognition module
        transcribed_text, confidence = await transcribe_audio(audio_file.file)
        
        return TranscriptionResponse(
            text=transcribed_text,
            confidence=confidence
        )
    except Exception as e:
        logger.error(f"Error in speech-to-text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Speech recognition error: {str(e)}")

@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslateRequest):
    """
    Translate text from source language to target language
    """
    try:
        logger.info(f"Translating: {request.text} from {request.source_language} to {request.target_language}")
        
        # Use our translation module
        original_text, translated_text, detected_source = await translate_text(
            request.text,
            request.source_language,
            request.target_language
        )
        
        return TranslationResponse(
            original_text=original_text,
            translated_text=translated_text,
            source_language=detected_source,
            target_language=request.target_language
        )
    except Exception as e:
        logger.error(f"Error in translate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@app.post("/speak")
async def speak(request: SpeakRequest):
    """
    Convert text to speech using Edge TTS
    """
    try:
        voice = request.voice or None
        logger.info(f"Text-to-speech request: '{request.text}' in {request.language} using voice {voice or 'default'}")
        
        # Generate speech audio using our TTS module
        audio_data, content_type = await text_to_speech(
            request.text,
            request.language,
            voice
        )
        
        if not audio_data:
            raise HTTPException(status_code=500, detail="Failed to generate speech audio")
        
        # Return the audio file
        return Response(
            content=audio_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech.mp3"
            }
        )
    except Exception as e:
        logger.error(f"Error in speak: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech error: {str(e)}")

# Store transcribers for each active connection
active_transcribers: Dict[WebSocket, StreamingTranscriber] = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time communication and audio streaming
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    # Generate a unique client ID based on the connection object
    client_id = str(id(websocket))
    
    # Initialize a transcriber for this connection
    transcriber = StreamingTranscriber()
    active_transcribers[websocket] = transcriber
    
    # Initialize client config with defaults
    client_configs[websocket] = {
        "source_language": "en",
        "target_language": "es",
        "role": "speaker",  # Default role is speaker
        "client_id": client_id,
        "session_id": None,  # No session initially
        "username": f"User-{client_id[:8]}"
    }
    
    # Create message queue for this client
    client_queue = message_manager.get_queue(client_id)
    
    # Define an audio processor function
    async def process_audio(audio_data):
        if client_configs[websocket]["role"] == "speaker":
            transcriber.add_audio_chunk(audio_data)
    
    # Add the processor to the queue
    client_queue.add_processor(process_audio)
    
    # Start a background task for sending transcriptions
    transcription_task = asyncio.create_task(
        handle_transcriptions(websocket, transcriber)
    )
    
    # Start session manager cleanup task if not already running
    asyncio.create_task(session_manager.start_cleanup_task())
    
    try:
        while True:
            # Receive data - could be text (JSON) or binary (audio)
            data = await websocket.receive()
            
            if "text" in data:  # Text message (JSON)
                try:
                    message = json.loads(data["text"])
                    message_type = message.get("type")
                    logger.info(f"Received message type: {message_type}")
                    
                    if message_type == "config":
                        # Update language settings
                        if "source_language" in message:
                            source_language = message["source_language"]
                            client_configs[websocket]["source_language"] = source_language
                            transcriber.set_language(source_language)
                            logger.info(f"Source language set to: {source_language}")
                            
                        if "target_language" in message:
                            target_language = message["target_language"]
                            client_configs[websocket]["target_language"] = target_language
                            logger.info(f"Target language set to: {target_language}")
                            
                        if "role" in message:
                            role = message["role"]
                            client_configs[websocket]["role"] = role
                            logger.info(f"Client role set to: {role}")
                            
                        if "username" in message:
                            username = message["username"]
                            client_configs[websocket]["username"] = username
                            logger.info(f"Username set to: {username}")
                        
                        # Send confirmation
                        await websocket.send_json({
                            "type": "config_updated",
                            "config": client_configs[websocket],
                            "timestamp": datetime.now().isoformat()
                        })
                        
                    elif message_type == "session_create":
                        # Create a new session
                        session_name = message.get("name", "")
                        max_participants = message.get("max_participants", 2)
                        
                        # Create the session
                        session = session_manager.create_session(session_name, max_participants)
                        
                        # Join the new session
                        user_info = {
                            "username": client_configs[websocket].get("username", f"User-{client_id[:8]}"),
                            "role": client_configs[websocket].get("role", "speaker"),
                            "source_language": client_configs[websocket].get("source_language", "en"),
                            "target_language": client_configs[websocket].get("target_language", "es")
                        }
                        
                        if session_manager.join_session(session.session_id, websocket, user_info):
                            # Update client config
                            client_configs[websocket]["session_id"] = session.session_id
                            
                            # Send confirmation
                            await websocket.send_json({
                                "type": "session_created",
                                "session": session.to_dict(),
                                "timestamp": datetime.now().isoformat()
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Failed to join newly created session",
                                "timestamp": datetime.now().isoformat()
                            })
                            
                    elif message_type == "session_join":
                        # Join an existing session
                        session_id = message.get("session_id")
                        if not session_id:
                            await websocket.send_json({
                                "type": "error",
                                "message": "No session ID provided",
                                "timestamp": datetime.now().isoformat()
                            })
                            continue
                            
                        # Prepare user info
                        user_info = {
                            "username": client_configs[websocket].get("username", f"User-{client_id[:8]}"),
                            "role": client_configs[websocket].get("role", "speaker"),
                            "source_language": client_configs[websocket].get("source_language", "en"),
                            "target_language": client_configs[websocket].get("target_language", "es")
                        }
                        
                        # Join the session
                        if session_manager.join_session(session_id, websocket, user_info):
                            # Update client config
                            client_configs[websocket]["session_id"] = session_id
                            session = session_manager.get_session(session_id)
                            
                            # Send confirmation to client
                            await websocket.send_json({
                                "type": "session_joined",
                                "session": session.to_dict(),
                                "timestamp": datetime.now().isoformat()
                            })
                            
                            # Notify other participants
                            other_participants = session_manager.get_other_session_participants(websocket)
                            for other in other_participants:
                                try:
                                    await other.send_json({
                                        "type": "participant_joined",
                                        "username": user_info["username"],
                                        "timestamp": datetime.now().isoformat()
                                    })
                                except Exception as e:
                                    logger.error(f"Error notifying participant: {str(e)}")
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Failed to join session. It may be full or no longer exists.",
                                "timestamp": datetime.now().isoformat()
                            })
                            
                    elif message_type == "session_leave":
                        # Leave current session
                        current_session_id = client_configs[websocket].get("session_id")
                        if current_session_id and session_manager.leave_session(websocket):
                            # Update client config
                            client_configs[websocket]["session_id"] = None
                            
                            # Send confirmation
                            await websocket.send_json({
                                "type": "session_left",
                                "message": "Successfully left session",
                                "timestamp": datetime.now().isoformat()
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Not in a session or failed to leave",
                                "timestamp": datetime.now().isoformat()
                            })
                    elif message_type == "ping":
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": datetime.now().isoformat()
                        })
                except json.JSONDecodeError:
                    logger.error("Invalid JSON message received")
                    
            elif "bytes" in data:  # Binary message (audio)
                audio_data = data["bytes"]
                if audio_data and len(audio_data) > 0:
                    client_role = client_configs[websocket].get("role", "speaker")
                    client_id = client_configs[websocket].get("client_id")
                    
                    # Add to message queue for async processing
                    if client_id:
                        # Add audio chunk to the queue
                        message_manager.add_message(client_id, audio_data)
                        
                        # If not in speaker role, notify client
                        if client_role != "speaker":
                            logger.info(f"Audio chunk received from client in {client_role} role, queuing but not processing")
                            await websocket.send_json({
                                "type": "role_info",
                                "message": "Audio queued but not processed: client is in listener role",
                                "role": client_role,
                                "queue_size": message_manager.get_queue(client_id).size(),
                                "timestamp": datetime.now().isoformat()
                            })
                    else:
                        # Fallback for clients without ID - direct processing
                        if client_role == "speaker":
                            transcriber.add_audio_chunk(audio_data)
    
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        # Get client ID before cleaning up configs
        client_id = client_configs.get(websocket, {}).get("client_id")
        
        # Clean up resources
        if websocket in active_transcribers:
            active_transcribers[websocket].stop()
            del active_transcribers[websocket]
        
        if websocket in active_connections:
            active_connections.remove(websocket)
        
        if websocket in client_configs:
            del client_configs[websocket]
            
        # Clean up message queue if client ID exists
        if client_id:
            message_manager.remove_client(client_id)
            logger.info(f"Removed message queue for client {client_id}")
            
        # Cancel the transcription task
        if transcription_task:
            transcription_task.cancel()
            
        logger.info("Connection cleaned up")


async def handle_transcriptions(websocket: WebSocket, transcriber: StreamingTranscriber):
    """
    Background task to send transcriptions to the client as they become available
    """
    try:
        async for text, confidence in transcriber.get_transcriptions():
            if text:
                # Send transcription to client
                await websocket.send_json({
                    "type": "transcription",
                    "text": text,
                    "confidence": confidence,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Also translate the text if it's not empty
                if text.strip():
                    # Get client config from connection data
                    source_lang = client_configs[websocket]["source_language"]
                    target_lang = client_configs[websocket]["target_language"]
                    
                    try:
                        # Translate the text
                        original_text, translation, detected_source = await translate_text_async(text, source_lang, target_lang)
                        
                        # Send translation to client
                        await websocket.send_json({
                            "type": "translation",
                            "original_text": original_text,
                            "translated_text": translation,
                            "detected_source_language": detected_source,
                            "source_language": source_lang,
                            "target_language": target_lang,
                            "timestamp": datetime.now().isoformat()
                        })
                    except Exception as e:
                        logger.error(f"Translation error: {str(e)}")
                
    except asyncio.CancelledError:
        # Task was cancelled, just exit
        pass
    except Exception as e:
        logger.error(f"Error in transcription handling: {str(e)}")


async def translate_text_async(text: str, source_language: str, target_language: str) -> str:
    """
    Asynchronous wrapper for translate_text function
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, lambda: translate_text(text, source_language, target_language)
    )

if __name__ == "__main__":
    # Run the server
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

"""
Streaming Transcription Module for VerbyFlow

This module handles real-time speech-to-text conversion using Whisper streaming.
"""
import os
import logging
import tempfile
import time
from typing import BinaryIO, Dict, Any, Tuple, List, Optional, Callable, AsyncGenerator
import asyncio
import threading
import wave
import numpy as np
from io import BytesIO
import whisper
import queue

# Configure logging
logger = logging.getLogger("verbyflow-streaming")

# Global model reference
_model = None

# Function to get or initialize the Whisper model
def get_whisper_model(model_name="small.en"):
    global _model
    
    # Only load the model if it hasn't been loaded yet
    if _model is None:
        try:
            logger.info(f"Loading Whisper model '{model_name}'...")
            _model = whisper.load_model(model_name)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            # Re-raise with more context for debugging
            raise RuntimeError(f"Failed to load Whisper model '{model_name}': {str(e)}") from e
    
    return _model

class AudioBuffer:
    """A buffer for collecting audio chunks for streaming transcription"""
    
    def __init__(self, sample_rate=16000, chunk_size=4096):
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.buffer = []
        self.buffer_lock = threading.Lock()
        self.total_samples = 0
        self.last_transcription_end = 0
        
    def add_chunk(self, audio_chunk: bytes):
        """Add an audio chunk to the buffer"""
        with self.buffer_lock:
            self.buffer.append(audio_chunk)
            # Approximate samples based on chunk size
            # Assuming 16-bit PCM audio (2 bytes per sample)
            self.total_samples += len(audio_chunk) // 2
    
    def get_new_audio(self) -> Optional[bytes]:
        """Get accumulated audio since last transcription"""
        with self.buffer_lock:
            if not self.buffer:
                return None
                
            # Combine all chunks
            combined = b''.join(self.buffer)
            self.buffer = []
            
            return combined
    
    def clear(self):
        """Clear the buffer"""
        with self.buffer_lock:
            self.buffer = []
            self.total_samples = 0
            self.last_transcription_end = 0


class StreamingTranscriber:
    """Handles streaming audio transcription with Whisper"""
    
    def __init__(self, callback: Optional[Callable[[str, float], None]] = None, model_name="small.en"):
        """
        Initialize the streaming transcriber
        
        Args:
            callback: Optional callback function to call with transcription results
            model_name: Whisper model to use (default: small.en)
        """
        try:
            # Use the new model loading function
            self.model = get_whisper_model(model_name)
            logger.info(f"StreamingTranscriber initialized with model '{model_name}'")
        except Exception as e:
            logger.error(f"Failed to initialize StreamingTranscriber: {str(e)}")
            raise
            
        self.audio_buffer = AudioBuffer()
        self.callback = callback
        self.processing_thread = None
        self.running = False
        self.transcription_queue = queue.Queue()
        self.source_language = "en"
        
    def start(self):
        """Start the transcription processing thread"""
        if self.processing_thread is not None and self.processing_thread.is_alive():
            logger.warning("Transcription thread already running")
            return
            
        self.running = True
        self.processing_thread = threading.Thread(target=self._process_audio)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        logger.info("Streaming transcription started")
        
    def stop(self):
        """Stop the transcription processing thread"""
        self.running = False
        if self.processing_thread is not None:
            self.processing_thread.join(timeout=2.0)
            self.processing_thread = None
        self.audio_buffer.clear()
        logger.info("Streaming transcription stopped")
        
    def add_audio_chunk(self, chunk: bytes):
        """Add an audio chunk for transcription"""
        self.audio_buffer.add_chunk(chunk)
        
    def set_language(self, language_code: str):
        """Set the source language for transcription"""
        self.source_language = language_code
        
    def _process_audio(self):
        """Process audio chunks from the buffer in a separate thread"""
        logger.info("Audio processing thread started")
        
        while self.running:
            try:
                # Wait for enough audio to accumulate (about 1 second)
                time.sleep(0.5)
                
                # Get accumulated audio
                audio_data = self.audio_buffer.get_new_audio()
                if audio_data is None or len(audio_data) < 8000:  # Minimum size threshold
                    continue
                    
                # Process audio with Whisper
                result = self._transcribe_audio_chunk(audio_data)
                
                # Add result to queue for async retrieval
                if result:
                    self.transcription_queue.put(result)
                    
                    # Call callback if provided
                    if self.callback and result[0]:
                        self.callback(*result)
            except Exception as e:
                logger.error(f"Error in transcription thread: {str(e)}")
                
        logger.info("Audio processing thread stopped")
        
    def _transcribe_audio_chunk(self, audio_data: bytes) -> Tuple[str, float]:
        """
        Transcribe a chunk of audio data using Whisper
        
        Args:
            audio_data: Raw audio bytes
            
        Returns:
            Tuple of (transcribed_text, confidence_score)
        """
        try:
            # Create a temporary WAV file from the raw audio bytes
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_path = temp_audio.name
                
                # Convert raw audio to WAV format (16-bit PCM, mono, 16kHz)
                with wave.open(temp_audio.name, 'wb') as wav_file:
                    wav_file.setnchannels(1)  # mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(16000)  # 16kHz
                    wav_file.writeframes(audio_data)
            
            # Process with Whisper
            options = {
                "language": self.source_language,
                "task": "transcribe"
            }
            
            result = self.model.transcribe(temp_path, **options)
            
            # Delete temporary file
            try:
                os.unlink(temp_path)
            except:
                pass
            
            # Extract text and confidence
            text = result.get("text", "").strip()
            confidence = 1.0  # Whisper doesn't provide confidence scores
            
            logger.info(f"Transcribed: {text[:30]}{'...' if len(text) > 30 else ''}")
            return text, confidence
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            return "", 0.0
    
    async def get_transcriptions(self) -> AsyncGenerator[Tuple[str, float], None]:
        """
        Async generator to yield transcription results as they become available
        
        Yields:
            Tuple of (transcribed_text, confidence_score)
        """
        while self.running:
            try:
                # Check if there are any transcriptions in the queue
                if not self.transcription_queue.empty():
                    yield self.transcription_queue.get_nowait()
                else:
                    await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Error getting transcription: {str(e)}")
                await asyncio.sleep(0.1)

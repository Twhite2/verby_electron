"""
Speech Recognition Module for VerbyFlow

This module handles speech-to-text conversion using Whisper streaming.
"""
import os
import logging
import tempfile
from typing import BinaryIO, Dict, Any, Tuple
import asyncio
import whisper

# Configure logging
logger = logging.getLogger("verbyflow-stt")

# Initialize Whisper model - using 'small.en' model for English as specified in requirements
# This will be loaded when the module is imported
try:
    model = whisper.load_model("small.en")
    logger.info("Whisper model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {str(e)}")
    model = None

async def transcribe_audio(audio_data: BinaryIO) -> Tuple[str, float]:
    """
    Transcribe audio data using Whisper
    
    Args:
        audio_data: Binary audio data stream
        
    Returns:
        Tuple of (transcribed_text, confidence_score)
    """
    if model is None:
        logger.error("Whisper model not available")
        return "Error: Speech recognition model not available", 0.0
        
    try:
        # Create a temporary file to store the audio data
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            temp_path = temp_audio.name
            # Write audio data to the temporary file
            temp_audio.write(audio_data.read())
        
        # Process the audio file with Whisper in a separate thread to not block the event loop
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, lambda: model.transcribe(temp_path))
        
        # Extract text and confidence score
        transcribed_text = result["text"].strip()
        # Whisper doesn't provide a specific confidence score, so we use a placeholder
        # In a real implementation, we could calculate this based on token probabilities
        confidence_score = 0.95  
        
        logger.info(f"Transcription successful: {transcribed_text[:30]}...")
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        return transcribed_text, confidence_score
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return f"Error: {str(e)}", 0.0

# For testing purposes
if __name__ == "__main__":
    # This code runs when the script is executed directly
    print("Speech Recognition Module - Test Mode")
    print("This module should be imported by the main FastAPI application.")

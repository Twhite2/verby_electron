"""
Text-to-Speech Module for VerbyFlow

This module handles text-to-speech conversion using Edge TTS.
"""
import logging
import asyncio
import os
import tempfile
from typing import Dict, Any, Optional, BinaryIO, Tuple
import edge_tts

# Configure logging
logger = logging.getLogger("verbyflow-tts")

# Voice mapping for different languages
DEFAULT_VOICES = {
    "en": "en-US-ChristopherNeural",  # English (US)
    "es": "es-ES-AlvaroNeural",       # Spanish
    "fr": "fr-FR-HenriNeural",        # French
    "de": "de-DE-ConradNeural",       # German
    "it": "it-IT-DiegoNeural",        # Italian
    "pt": "pt-BR-AntonioNeural",      # Portuguese
    "ru": "ru-RU-DmitryNeural",       # Russian
    "ja": "ja-JP-KeitaNeural",        # Japanese
    "ko": "ko-KR-InJoonNeural",       # Korean
    "zh": "zh-CN-YunxiNeural",        # Chinese
    "ar": "ar-EG-ShakirNeural",       # Arabic
    "hi": "hi-IN-MadhurNeural",       # Hindi
}

async def text_to_speech(text: str, language: str, voice: Optional[str] = None) -> Tuple[bytes, str]:
    """
    Convert text to speech using Edge TTS
    
    Args:
        text: Text to synthesize
        language: Language code (ISO 639-1) like 'en', 'es', etc.
        voice: Optional specific voice to use, otherwise uses default for language
        
    Returns:
        Tuple of (audio_data, content_type)
    """
    if not text.strip():
        logger.warning("Empty text provided for TTS")
        return b"", "audio/mp3"
    
    try:
        # Select voice based on language
        selected_voice = voice or DEFAULT_VOICES.get(language.lower(), "en-US-ChristopherNeural")
        
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
            temp_path = temp_audio.name
        
        # Use Edge TTS to synthesize speech
        communicate = edge_tts.Communicate(text, selected_voice)
        await communicate.save(temp_path)
        
        # Read the generated audio file
        with open(temp_path, "rb") as audio_file:
            audio_data = audio_file.read()
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        logger.info(f"TTS synthesis successful: {len(audio_data)} bytes, voice={selected_voice}")
        return audio_data, "audio/mp3"
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        return b"", "audio/mp3"

# For testing purposes
if __name__ == "__main__":
    # This code runs when the script is executed directly
    print("Text-to-Speech Module - Test Mode")
    print("This module should be imported by the main FastAPI application.")

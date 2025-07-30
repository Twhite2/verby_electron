"""
Translation Module for VerbyFlow

This module handles translation using Google Translate API.
"""
import logging
from typing import Dict, Any, Tuple
import os
import json
import requests
from google.cloud import translate_v2 as translate

# Configure logging
logger = logging.getLogger("verbyflow-translate")

# Check if Google Cloud credentials are available
google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Initialize translation client if possible
try:
    if google_creds:
        translate_client = translate.Client()
        logger.info("Google Translate client initialized successfully")
    else:
        # Fallback to a simpler implementation for development
        translate_client = None
        logger.warning("Google Cloud credentials not found, using fallback translation")
except Exception as e:
    translate_client = None
    logger.error(f"Failed to initialize translation client: {str(e)}")

# Language code mapping (ISO 639-1 codes)
LANGUAGE_CODES = {
    "english": "en",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "russian": "ru",
    "japanese": "ja",
    "korean": "ko",
    "chinese": "zh",
    "arabic": "ar",
    "hindi": "hi",
}

async def translate_text(text: str, source_language: str, target_language: str) -> Tuple[str, str, str]:
    """
    Translate text from source language to target language
    
    Args:
        text: Text to translate
        source_language: Source language code or name
        target_language: Target language code or name
        
    Returns:
        Tuple of (original_text, translated_text, detected_source_language)
    """
    # Normalize language codes
    source_code = LANGUAGE_CODES.get(source_language.lower(), source_language.lower())
    target_code = LANGUAGE_CODES.get(target_language.lower(), target_language.lower())
    
    if not text.strip():
        logger.warning("Empty text provided for translation")
        return text, text, source_code
    
    try:
        if translate_client:
            # Use Google Cloud Translation API
            result = translate_client.translate(
                text,
                target_language=target_code,
                source_language=source_code if source_code != "auto" else None
            )
            translated_text = result["translatedText"]
            detected_source = result.get("detectedSourceLanguage", source_code)
            
            logger.info(f"Translation successful: {source_code} → {target_code}")
            return text, translated_text, detected_source
        else:
            # Fallback implementation - just append a prefix to simulate translation
            # This is just for development when API keys aren't available
            logger.warning("Using fallback translation (development mode)")
            translated_text = f"[{target_code}] {text}"
            return text, translated_text, source_code
            
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return text, f"Translation error: {str(e)}", source_code

# For testing purposes
if __name__ == "__main__":
    # This code runs when the script is executed directly
    print("Translation Module - Test Mode")
    print("This module should be imported by the main FastAPI application.")

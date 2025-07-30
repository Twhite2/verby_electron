# VerbyFlow Backend

This is the FastAPI backend for the VerbyFlow real-time bilingual call translation application.

## Features

- **Health Check**: Simple endpoint to verify server status
- **Speech-to-Text**: Converts audio to text using Whisper streaming
- **Translation**: Translates text between languages using Google Translate API
- **Text-to-Speech**: Converts text to speech using Edge TTS
- **WebSocket Support**: For real-time communication with the frontend

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up credentials (optional):
   - For Google Translate API: Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account key file path
   - Without credentials, the app will use fallback implementations for development

3. Start the server:
   ```bash
   python start_server.py
   ```

   The server will start on http://localhost:8000 by default

## API Endpoints

### Health Check
```
GET /
```
Returns server status and timestamp

### Speech-to-Text
```
POST /speech-to-text
```
Send an audio file to transcribe speech to text. Returns transcription and confidence score.

### Translation
```
POST /translate
```
Translate text between languages. Request body:
```json
{
  "text": "Text to translate",
  "source_language": "en",
  "target_language": "es"
}
```

### Text-to-Speech
```
POST /speak
```
Convert text to spoken audio. Request body:
```json
{
  "text": "Text to speak",
  "language": "en",
  "voice": "en-US-ChristopherNeural" // Optional
}
```
Returns audio file (MP3 format)

### WebSocket
```
WebSocket /ws
```
Connect to receive real-time updates and send audio streams

## Development

- The server uses hot-reloading in development mode
- Model files for Whisper will be downloaded automatically on first use
- Default voices for various languages are configured in the TTS module

## Integration with Electron Frontend

The frontend Electron application can communicate with this backend via:
- HTTP requests for speech-to-text, translation, and text-to-speech operations
- WebSocket for real-time streaming of audio and receiving transcriptions

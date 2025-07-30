# VerbyFlow - Real-time Bilingual Call Translation App

VerbyFlow is a desktop application that enables real-time bilingual conversation with audio capture, transcription, translation, and text-to-speech playback. The app consists of two main components:

1. **Frontend**: An Electron + React application for the user interface
2. **Backend**: A FastAPI server for speech recognition, translation, and text-to-speech services

## Project Structure

```
verby_electron/
├── backend/               # FastAPI backend
│   ├── main.py           # Main FastAPI application
│   ├── start_server.py   # Server startup script
│   ├── requirements.txt  # Python dependencies
│   └── ...               # Other backend modules
│
└── electron-app/         # Electron frontend
    ├── electron/         # Electron main process
    ├── src/              # React application source
    ├── package.json      # Node.js dependencies
    └── ...               # Configuration files
```

## Prerequisites

- **Node.js** (v16+) and npm
- **Python** (v3.9+)
- Internet connection for package installation

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment (Windows):
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the electron-app directory:
   ```bash
   cd electron-app
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Option 1: Run Backend and Frontend Separately

#### Start the Backend Server

1. In the backend directory, with the virtual environment activated:
   ```bash
   python start_server.py
   ```

2. The backend will be available at `http://localhost:8000`

#### Start the Frontend Development Server

1. In the electron-app directory, run:
   ```bash
   npm run dev
   ```

2. This will start a Vite development server at `http://localhost:5173`

#### Start the Electron Application

1. In the electron-app directory, run:
   ```bash
   npm run electron:start
   ```

2. This will launch the Electron application, which will connect to the Vite development server

### Option 2: Run Both Together (Recommended for Development)

1. Start both services in separate terminal windows:

   Terminal 1 (Backend):
   ```bash
   cd backend
   venv\Scripts\activate
   python start_server.py
   ```

   Terminal 2 (Frontend):
   ```bash
   cd electron-app
   npm run dev
   ```

   Terminal 3 (Electron App):
   ```bash
   cd electron-app
   npm run electron:start
   ```

## Key Features

- Real-time speech recognition using Whisper streaming
- Dynamic language translation between multiple languages
- Text-to-speech playback of translations
- Session-based call management
- Audio visualization and controls
- Transcript history and export capabilities

## Troubleshooting

- **Backend Connection Issues**: Ensure the backend is running on port 8000 and is accessible
- **Frontend Not Loading**: Check that the Vite development server is running properly
- **Electron App Crashes**: Verify that all dependencies are installed correctly
- **Audio Not Working**: Check browser/system permissions for microphone access

## Development Notes

- The backend WebSocket endpoint is available at `ws://localhost:8000/ws`
- Frontend development can be done using just the Vite server (`npm run dev`)
- For full application testing, both backend and Electron app must be running

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const isDev = process.env.NODE_ENV === 'development';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Keep a global reference of the window object to avoid garbage collection
let mainWindow = null;

// Store active sessions
const activeSessions = new Map();

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Verby - Real-time Call Translation',
    backgroundColor: '#121212'
  });

  // Set user data path for development to allow multiple instances
  if (isDev) {
    const userData = app.getPath('userData');
    const uniqueUserData = path.join(userData, `instance-${Date.now()}`);
    app.setPath('userData', uniqueUserData);
    console.log(`Development mode: Using unique userData path: ${uniqueUserData}`);
  }

  // Load app
  const isProd = process.env.NODE_ENV === 'production';
  const indexHtml = path.join(__dirname, '../dist/index.html');
  
  if (isProd) {
    mainWindow.loadFile(indexHtml);
  } else {
    // In development, load from the local server
    mainWindow.loadURL('http://localhost:5173/');
    
    // DevTools can be opened manually with Ctrl+Shift+I or from the menu
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  // Multi-instance support for development
  if (!isProd && process.env.INSTANCE_NAME) {
    const instanceName = process.env.INSTANCE_NAME || 'default';
    const userDataPath = path.join(app.getPath('appData'), `verbyflow-${instanceName}`);
    console.log(`[Dev] Using custom userData path: ${userDataPath}`);
    app.setPath('userData', userDataPath);
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// When Electron is ready, create window and set up app
app.whenReady().then(() => {
  try {
    createWindow();
    
    app.on('activate', () => {
      // On macOS re-create a window when dock icon is clicked and no windows are open
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    
    console.log('Electron app initialized successfully');
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC messages from renderer process
ipcMain.handle('ping', () => 'pong');

// Join session IPC
ipcMain.handle('join-session', (event, sessionId) => {
  console.log(`Joining session: ${sessionId}`);
  // Additional session joining logic will be here
  return { success: true, sessionId };
});

// Create session IPC
ipcMain.handle('create-session', (event, sessionName) => {
  const sessionId = `session-${Date.now()}`;
  console.log(`Creating session: ${sessionName}, ID: ${sessionId}`);
  // Additional session creation logic will be here
  return { success: true, sessionId, name: sessionName };
});

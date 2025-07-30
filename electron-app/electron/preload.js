// Preload script - connects the frontend to Electron's capabilities
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Session management functions
  createSession: async (name) => {
    try {
      return await ipcRenderer.invoke('create-session', name);
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, sessionId: '', name: '' };
    }
  },
  
  joinSession: async (sessionId) => {
    try {
      return await ipcRenderer.invoke('join-session', sessionId);
    } catch (error) {
      console.error('Error joining session:', error);
      return { success: false, sessionId: '' };
    }
  },
  
  // Transcript export function
  exportTranscript: async (transcripts, filename) => {
    try {
      return await ipcRenderer.invoke('export-transcript', transcripts, filename);
    } catch (error) {
      console.error('Error exporting transcript:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Audio device management
  getAudioDevices: async () => {
    try {
      return await ipcRenderer.invoke('get-audio-devices');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return { success: false, devices: [] };
    }
  },
  
  // App info functions
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // System functions
  openExternal: (url) => ipcRenderer.send('open-external-url', url),
  getAppVersion: () => process.env.npm_package_version,
});

console.log('Preload script has been loaded');

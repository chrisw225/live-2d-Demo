import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  toggleDebug: () => ipcRenderer.invoke('toggle-debug'),
  toggleClickThrough: () => ipcRenderer.invoke('toggle-click-through'),
  moveWindow: (deltaX: number, deltaY: number) => 
    ipcRenderer.invoke('move-window', deltaX, deltaY),
  
  // Platform info
  platform: process.platform,
  
  // Development mode check
  isDevelopment: process.env.NODE_ENV === 'development',
});

// Add type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      toggleDebug: () => Promise<boolean>;
      toggleClickThrough: () => Promise<boolean>;
      moveWindow: (deltaX: number, deltaY: number) => Promise<void>;
      platform: string;
      isDevelopment: boolean;
    };
  }
} 
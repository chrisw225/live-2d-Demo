import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  closeApp: () => ipcRenderer.invoke('close-app'),
  toggleClickThrough: () => ipcRenderer.invoke('toggle-click-through'),
  
  // Character interaction
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse-events', { ignore, options: { forward: true } }),
  moveWindow: (deltaX: number, deltaY: number) => ipcRenderer.send('window-move', { mouseX: deltaX, mouseY: deltaY }),
  
  // Character selection
  getAvailableCharacters: () => ipcRenderer.invoke('get-available-characters'),
  getDefaultCharacter: () => ipcRenderer.invoke('get-default-character'),
  
  // Listen for character switching from context menu
  onCharacterSwitch: (callback: (characterIndex: number) => void) => {
    ipcRenderer.on('switch-character', (event, characterIndex) => {
      callback(characterIndex);
    });
  },
  
  // Remove listener
  removeCharacterSwitchListener: () => {
    ipcRenderer.removeAllListeners('switch-character');
  }
});

// Add type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      // Window controls
      closeApp: () => Promise<void>;
      toggleClickThrough: () => Promise<boolean>;
      
      // Character interaction
      setIgnoreMouseEvents: (ignore: boolean) => void;
      moveWindow: (deltaX: number, deltaY: number) => void;
      
      // Character selection
      getAvailableCharacters: () => Promise<string[]>;
      getDefaultCharacter: () => Promise<number>;
      
      // Listen for character switching from context menu
      onCharacterSwitch: (callback: (characterIndex: number) => void) => void;
      
      // Remove listener
      removeCharacterSwitchListener: () => void;
    };
  }
} 
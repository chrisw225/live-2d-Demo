import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let isDebugMode = process.env.NODE_ENV === 'development';
let isClickThroughEnabled = false;

const createWindow = (): void => {
  // Get the primary display's work area
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: width - 820, // Position near right edge
    y: height - 620, // Position near bottom edge
    frame: false, // Frameless window
    transparent: true, // Transparent background
    alwaysOnTop: true, // Always on top
    skipTaskbar: true, // Don't show in taskbar
    resizable: isDebugMode, // Only resizable in debug mode
    movable: isDebugMode, // Only movable in debug mode
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: false, // Don't steal focus
    hasShadow: false, // No shadow
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow local file access for Live2D assets
    },
  });

  // Add debug border if in debug mode
  if (isDebugMode) {
    mainWindow.webContents.insertCSS(`
      body {
        border: 2px solid #ff0000 !important;
        box-sizing: border-box !important;
      }
      
      /* Debug info overlay */
      body::before {
        content: "DEBUG MODE - Live2D Electron App";
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        text-align: center;
      }
    `);
  }

  // Load the app
  if (isDebugMode) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5000');
    
    // Open DevTools in debug mode
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      
      // Set click-through in production (not debug mode)
      if (!isDebugMode) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        isClickThroughEnabled = true;
      }
    }
  });

  // Handle mouse events for dragging (only in debug mode)
  if (isDebugMode) {
    // Make window draggable in debug mode
    mainWindow.webContents.executeJavaScript(`
      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };
      
      document.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX;
        dragOffset.y = e.clientY;
      });
      
      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
      
      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const deltaX = e.clientX - dragOffset.x;
          const deltaY = e.clientY - dragOffset.y;
          window.electronAPI?.moveWindow(deltaX, deltaY);
        }
      });
    `);
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC messages
ipcMain.handle('toggle-debug', () => {
  isDebugMode = !isDebugMode;
  if (mainWindow) {
    mainWindow.reload();
  }
  return isDebugMode;
});

ipcMain.handle('toggle-click-through', () => {
  if (mainWindow) {
    isClickThroughEnabled = !isClickThroughEnabled;
    mainWindow.setIgnoreMouseEvents(isClickThroughEnabled, { forward: true });
    return isClickThroughEnabled;
  }
  return false;
});

ipcMain.handle('move-window', (event, deltaX: number, deltaY: number) => {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    mainWindow.setPosition(bounds.x + deltaX, bounds.y + deltaY);
  }
});

// Handle app ready
app.on('ready', () => {
  console.log('Electron app ready - Live2D Demo');
}); 
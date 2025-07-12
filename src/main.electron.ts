import { app, BrowserWindow, ipcMain, screen, Menu, MenuItem } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let isDebugMode = process.env.NODE_ENV === 'development';
let isClickThroughEnabled = false;

// Available characters (matching the order in lappdefine.ts)
const availableCharacters = [
  'Haru',
  'Hiyori',
  'Mark',
  'Natori',
  'Rice',
  'Mao',
  'Wanko'
];

const createWindow = (): void => {
  // Get the primary display's work area
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: Math.max(0, width - 820), // Position near right edge, but ensure it's visible
    y: Math.max(0, height - 620), // Position near bottom edge, but ensure it's visible
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
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow local file access for Live2D assets
    },
  });

  console.log('🪟 Window created with dimensions:', mainWindow.getBounds());
  console.log('🔧 Debug mode:', isDebugMode);
  console.log('📁 Loading from:', isDebugMode ? 'http://localhost:5000' : path.join(__dirname, 'index.html'));

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
    console.log('🌐 Loading from Vite dev server...');
    mainWindow.loadURL('http://localhost:5000').catch(err => {
      console.error('❌ Failed to load from dev server:', err);
      // Fallback to built files
      console.log('🔄 Falling back to built files...');
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    });
    
    // Open DevTools in debug mode
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    console.log('📁 Loading from built files...');
    const indexPath = path.join(__dirname, 'index.html');
    console.log('📄 Index file path:', indexPath);
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('❌ Failed to load index.html:', err);
    });
  }

  // Add error handling for web contents
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('🚫 Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle context menu (right click)
  mainWindow.webContents.on('context-menu', (event, params) => {
    showContextMenu(params.x, params.y);
  });

  // Handle window ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      console.log('🎭 Window ready to show');
      mainWindow.show();
      console.log('👀 Window shown');
      
      // Set click-through in production (not debug mode)
      if (!isDebugMode) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        isClickThroughEnabled = true;
        console.log('👆 Click-through enabled');
      }
    }
  });

  // Force show after a delay if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('⏰ Force showing window after timeout');
      mainWindow.show();
    }
  }, 3000);

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

// Show context menu on right click
const showContextMenu = (x: number, y: number): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Select Character',
      submenu: availableCharacters.map((character, index) => ({
        label: character,
        type: 'radio' as const,
        click: () => {
          if (mainWindow) {
            console.log(`🎭 Switching to character: ${character} (index: ${index})`);
            mainWindow.webContents.send('switch-character', index);
          }
        }
      }))
    },
    {
      type: 'separator'
    },
    {
      label: 'Close',
      click: () => {
        if (mainWindow) {
          console.log('👋 Closing app from context menu');
          mainWindow.close();
        }
      }
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({
    x: Math.round(x),
    y: Math.round(y)
  });
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

// Handle IPC communication
ipcMain.handle('get-available-characters', () => {
  return availableCharacters;
});

ipcMain.handle('get-default-character', () => {
  // Return Hiyori as default (index 1)
  return 1;
});

ipcMain.handle('close-app', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Handle app ready
app.on('ready', () => {
  console.log('Electron app ready - Live2D Demo');
}); 
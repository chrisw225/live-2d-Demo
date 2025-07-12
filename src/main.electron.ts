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
    frame: false, // Frameless window in both modes
    transparent: !isDebugMode, // Transparent in production, opaque in debug
    alwaysOnTop: true, // Always on top
    skipTaskbar: !isDebugMode, // Show in taskbar in debug mode
    resizable: isDebugMode, // Only resizable in debug mode
    movable: isDebugMode, // Only movable in debug mode
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true, // Allow focus to enable context menu events
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
    // In development, load from built files with debug styling
    console.log('🔧 Loading built files in debug mode...');
    const indexPath = path.join(__dirname, 'index.html');
    console.log('📄 Index file path:', indexPath);
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('❌ Failed to load index.html:', err);
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

  // In production mode, prevent the window from stealing focus
  if (!isDebugMode) {
    mainWindow.on('focus', () => {
      // Immediately blur the window to prevent focus stealing
      mainWindow?.blur();
    });
    
    // Also prevent the window from showing in Alt+Tab
    mainWindow.setSkipTaskbar(true);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('🎭 Window ready to show');
    mainWindow?.show();
    
    // In production mode, blur immediately after showing to prevent focus stealing
    if (!isDebugMode) {
      setTimeout(() => {
        mainWindow?.blur();
        console.log('🎭 Production mode: Window blurred to prevent focus stealing');
      }, 100);
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

// Show context menu on right click (only if over character)
const showContextMenu = (x: number, y: number): void => {
  // Check if the mouse is over the character using Live2D hit areas
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        try {
          // Get the canvas element
          const canvas = document.querySelector('canvas');
          if (!canvas) return false;
          
          // Get canvas bounds
          const rect = canvas.getBoundingClientRect();
          const canvasX = ${x} - rect.left;
          const canvasY = ${y} - rect.top;
          
          // Check if click is within canvas bounds
          if (canvasX < 0 || canvasX > rect.width || canvasY < 0 || canvasY > rect.height) {
            return false;
          }
          
          // Check if there's a Live2D model loaded and if we're clicking on the character
          if (window.appDelegate) {
            const manager = window.appDelegate.getLive2DManager();
            if (manager && manager._models && manager._models.getSize() > 0) {
              const model = manager._models.at(0);
              if (model && model.getModel()) {
                // Convert screen coordinates to Live2D coordinates
                const view = window.appDelegate._subdelegates.at(0)._view;
                const viewX = view.transformViewX(canvasX * window.devicePixelRatio);
                const viewY = view.transformViewY(canvasY * window.devicePixelRatio);
                
                // Check if click is on Head or Body hit areas
                const hitHead = model.hitTest("Head", viewX, viewY);
                const hitBody = model.hitTest("Body", viewX, viewY);
                
                console.log('Hit test results - Head:', hitHead, 'Body:', hitBody, 'Coords:', viewX, viewY);
                
                return hitHead || hitBody;
              }
            }
          }
          
          return false;
        } catch (e) {
          console.error('Error checking character hit:', e);
          return false;
        }
      })();
    `).then((isHit) => {
      if (isHit) {
        console.log('🎯 Right-click on character detected');
        // Get current character index and show menu
        getCharacterIndexAndShowMenu(x, y);
      } else {
        console.log('🎯 Right-click not on character, ignoring');
      }
    }).catch((error) => {
      console.error('Failed to check character hit:', error);
    });
  }
};

// Get current character index and show menu
const getCharacterIndexAndShowMenu = (x: number, y: number): void => {
  // Get current character index from the renderer
  let currentCharacterIndex = 1; // Default to Hiyori
  
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        try {
          if (window.appDelegate) {
            const manager = window.appDelegate.getLive2DManager();
            return manager ? manager.getCurrentCharacterIndex() : 1;
          }
          return 1;
        } catch (e) {
          console.error('Error getting current character index:', e);
          return 1;
        }
      })();
    `).then((index) => {
      currentCharacterIndex = index || 1;
      buildAndShowMenu(x, y, currentCharacterIndex);
    }).catch((error) => {
      console.error('Failed to get current character index:', error);
      buildAndShowMenu(x, y, 1); // Default to Hiyori
    });
  }
};

// Build and show the context menu
const buildAndShowMenu = (x: number, y: number, currentCharacterIndex: number): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Select Character',
      submenu: availableCharacters.map((character, index) => ({
        label: character,
        type: 'radio' as const,
        checked: index === currentCharacterIndex, // Set checked state based on current character
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
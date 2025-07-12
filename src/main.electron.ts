import { app, BrowserWindow, ipcMain, screen, Menu, MenuItem } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
// Clean desktop avatar mode - always production-like
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
  
  // Re-enable click-through after menu is closed
  menu.on('menu-will-close', () => {
    if (mainWindow) {
      setTimeout(() => {
        mainWindow?.setIgnoreMouseEvents(true, { forward: true });
        console.log('🎯 Re-enabled click-through after context menu closed');
      }, 100);
    }
  });
  
  menu.popup({
    x: Math.round(x),
    y: Math.round(y)
  });
};

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
    titleBarStyle: 'hidden', // Ensure no title bar
    transparent: true, // Always transparent for clean desktop avatar
    alwaysOnTop: true, // Always on top
    skipTaskbar: true, // Hide from taskbar for clean desktop avatar
    resizable: false, // Not resizable for clean desktop avatar
    movable: false, // Not movable for clean desktop avatar
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
  console.log('🎭 Clean desktop avatar mode');

  // Load the app - clean desktop avatar mode
  console.log('📁 Loading from built files...');
  const indexPath = path.join(__dirname, 'index.html');
  console.log('📄 Index file path:', indexPath);
  
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('❌ Failed to load index.html:', err);
  });

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
    console.log('🖱️ Context menu event received at:', params.x, params.y);
    
    // Temporarily disable click-through to show context menu
    if (isClickThroughEnabled && mainWindow) {
      mainWindow.setIgnoreMouseEvents(false);
      console.log('🎯 Temporarily disabled click-through for context menu');
    }
    
    showContextMenu(params.x, params.y);
  });

  // Add mouse enter/leave events to handle click-through dynamically
  mainWindow.webContents.on('cursor-changed', (event, type) => {
    // This helps us know when cursor changes, but we need a better approach
  });

  // Clean desktop avatar mode - prevent focus stealing
  mainWindow.on('focus', () => {
    // Immediately blur the window to prevent focus stealing
    mainWindow?.blur();
  });
  
  // Already set skipTaskbar to true in window options

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('🎭 Window ready to show');
    mainWindow?.show();
    
    // Clean desktop avatar mode - blur immediately after showing to prevent focus stealing
    setTimeout(() => {
      mainWindow?.blur();
      console.log('🎭 Clean desktop avatar mode: Window blurred, dynamic click-through will be handled');
      
      // Set up dynamic click-through based on mouse position
      setupDynamicClickThrough();
    }, 100);
  });

  // No dragging for clean desktop avatar mode
};

// Set up dynamic click-through based on mouse position
const setupDynamicClickThrough = (): void => {
  if (!mainWindow) return;
  
  // Track mouse position and dynamically enable/disable click-through
  let lastMouseX = 0;
  let lastMouseY = 0;
  let isOverCharacter = false;
  
  // Use a timer to periodically check mouse position
  const checkMousePosition = () => {
    if (!mainWindow) return;
    
    const mousePos = screen.getCursorScreenPoint();
    const windowBounds = mainWindow.getBounds();
    
    // Check if mouse is over this window
    const isOverWindow = mousePos.x >= windowBounds.x && 
                        mousePos.x <= windowBounds.x + windowBounds.width &&
                        mousePos.y >= windowBounds.y && 
                        mousePos.y <= windowBounds.y + windowBounds.height;
    
    if (isOverWindow) {
      const relativeX = mousePos.x - windowBounds.x;
      const relativeY = mousePos.y - windowBounds.y;
      
      // Check if over character using the same logic as context menu
      mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const canvas = document.querySelector('canvas');
            if (!canvas) return false;
            
            const rect = canvas.getBoundingClientRect();
            const canvasX = ${relativeX} - rect.left;
            const canvasY = ${relativeY} - rect.top;
            
            if (canvasX < 0 || canvasX > rect.width || canvasY < 0 || canvasY > rect.height) {
              return false;
            }
            
            if (window.appDelegate) {
              const manager = window.appDelegate.getLive2DManager();
              if (manager && manager._models && manager._models.getSize() > 0) {
                const model = manager._models.at(0);
                if (model && model.getModel()) {
                  const view = window.appDelegate._subdelegates.at(0)._view;
                  if (!view) return false;
                  
                  const deviceX = canvasX * window.devicePixelRatio;
                  const deviceY = canvasY * window.devicePixelRatio;
                  const viewX = view.transformViewX(deviceX);
                  const viewY = view.transformViewY(deviceY);
                  
                  const hitHead = model.hitTest("Head", viewX, viewY);
                  const hitBody = model.hitTest("Body", viewX, viewY);
                  
                  return hitHead || hitBody;
                }
              }
            }
            return false;
          } catch (e) {
            return false;
          }
        })();
      `).then((overChar) => {
        if (overChar !== isOverCharacter) {
          isOverCharacter = overChar;
          
          if (isOverCharacter) {
            // Over character - disable click-through
            mainWindow?.setIgnoreMouseEvents(false);
            isClickThroughEnabled = false;
          } else {
            // Over transparent area - enable click-through
            mainWindow?.setIgnoreMouseEvents(true, { forward: true });
            isClickThroughEnabled = true;
          }
        }
      }).catch(() => {
        // On error, disable click-through to be safe
        mainWindow?.setIgnoreMouseEvents(false);
        isClickThroughEnabled = false;
      });
    } else {
      // Mouse not over window - enable click-through
      if (!isClickThroughEnabled) {
        mainWindow?.setIgnoreMouseEvents(true, { forward: true });
        isClickThroughEnabled = true;
      }
    }
  };
  
  // Check mouse position every 100ms
  const mouseCheckInterval = setInterval(checkMousePosition, 100);
  
  // Clean up interval when window is closed
  mainWindow.on('closed', () => {
    clearInterval(mouseCheckInterval);
  });
  
  console.log('🎯 Dynamic click-through setup complete');
};

// Show context menu on right click (only if over character)
const showContextMenu = (x: number, y: number): void => {
  // Check if the mouse is over the character using Live2D hit areas
  if (mainWindow) {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        try {
          console.log('🖱️ Checking right-click at coordinates:', ${x}, ${y});
          
          // Get the canvas element
          const canvas = document.querySelector('canvas');
          if (!canvas) {
            console.log('❌ Canvas not found');
            return false;
          }
          
          // Get canvas bounds
          const rect = canvas.getBoundingClientRect();
          const canvasX = ${x} - rect.left;
          const canvasY = ${y} - rect.top;
          
          console.log('🎯 Canvas bounds:', rect.width, 'x', rect.height, 'Canvas pos:', canvasX, canvasY);
          
          // Check if click is within canvas bounds
          if (canvasX < 0 || canvasX > rect.width || canvasY < 0 || canvasY > rect.height) {
            console.log('❌ Click outside canvas bounds');
            return false;
          }
          
          // Check if there's a Live2D model loaded and if we're clicking on the character
          if (window.appDelegate) {
            const manager = window.appDelegate.getLive2DManager();
            if (manager && manager._models && manager._models.getSize() > 0) {
              const model = manager._models.at(0);
              if (model && model.getModel()) {
                // Get the view from the subdelegate for coordinate transformation
                const view = window.appDelegate._subdelegates.at(0)._view;
                if (!view) {
                  console.log('❌ View not found');
                  return false;
                }
                
                // Convert screen coordinates to Live2D coordinates following the same pattern as lappview.ts
                const deviceX = canvasX * window.devicePixelRatio;
                const deviceY = canvasY * window.devicePixelRatio;
                
                // Transform to view coordinates using the view's transformation methods
                const viewX = view.transformViewX(deviceX);
                const viewY = view.transformViewY(deviceY);
                
                // Check if click is on Head or Body hit areas
                const hitHead = model.hitTest("Head", viewX, viewY);
                const hitBody = model.hitTest("Body", viewX, viewY);
                
                console.log('🎯 Hit test results - Head:', hitHead, 'Body:', hitBody, 'Coords - device:', deviceX, deviceY, 'view:', viewX, viewY);
                
                return hitHead || hitBody;
              } else {
                console.log('❌ Model not loaded');
              }
            } else {
              console.log('❌ Manager or models not available');
            }
          } else {
            console.log('❌ AppDelegate not available');
          }
          
          return false;
        } catch (e) {
          console.error('❌ Error checking character hit:', e);
          return false;
        }
      })();
    `).then((isHit) => {
      console.log('🎯 Hit test result:', isHit);
      if (isHit) {
        console.log('🎯 Right-click on character detected, showing menu');
        // Get current character index and show menu
        getCharacterIndexAndShowMenu(x, y);
      } else {
        console.log('🎯 Right-click not on character, ignoring');
      }
    }).catch((error) => {
      console.error('❌ Failed to check character hit:', error);
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

// Handle IPC messages - debug mode removed for clean desktop avatar

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
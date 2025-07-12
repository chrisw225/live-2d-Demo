import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import * as path from 'path';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

function ensureTopMost(win: BrowserWindow): void {
  if (!win.isAlwaysOnTop()) {
    win.setAlwaysOnTop(true, 'screen-saver');
  }
}

const createWindow = (): void => {
  // Get the primary display's work area
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate 50% size and bottom-right position
  const windowWidth = Math.floor(screenWidth * 0.5);
  const windowHeight = Math.floor(screenHeight * 0.5);
  const windowX = screenWidth - windowWidth;
  const windowY = screenHeight - windowHeight;

  // Create the browser window - 50% size, bottom-right corner
  mainWindow = new BrowserWindow({
    width: windowWidth,         // 50% of screen width
    height: windowHeight,       // 50% of screen height
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    focusable: true,
    type: 'desktop',
    show: false,              // Don't show until ready
    webPreferences: {
      nodeIntegration: true,       // Enable like the sample
      contextIsolation: false,     // Disable like the sample
      zoomFactor: 1.0,
    },
    resizable: true,
    movable: true,
    skipTaskbar: true,
    maximizable: false,
  });

  console.log(`🪟 Window created: ${windowWidth}x${windowHeight} at position (${windowX}, ${windowY})`);

  // Apply settings exactly like the sample
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setMenu(null);
  mainWindow.setPosition(windowX, windowY); // Position at bottom-right corner

  // Load the app
  const indexPath = path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('❌ Failed to load index.html:', err);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Re-enforce alwaysOnTop when window loses focus like the sample
  mainWindow.on('blur', () => {
    if (mainWindow) {
      ensureTopMost(mainWindow);
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('🎭 Character ready to show');
    mainWindow?.show();
    
    // Ensure it's on top
    if (mainWindow) {
      ensureTopMost(mainWindow);
    }
  });

  // Continuous enforcement of alwaysOnTop like the sample
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      ensureTopMost(mainWindow);
    }
  }, 1000);

  // Add debug shortcut like the sample
  globalShortcut.register('F12', () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Remove title
  mainWindow.setTitle('');
  
  console.log('✨ Full-screen desktop character window configured like live-2d_sample');
};

// IPC handlers for character interaction like the sample project
ipcMain.on('set-ignore-mouse-events', (event, { ignore, options }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on('window-move', (event, { mouseX, mouseY }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const [currentX, currentY] = win.getPosition();
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    
    let newX = currentX + mouseX;
    let newY = currentY + mouseY;
    
    // Keep window within screen bounds
    newX = Math.max(-win.getBounds().width + 100, Math.min(newX, screenWidth - 100));
    newY = Math.max(-win.getBounds().height + 100, Math.min(newY, screenHeight - 100));
    
    win.setPosition(newX, newY);
  }
});



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
  // On macOS it is common for applications to stay open until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app ready
app.on('ready', () => {
  console.log('Electron app ready - Live2D Character');
});

// Clean up when app is about to quit
app.on('before-quit', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
}); 
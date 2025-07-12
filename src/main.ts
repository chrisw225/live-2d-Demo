/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
import * as LAppDefine from './lappdefine';

// Global reference to the app delegate for character switching
let appDelegate: LAppDelegate | null = null;

// Debug overlay elements
let debugOverlay: HTMLElement | null = null;
let isDebugMode = false;

/**
 * Create debug overlay for cursor tracking
 */
function createDebugOverlay(): void {
  debugOverlay = document.createElement('div');
  debugOverlay.id = 'debug-overlay';
  debugOverlay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    z-index: 10000;
    pointer-events: none;
    white-space: pre-line;
  `;
  document.body.appendChild(debugOverlay);
}

/**
 * Create cursor follower for real-time info
 */
function createCursorFollower(): HTMLElement {
  const follower = document.createElement('div');
  follower.id = 'cursor-follower';
  follower.style.cssText = `
    position: fixed;
    background: rgba(255, 0, 0, 0.9);
    color: white;
    padding: 5px 8px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    z-index: 10001;
    pointer-events: none;
    white-space: nowrap;
    transform: translate(10px, -30px);
  `;
  document.body.appendChild(follower);
  return follower;
}

/**
 * Check if pixel at given coordinates is transparent
 */
function isPixelTransparent(x: number, y: number): boolean {
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  if (!canvas) return true;
  
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
  if (!gl) return true;
  
  // Create a buffer to read pixel data
  const pixels = new Uint8Array(4);
  
  // Convert screen coordinates to canvas coordinates
  const rect = canvas.getBoundingClientRect();
  const canvasX = (x - rect.left) * (canvas.width / rect.width);
  const canvasY = (y - rect.top) * (canvas.height / rect.height);
  
  // Check if coordinates are within canvas
  if (canvasX < 0 || canvasX >= canvas.width || canvasY < 0 || canvasY >= canvas.height) {
    return true;
  }
  
  try {
    // Read pixel data (note: WebGL Y coordinate is flipped)
    gl.readPixels(canvasX, canvas.height - canvasY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // Check alpha channel (pixels[3])
    const alpha = pixels[3];
    return alpha < 128; // Consider semi-transparent as transparent
  } catch (e) {
    console.warn('Failed to read pixel data:', e);
    return true;
  }
}

/**
 * Check if cursor is over character using Live2D hit test
 */
function isOverCharacter(x: number, y: number): { head: boolean; body: boolean } {
  try {
    if (!appDelegate) return { head: false, body: false };
    
    const live2dManager = appDelegate.getLive2DManager();
    if (!live2dManager) return { head: false, body: false };
    
    // Get the canvas element
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return { head: false, body: false };
    
    // Get canvas bounds
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    // Check if click is within canvas bounds
    if (canvasX < 0 || canvasX > rect.width || canvasY < 0 || canvasY > rect.height) {
      return { head: false, body: false };
    }
    
    // Get the model from the manager
    if (!(live2dManager as any)._models || (live2dManager as any)._models.getSize() === 0) {
      return { head: false, body: false };
    }
    
    const model = (live2dManager as any)._models.at(0);
    if (!model || !model.getModel()) {
      return { head: false, body: false };
    }
    
    // Get the view from the subdelegate for coordinate transformation
    const view = (appDelegate as any)._subdelegates?.at(0)?._view;
    if (!view) {
      return { head: false, body: false };
    }
    
    // Convert screen coordinates to Live2D coordinates following the same pattern as lappview.ts
    // First convert to device coordinates (multiply by devicePixelRatio)
    const deviceX = canvasX * window.devicePixelRatio;
    const deviceY = canvasY * window.devicePixelRatio;
    
    // Then transform to view coordinates using the view's transformation methods
    const viewX = view.transformViewX(deviceX);
    const viewY = view.transformViewY(deviceY);
    
    // Test hit areas using the same names as defined in lappdefine.ts
    const headHit = model.hitTest("Head", viewX, viewY);
    const bodyHit = model.hitTest("Body", viewX, viewY);
    
    console.log(`🎯 Hit test: screen(${x}, ${y}) -> canvas(${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) -> device(${deviceX.toFixed(1)}, ${deviceY.toFixed(1)}) -> view(${viewX.toFixed(3)}, ${viewY.toFixed(3)}) -> Head:${headHit}, Body:${bodyHit}`);
    
    return { head: headHit, body: bodyHit };
  } catch (e) {
    console.warn('Error in isOverCharacter:', e);
    return { head: false, body: false };
  }
}

/**
 * Update debug information
 */
function updateDebugInfo(x: number, y: number): void {
  if (!debugOverlay) return;
  
  const isTransparent = isPixelTransparent(x, y);
  const hitTest = isOverCharacter(x, y);
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  
  let canvasInfo = 'Canvas: Not found';
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    canvasInfo = `Canvas: ${canvas.width}x${canvas.height}
Canvas Pos: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})
Canvas Rect: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`;
  }
  
  debugOverlay.textContent = `DEBUG MODE - Cursor Tracking
Screen Pos: (${x}, ${y})
${canvasInfo}
Transparent: ${isTransparent ? 'YES' : 'NO'}
Hit Head: ${hitTest.head ? 'YES' : 'NO'}
Hit Body: ${hitTest.body ? 'YES' : 'NO'}
Character Hit: ${hitTest.head || hitTest.body ? 'YES' : 'NO'}

Right-click should work: ${!isTransparent && (hitTest.head || hitTest.body) ? 'YES' : 'NO'}`;
}

/**
 * Update cursor follower
 */
function updateCursorFollower(follower: HTMLElement, x: number, y: number): void {
  const isTransparent = isPixelTransparent(x, y);
  const hitTest = isOverCharacter(x, y);
  
  follower.style.left = `${x}px`;
  follower.style.top = `${y}px`;
  follower.style.background = isTransparent ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 255, 0, 0.9)';
  follower.textContent = `T:${isTransparent ? 'Y' : 'N'} H:${hitTest.head ? 'Y' : 'N'} B:${hitTest.body ? 'Y' : 'N'}`;
}

/**
 * Initialize debug mode
 */
function initializeDebugMode(): void {
  if (isDebugMode) return;
  
  isDebugMode = true;
  console.log('🐛 Debug mode activated');
  
  // Create debug overlay
  createDebugOverlay();
  
  // Create cursor follower
  const cursorFollower = createCursorFollower();
  
  // Track mouse movement
  document.addEventListener('mousemove', (e) => {
    updateDebugInfo(e.clientX, e.clientY);
    updateCursorFollower(cursorFollower, e.clientX, e.clientY);
  });
  
  // Track right-click attempts
  document.addEventListener('contextmenu', (e) => {
    const isTransparent = isPixelTransparent(e.clientX, e.clientY);
    const hitTest = isOverCharacter(e.clientX, e.clientY);
    
    console.log('🖱️ Right-click detected:', {
      position: { x: e.clientX, y: e.clientY },
      transparent: isTransparent,
      hitTest: hitTest,
      shouldShowMenu: !isTransparent && (hitTest.head || hitTest.body)
    });
  });
  
  // Add keyboard shortcut to toggle debug mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.key === 'd')) {
      e.preventDefault();
      toggleDebugMode();
    }
  });
}

/**
 * Toggle debug mode
 */
function toggleDebugMode(): void {
  if (!isDebugMode) {
    initializeDebugMode();
  } else {
    // Remove debug elements
    if (debugOverlay) {
      debugOverlay.remove();
      debugOverlay = null;
    }
    
    const cursorFollower = document.getElementById('cursor-follower');
    if (cursorFollower) {
      cursorFollower.remove();
    }
    
    isDebugMode = false;
    console.log('🐛 Debug mode deactivated');
  }
}

/**
 * Switch to a different character
 * @param characterIndex Index of the character to switch to
 */
function switchCharacter(characterIndex: number): void {
  console.log(`🎭 Switching to character index: ${characterIndex}`);
  
  if (appDelegate) {
    const live2dManager = appDelegate.getLive2DManager();
    if (live2dManager) {
      live2dManager.changeScene(characterIndex);
      console.log(`✅ Character switched to: ${LAppDefine.ModelDir[characterIndex]}`);
    } else {
      console.error('❌ Live2D Manager not available');
    }
  } else {
    console.error('❌ App delegate not available');
  }
}

/**
 * Initialize character switching listeners
 */
function initializeCharacterSwitching(): void {
  // Listen for character switching from Electron IPC
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.onCharacterSwitch((characterIndex: number) => {
      console.log(`📡 Received character switch request: ${characterIndex}`);
      switchCharacter(characterIndex);
    });
    
    console.log('🔧 Character switching listeners initialized');
  } else {
    console.log('🌐 Running in browser mode - no Electron IPC available');
  }
}

/**
 * ブラウザロード後の処理
 */
window.addEventListener(
  'load',
  (): void => {
    // Initialize WebGL and create the application instance
    appDelegate = LAppDelegate.getInstance();
    
    if (!appDelegate.initialize()) {
      console.error('❌ Failed to initialize Live2D application');
      return;
    }

    // Initialize character switching
    initializeCharacterSwitching();

    // Start the application
    appDelegate.run();
    
    // Expose appDelegate globally for context menu access
    (window as any).appDelegate = appDelegate;
    
    console.log('🎭 Live2D application started with character switching support');
    
    // Auto-enable debug mode for now
    setTimeout(() => {
      initializeDebugMode();
      console.log('🐛 Debug mode auto-enabled. Use F12 or Ctrl+D to toggle.');
    }, 1000);
  },
  { passive: true }
);

/**
 * 終了時の処理
 */
window.addEventListener(
  'beforeunload',
  (): void => LAppDelegate.releaseInstance(),
  { passive: true }
);

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

// Clean desktop avatar - no debug elements needed

// Hit test functions removed for clean desktop avatar - handled in Electron main process

// Debug functions removed for clean desktop avatar

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
 * Initialize character interaction - like live-2d_sample
 */
function initializeCharacterInteraction(): void {
  // Add interaction after the character loads
  setTimeout(() => {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // Get the canvas element
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    console.log('🎮 Setting up character interaction (live-2d_sample style)');
    
    // Get the Live2D model for direct manipulation
    let currentModel: any = null;
    const checkModel = setInterval(() => {
      if (appDelegate) {
        const live2dManager = appDelegate.getLive2DManager();
        if (live2dManager) {
          const models = (live2dManager as any)._models;
          if (models && models.getSize() > 0) {
            currentModel = models.at(0);
            clearInterval(checkModel);
            console.log('🎮 Live2D model found for interaction');
            
            // Position character like live-2d_sample: bottom right area
            if (currentModel) {
              currentModel.y = window.innerHeight * 0.8;
              currentModel.x = window.innerWidth * 0.7; // Adjusted for our layout
              console.log(`🎭 Character positioned at x:${currentModel.x}, y:${currentModel.y}`);
            }
          }
        }
      }
    }, 100);
    
    // Clear interval after 10 seconds if model doesn't load
    setTimeout(() => clearInterval(checkModel), 10000);
    
    // Mouse down - start dragging the character
    canvas.addEventListener('mousedown', (e) => {
      if (!currentModel) return;
      
      e.preventDefault();
      isDragging = true;
      dragOffset.x = e.clientX - currentModel.x;
      dragOffset.y = e.clientY - currentModel.y;
      
      // Disable click-through during interaction
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
      
      console.log('🎮 Started dragging character');
    });
    
    // Mouse move - handle character dragging within canvas
    document.addEventListener('mousemove', (e) => {
      if (isDragging && currentModel) {
        // Move the character within the canvas, not the window
        currentModel.x = e.clientX - dragOffset.x;
        currentModel.y = e.clientY - dragOffset.y;
        
        // Keep character within screen bounds
        const margin = 100;
        currentModel.x = Math.max(margin, Math.min(currentModel.x, window.innerWidth - margin));
        currentModel.y = Math.max(margin, Math.min(currentModel.y, window.innerHeight - margin));
      }
    });
    
    // Mouse up - stop dragging
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        
        // Re-enable click-through after interaction
        setTimeout(() => {
          if (window.electronAPI) {
            window.electronAPI.setIgnoreMouseEvents(true);
          }
        }, 100);
        
        console.log('🎮 Stopped dragging character');
      }
    });
    
    // Mouse wheel - handle character scaling like live-2d_sample
    canvas.addEventListener('wheel', (e) => {
      if (!currentModel) return;
      
      e.preventDefault();
      
      const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
      const currentScale = currentModel.scale.x;
      const newScale = Math.max(0.3, Math.min(3.0, currentScale * scaleChange));
      
      // Scale the character model directly
      currentModel.scale.set(newScale);
      
      console.log(`🔍 Character scaled to: ${newScale.toFixed(2)}x`);
    });
    
    // Window resize handler like live-2d_sample
    window.addEventListener('resize', () => {
      if (currentModel) {
        // Keep character proportionally positioned
        const newX = Math.min(currentModel.x, window.innerWidth - 100);
        const newY = Math.min(currentModel.y, window.innerHeight - 100);
        currentModel.x = newX;
        currentModel.y = newY;
      }
    });
    
    console.log('🎮 Character interaction ready: drag to move, scroll to scale (live-2d_sample style)');
  }, 4000); // Wait for character to load
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

    // Initialize character interaction
    initializeCharacterInteraction();

    // Start the application
    appDelegate.run();
    
    // Expose appDelegate globally for context menu access
    (window as any).appDelegate = appDelegate;
    
    console.log('🎭 Live2D application started with interaction support');
    
    // Debug mode disabled for clean desktop avatar
    console.log('🎭 Clean desktop avatar mode - no debug overlay');
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

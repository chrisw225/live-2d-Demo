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
 * Initialize character interaction - like live-2d_sample with dynamic mouse event toggling
 */
function initializeCharacterInteraction(): void {
  // Add interaction after the character loads
  setTimeout(() => {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let mousePosition = { x: 0, y: 0 };
    
    // Get the canvas element
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('❌ Canvas not found for interaction');
      return;
    }
    
    console.log('🎮 Setting up character interaction (Live2D Cubism style with dynamic mouse events)');
    
    // Get the Live2D manager and models
    let currentModel: any = null;
    let live2dManager: any = null;
    
    const checkModel = setInterval(() => {
      if (appDelegate) {
        live2dManager = appDelegate.getLive2DManager();
        if (live2dManager) {
          const models = (live2dManager as any)._models;
          if (models && models.getSize() > 0) {
            currentModel = models.at(0);
            clearInterval(checkModel);
            console.log('🎮 Live2D model found for interaction');
            
            // Initialize character position - center in window
            if (currentModel) {
              // Position model in center of the small window
              currentModel.setPosition(window.innerWidth * 0.5, window.innerHeight * 0.8);
              console.log(`🎭 Character positioned at center of window`);
            }
          }
        }
      }
    }, 100);
    
    // Clear interval after 10 seconds if model doesn't load
    setTimeout(() => clearInterval(checkModel), 10000);
    
    // Function to check if mouse is over character (like live-2d_sample)
    function isMouseOverCharacter(mouseX: number, mouseY: number): boolean {
      if (!currentModel) return false;
      
      // Get model bounds - using a more generous area
      const modelMatrix = currentModel.getModelMatrix();
      const modelX = modelMatrix.getX();
      const modelY = modelMatrix.getY();
      
      // More generous bounds for easier interaction
      const characterWidth = 400;  // Increased for easier interaction
      const characterHeight = 500; // Increased for easier interaction
      
      const leftBound = modelX - characterWidth / 2;
      const rightBound = modelX + characterWidth / 2;
      const topBound = modelY - characterHeight / 2;
      const bottomBound = modelY + characterHeight / 2;
      
      const isOver = mouseX >= leftBound && mouseX <= rightBound && 
                     mouseY >= topBound && mouseY <= bottomBound;
      
      // Debug output (remove after testing)
      if (isOver) {
        console.log(`🎯 Mouse over character at (${mouseX}, ${mouseY}), model at (${modelX}, ${modelY})`);
      }
      
      return isOver;
    }
    
    // Dynamic mouse event toggling (key feature from live-2d_sample)
    function updateMouseIgnore() {
      const isOverCharacter = isMouseOverCharacter(mousePosition.x, mousePosition.y);
      
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(!isOverCharacter);
      }
    }
    
    // Track mouse position globally (like live-2d_sample)
    document.addEventListener('mousemove', (e) => {
      mousePosition.x = e.clientX;
      mousePosition.y = e.clientY;
      
      // Handle character dragging
      if (isDragging && currentModel) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate new position
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        
        // Keep character within window bounds
        const margin = 50;
        const clampedX = Math.max(margin, Math.min(newX, window.innerWidth - margin));
        const clampedY = Math.max(margin, Math.min(newY, window.innerHeight - margin));
        
        // Update model position using Live2D methods
        currentModel.setPosition(clampedX, clampedY);
      }
      
      // Update mouse ignore state continuously
      updateMouseIgnore();
    });
    
    // Update mouse ignore state regularly (like live-2d_sample)
    setInterval(updateMouseIgnore, 100);
    
    // Mouse down - start dragging the character
    canvas.addEventListener('mousedown', (e) => {
      if (!currentModel) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if mouse is over character
      if (!isMouseOverCharacter(e.clientX, e.clientY)) return;
      
      // Convert to Live2D coordinate system
      const modelMatrix = currentModel.getModelMatrix();
      const modelX = modelMatrix.getX();
      const modelY = modelMatrix.getY();
      
      e.preventDefault();
      isDragging = true;
      dragOffset.x = x - modelX;
      dragOffset.y = y - modelY;
      
      // Disable click-through during interaction
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
      
      console.log('🎮 Started dragging character');
    });
    
    // Mouse up - stop dragging
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        
        // Re-enable dynamic mouse ignore checking
        setTimeout(() => {
          updateMouseIgnore();
        }, 100);
        
        console.log('🎮 Stopped dragging character');
      }
    });
    
    // Mouse wheel - handle character scaling like live-2d_sample
    canvas.addEventListener('wheel', (e) => {
      if (!currentModel) return;
      
      // Check if mouse is over character
      if (!isMouseOverCharacter(e.clientX, e.clientY)) return;
      
      e.preventDefault();
      
      const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
      const modelMatrix = currentModel.getModelMatrix();
      const currentScale = modelMatrix.getScaleX();
      const newScale = Math.max(0.3, Math.min(3.0, currentScale * scaleChange));
      
      // Scale the character model using Live2D methods
      const scaleFactor = newScale / currentScale;
      modelMatrix.multiplyByScale(scaleFactor);
      
      console.log(`🔍 Character scaled to: ${newScale.toFixed(2)}x`);
    }, { passive: false });
    
    // Click event for character interaction
    canvas.addEventListener('click', (e) => {
      if (!currentModel || isDragging) return;
      
      // Check if mouse is over character
      if (!isMouseOverCharacter(e.clientX, e.clientY)) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / canvas.width * 2 - 1; // Normalize to -1 to 1
      const y = -((e.clientY - rect.top) / canvas.height * 2 - 1); // Normalize and flip Y
      
      // Use Live2D's onTap method
      if (live2dManager) {
        live2dManager.onTap(x, y);
        console.log(`🎭 Character tapped at (${x.toFixed(2)}, ${y.toFixed(2)})`);
      }
    });
    
    // Window resize handler
    window.addEventListener('resize', () => {
      if (currentModel) {
        // Keep character proportionally positioned
        const modelMatrix = currentModel.getModelMatrix();
        const currentX = modelMatrix.getX();
        const currentY = modelMatrix.getY();
        
        const newX = Math.min(currentX, window.innerWidth - 100);
        const newY = Math.min(currentY, window.innerHeight - 100);
        
        currentModel.setPosition(newX, newY);
      }
    });
    
    console.log('🎮 Character interaction ready: drag to move, scroll to scale, click for animation');
    console.log('🎯 Dynamic mouse event toggling enabled - character will be interactive!');
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

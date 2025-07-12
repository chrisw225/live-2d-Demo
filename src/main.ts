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
    
    console.log('🎭 Live2D application started with character switching support');
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

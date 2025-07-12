const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Function to run TypeScript compiler
function runTsc(files, outputFile) {
  return new Promise((resolve, reject) => {
    const tscArgs = [
      '--target', 'es2020',
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--esModuleInterop',
      '--allowSyntheticDefaultImports',
      '--outDir', distDir,
      '--sourceMap',
      ...files
    ];

    const tsc = spawn('npx', ['tsc', ...tscArgs], {
      stdio: 'inherit',
      shell: true
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Compiled ${files.join(', ')}`);
        resolve();
      } else {
        console.error(`✗ Failed to compile ${files.join(', ')}`);
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });
}

// Build main process and preload script
async function buildElectron() {
  try {
    console.log('🔨 Building Electron files...');
    
    // Compile main process
    await runTsc(['src/main.electron.ts'], 'main.js');
    
    // Compile preload script
    await runTsc(['src/preload.ts'], 'preload.js');
    
    console.log('✅ Electron build complete!');
  } catch (error) {
    console.error('❌ Electron build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildElectron();
}

module.exports = { buildElectron }; 
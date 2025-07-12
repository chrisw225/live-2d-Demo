import { defineConfig, UserConfig, ConfigEnv } from 'vite';

export default defineConfig((env: ConfigEnv): UserConfig => {
  let common: UserConfig = {
    server: {
      port: 5000,
      host: '0.0.0.0', // Allow access from Electron
    },
    root: './',
    base: './', // Use relative base for Electron
    publicDir: './public',
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@framework': new URL('./Framework/src', import.meta.url).pathname,
      }
    },
    build: {
      target: 'es2020', // Modern target for Electron
      assetsDir: 'assets',
      outDir: './dist',
      sourcemap: env.mode == 'development' ? true : false,
      rollupOptions: {
        output: {
          format: 'es', // Use ES modules
        }
      },
    },
  };
  return common;
});

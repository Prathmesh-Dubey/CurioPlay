import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/** Dev/preview only: send `/` and `/curioplay` (no trailing slash) to the app at `/curioplay/` instead of a 404. */
function baseRedirect(base: string): Plugin {
  const bare = base.replace(/\/$/, '');
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void }, next: () => void) => {
    const [pathname, query = ''] = (req.url ?? '').split('?');
    if (pathname === '/' || pathname === bare) {
      res.statusCode = 302;
      res.setHeader('Location', base + (query ? `?${query}` : ''));
      res.end();
      return;
    }
    next();
  };
  return {
    name: 'curioplay-base-redirect',
    configureServer: (server) => void server.middlewares.use(redirect),
    configurePreviewServer: (server) => void server.middlewares.use(redirect),
  };
}

export default defineConfig(({ mode }) => {
  // `vite build --mode android` (or CAPACITOR=true) builds for the Capacitor WebView.
  const isAndroid = mode === 'android' || process.env.CAPACITOR === 'true';

  return {
    // GitHub Pages -> /curioplay/
    // Android (Capacitor) -> ./
    base: isAndroid ? './' : '/curioplay/',

    plugins: [react(), tailwindcss(), ...(isAndroid ? [] : [baseRedirect('/curioplay/')])],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },

    // Only scan the real entry — never the copied Android build under android/**.
    optimizeDeps: {
      entries: ['index.html'],
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},

      // Prevent Vite from watching generated Android files
      fs: {
        deny: ['android/**'],
      },
    },
  };
});

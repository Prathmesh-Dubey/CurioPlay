import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * The GitHub repository name. GitHub Pages serves a project site at /<repo>/ and paths are CASE-SENSITIVE
 * (/CurioPlay/ works, /curioplay/ is a 404), so this must match the repository exactly.
 * Forks/renames: set VITE_BASE_PATH (e.g. "/MyFork/") when building instead of editing this file.
 */
const REPO = 'CurioPlay';

/** Web build / preview only: send `/` and the bare base (no trailing slash) to the app, instead of a 404. */
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
    configurePreviewServer: (server) => void server.middlewares.use(redirect),
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  // `vite build --mode android` (or CAPACITOR=true) builds for the Capacitor WebView.
  const isAndroid = mode === 'android' || process.env.CAPACITOR === 'true';

  // One decision, three targets:
  //   Android (Capacitor)   -> './'          assets are bundled in the app and resolved relative to index.html
  //   GitHub Pages build    -> '/CurioPlay/' the repository path
  //   Local dev server      -> '/'           plain `npm run dev` at http://localhost:5173/
  //   `vite preview`        -> as built      it serves the production build, so it must use the production base
  // The router reads the same value (import.meta.env.BASE_URL) for its basename, so they can never disagree.
  const base = isAndroid ? './' : command === 'serve' && !isPreview ? '/' : (process.env.VITE_BASE_PATH ?? `/${REPO}/`);

  return {
    base,

    plugins: [react(), tailwindcss(), ...(isAndroid || base === '/' ? [] : [baseRedirect(base)])],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    build: {
      // The Android app gets its own folder: Capacitor must never package the web build (its paths start with /CurioPlay/).
      outDir: isAndroid ? 'dist-android' : 'dist',
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

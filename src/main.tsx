import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { queryClient } from './lib/react-query';
import { persistOptions } from './lib/cache/persist';
import '@fontsource-variable/archivo/wdth.css';
import './index.css';

// One-time migration of the login key from the old brand name so existing sessions survive.
try {
  const old = localStorage.getItem('gamezone_user');
  if (old && !localStorage.getItem('curioplay_user')) localStorage.setItem('curioplay_user', old);
  localStorage.removeItem('gamezone_user');
} catch {
  /* storage unavailable */
}

const app = (
  <>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
    <ReactQueryDevtools initialIsOpen={false} />
  </>
);

// The query cache is persisted to IndexedDB (src/lib/cache) so reloads and new tabs start warm.
// Without IndexedDB the app runs on the in-memory cache alone.
createRoot(document.getElementById('root')!).render(
  persistOptions ? (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {app}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
  ),
);

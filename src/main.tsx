import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { queryClient } from './lib/react-query';
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

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);

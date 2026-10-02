import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { CurioLoader } from '@/components/ui/CurioLoader';
import { ExitHint } from '@/components/ui/ExitHint';
import { installNativeBack } from '@/lib/nativeBack';

import LandingPage from './pages/LandingPage';
import MobileSplash from './pages/MobileSplash';

// Heavy / authenticated routes are code-split.
const Login = lazy(() => import('./pages/Login'));
const DashboardApp = lazy(() => import('./pages/DashboardApp'));
const Legal = lazy(() => import('./pages/Legal'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

const isNative = Capacitor.isNativePlatform();

/**
 * The router's basename is the build's own base path, so routing can never disagree with where assets load from:
 * '/CurioPlay' on GitHub Pages, '/' for the dev server, and '/' inside the Android app (its base is './', which
 * is not a URL prefix).
 */
const basename = !isNative && import.meta.env.BASE_URL.startsWith('/') ? import.meta.env.BASE_URL.replace(/\/+$/, '') || '/' : '/';

function RouteFallback() {
  return <CurioLoader fullscreen />;
}

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<RouteFallback />}>{el}</Suspense>;

const router = createBrowserRouter(
  [
    { path: '/', element: isNative ? <MobileSplash /> : <LandingPage /> },
    { path: '/login', element: withSuspense(<Login />) },
    { path: '/dashboard', element: withSuspense(<DashboardApp />) },
    { path: '/legal/:doc', element: withSuspense(<Legal />) },
    { path: '/contact', element: withSuspense(<Contact />) },
    { path: '*', element: withSuspense(<NotFound />) },
  ],
  {
    basename,
  },
);

export default function App() {
  // Android back button / edge-swipe, routed through the same router. A no-op outside the Android app.
  useEffect(() => installNativeBack(router), []);

  return (
    <>
      <RouterProvider router={router} />
      <ExitHint />
    </>
  );
}

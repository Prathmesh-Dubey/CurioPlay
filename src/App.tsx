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
    // GitHub Pages serves under /curioplay; Capacitor serves from the root.
    basename: isNative ? '/' : '/curioplay',
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

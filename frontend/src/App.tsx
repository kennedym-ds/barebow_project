import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import EquipmentProfile from './pages/EquipmentProfile';
import Help from './pages/Help';

// Lazy-load pages that use Plotly.js to keep initial bundle small
const AnalysisLab = lazy(() => import('./pages/AnalysisLab'));
const SessionLogger = lazy(() => import('./pages/SessionLogger'));
const History = lazy(() => import('./pages/History'));
const CrawlManager = lazy(() => import('./pages/CrawlManager'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TuningWizard = lazy(() => import('./pages/TuningWizard'));

function PageLoader() {
  return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/equipment" element={<EquipmentProfile />} />
                  <Route path="/analysis" element={<AnalysisLab />} />
                  <Route path="/session" element={<SessionLogger />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/crawls" element={<CrawlManager />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/tuning" element={<TuningWizard />} />
                  <Route path="/help" element={<Help />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

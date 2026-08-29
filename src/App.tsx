import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import './App.css';
import ErrorNotice from './components/ErrorNotice';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { isPageLevel } from './errors';
import { useCatalog } from './hooks/useCatalog';
import { usePractice } from './hooks/usePractice';
import HomeScreen from './screens/HomeScreen';
import PracticeScreen from './screens/PracticeScreen';
import RecapScreen from './screens/RecapScreen';

/** Bookmarks from before units had their own name. */
function LegacyModuleRedirect() {
  const { moduleId } = useParams<{ moduleId: string }>();
  return <Navigate to={`/units/${moduleId}`} replace />;
}

/**
 * The shell: chrome, routes, and the one practice everything else reads.
 *
 * `usePractice` is called here rather than inside the practice screen because a
 * practice outlives the screen that started it — the recap is a different route
 * reading the same conversation.
 */
function App() {
  const location = useLocation();

  const catalog = useCatalog();
  const practice = usePractice();

  // An error raised on one screen has no business following you to the next.
  const { clearError } = practice;
  useEffect(() => clearError(), [location.pathname, clearError]);

  // A route change is a new page, so it starts at the top. Without this the
  // browser keeps the offset it had, and a tile clicked far down the catalogue
  // lands you level with the composer — past the clip you came to watch.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Page-level failures are rendered by the screen they belong to; everything
  // else sits above the page, where it does not take the page away.
  const banner = practice.error && !isPageLevel(practice.error) ? practice.error : null;

  return (
    <div className="app-shell">
      <SiteHeader />

      <main>
        {banner && <ErrorNotice error={banner} variant="banner" onDismiss={clearError} />}

        <Routes>
          <Route
            path="/"
            element={
              <HomeScreen
                modules={catalog.modules}
                isLoading={catalog.isLoading}
                error={catalog.error}
                startingId={practice.startingId}
                onRetry={catalog.reload}
                onStart={(unit) => practice.start(unit.id)}
              />
            }
          />
          <Route
            path="/units/:unitId"
            element={
              <PracticeScreen
                practice={practice}
                findUnit={catalog.findUnit}
                catalogReady={!catalog.isLoading}
              />
            }
          />
          <Route
            path="/units/:unitId/recap"
            element={<RecapScreen recap={practice.recap} onRestart={practice.restart} />}
          />
          <Route path="/modules/:moduleId" element={<LegacyModuleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  );
}

export default App;

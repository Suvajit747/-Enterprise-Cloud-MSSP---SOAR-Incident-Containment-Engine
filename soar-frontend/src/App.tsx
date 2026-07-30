import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/common/LoadingState";

const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AlertsPage = lazy(() => import("@/pages/AlertsPage").then((m) => ({ default: m.AlertsPage })));
const AlertDetailsPage = lazy(() =>
  import("@/pages/AlertDetailsPage").then((m) => ({ default: m.AlertDetailsPage })),
);
const IncidentsPage = lazy(() => import("@/pages/IncidentsPage").then((m) => ({ default: m.IncidentsPage })));
const ThreatIntelPage = lazy(() =>
  import("@/pages/ThreatIntelPage").then((m) => ({ default: m.ThreatIntelPage })),
);
const PlaybooksPage = lazy(() => import("@/pages/PlaybooksPage").then((m) => ({ default: m.PlaybooksPage })));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const ActivityPage = lazy(() => import("@/pages/ActivityPage").then((m) => ({ default: m.ActivityPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<LoadingState label="Loading dashboard…" />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/alerts"
          element={
            <Suspense fallback={<LoadingState label="Loading alerts…" />}>
              <AlertsPage />
            </Suspense>
          }
        />
        <Route
          path="/alerts/:id"
          element={
            <Suspense fallback={<LoadingState label="Loading alert…" />}>
              <AlertDetailsPage />
            </Suspense>
          }
        />
        <Route
          path="/incidents"
          element={
            <Suspense fallback={<LoadingState label="Loading incidents…" />}>
              <IncidentsPage />
            </Suspense>
          }
        />
        <Route
          path="/threat-intelligence"
          element={
            <Suspense fallback={<LoadingState label="Loading threat intelligence…" />}>
              <ThreatIntelPage />
            </Suspense>
          }
        />
        <Route
          path="/playbooks"
          element={
            <Suspense fallback={<LoadingState label="Loading playbooks…" />}>
              <PlaybooksPage />
            </Suspense>
          }
        />
        <Route
          path="/analytics"
          element={
            <Suspense fallback={<LoadingState label="Loading analytics…" />}>
              <AnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="/activity"
          element={
            <Suspense fallback={<LoadingState label="Loading activity…" />}>
              <ActivityPage />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<LoadingState label="Loading settings…" />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;

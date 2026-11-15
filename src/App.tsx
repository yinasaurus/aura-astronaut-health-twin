import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { LimitationsPage } from "./pages/LimitationsPage";
import { SourcesPage } from "./pages/SourcesPage";

const MissionView = lazy(() => import("./components/MissionView").then((module) => ({ default: module.MissionView })));
const DemoPage = lazy(() => import("./pages/DemoPage").then((module) => ({ default: module.DemoPage })));
const ValidationPage = lazy(() => import("./pages/ValidationPage").then((module) => ({ default: module.ValidationPage })));

function RouteFallback() {
  return <p className="text-sm text-[#d5e7f4]">Loading…</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteFallback />}>
                <MissionView />
              </Suspense>
            }
          />
          <Route
            path="/demo"
            element={
              <Suspense fallback={<RouteFallback />}>
                <DemoPage />
              </Suspense>
            }
          />
          <Route
            path="/validation"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ValidationPage />
              </Suspense>
            }
          />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/limitations" element={<LimitationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

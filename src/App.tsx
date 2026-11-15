import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { DemoPage } from "./pages/DemoPage";
import { LimitationsPage } from "./pages/LimitationsPage";
import { MissionView } from "./components/MissionView";
import { SourcesPage } from "./pages/SourcesPage";
import { ValidationPage } from "./pages/ValidationPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<MissionView />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/limitations" element={<LimitationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

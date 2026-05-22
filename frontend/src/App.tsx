import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import WardrobePage from "./pages/WardrobePage";
import OutfitsPage from "./pages/OutfitsPage";
import RecommendPage from "./pages/RecommendPage";
import StatsPage from "./pages/StatsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/wardrobe" element={<WardrobePage />} />
        <Route path="/outfits" element={<OutfitsPage />} />
        <Route path="/recommend" element={<RecommendPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/recommend" replace />} />
      </Route>
    </Routes>
  );
}

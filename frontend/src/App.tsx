import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import WardrobePage from "./pages/WardrobePage";
import OutfitsPage from "./pages/OutfitsPage";
import RecommendPage from "./pages/RecommendPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";

function ProtectedRoutes() {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/wardrobe" element={<WardrobePage />} />
        <Route path="/outfits" element={<OutfitsPage />} />
        <Route path="/recommend" element={<RecommendPage />} />
        <Route path="/stats" element={<Navigate to="/wardrobe" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/recommend" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./components/AppLayout";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AuditPage } from "./pages/AuditPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DuesPage } from "./pages/DuesPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { LotsPage } from "./pages/LotsPage";
import { MyLotPage } from "./pages/MyLotPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OfficersPage } from "./pages/OfficersPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PlansPage } from "./pages/PlansPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { VotingPage } from "./pages/VotingPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/officers" element={<OfficersPage />} />
          <Route
            path="/privacy"
            element={
              <RequireAuth>
                <PrivacyPage />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="my-lot" element={<MyLotPage />} />
            <Route path="dues" element={<DuesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="lots" element={<LotsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="vote" element={<VotingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

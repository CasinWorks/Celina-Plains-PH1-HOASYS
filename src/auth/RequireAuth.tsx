import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "../domain/types";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) return <p className="main-panel">{t("common.loading")}</p>;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!session.consentPrivacyAt && location.pathname !== "/privacy") {
    return <Navigate to="/privacy" replace />;
  }
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const { hasRole, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <p className="main-panel">{t("common.loading")}</p>;
  if (!hasRole(...roles)) {
    return (
      <div className="main-panel">
        <div className="alert alert-danger" role="alert">
          {t("errors.forbidden")}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/** Pure helper for tests — mirrors client-side route policy. */
export function canAccessRoute(
  roles: Role[],
  required: Role | Role[],
): boolean {
  const needed = Array.isArray(required) ? required : [required];
  return needed.some((r) => roles.includes(r));
}

export const ROUTE_POLICY = {
  dashboard: ["homeowner", "officer", "treasurer"] as Role[],
  myLot: ["homeowner", "officer", "treasurer"] as Role[],
  dues: ["homeowner", "officer", "treasurer"] as Role[],
  payments: ["homeowner", "officer", "treasurer"] as Role[],
  expenses: ["treasurer"] as Role[],
  reports: ["homeowner", "officer", "treasurer"] as Role[],
  announcements: ["homeowner", "officer", "treasurer"] as Role[],
  feedback: ["homeowner", "officer", "treasurer"] as Role[],
  plans: ["homeowner", "officer", "treasurer"] as Role[],
  lots: ["treasurer", "officer"] as Role[],
  lotsManage: ["treasurer"] as Role[],
  settings: ["treasurer"] as Role[],
  audit: ["treasurer"] as Role[],
  verifyPayment: ["treasurer"] as Role[],
} as const;

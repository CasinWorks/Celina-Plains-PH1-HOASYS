import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { formatPeso } from "../domain/money";
import type { HomeownerFinanceSummary, Payment } from "../domain/types";
import { getServices } from "../services/createServices";

export function DashboardPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [balance, setBalance] = useState("0.00");
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [lastPay, setLastPay] = useState<Payment | null>(null);
  const [summary, setSummary] = useState<HomeownerFinanceSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const repo = getServices().repo;
    void (async () => {
      setLoading(true);
      try {
        const lotId = session.lotIds[0];
        if (lotId) {
          setBalance(await repo.lotBalance(lotId));
          const dues = await repo.listDues({ lotId });
          const open = dues.find(
            (d) => d.status === "unpaid" || d.status === "partial",
          );
          setNextDue(open?.dueDate ?? null);
          const pays = await repo.listPayments({ lotId });
          setLastPay(pays.find((p) => p.status === "verified" && !p.isVoid) ?? null);
        }
        setSummary(await repo.homeownerFinanceSummary());
        if (hasRole("treasurer")) {
          const pending = await repo.listPayments({ status: "pending" });
          setPendingCount(pending.filter((p) => !p.isVoid).length);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [session, hasRole]);

  if (!session) return null;
  if (loading) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <h1 className="page-title">{t("dashboard.title")}</h1>
      <p className="page-lead">
        {t("dashboard.welcome", { name: session.fullName })}
      </p>
      <p style={{ fontWeight: 600 }}>
        {t("dashboard.rolesLabel")}:{" "}
        {session.roles.map((r) => t(`roles.${r}`)).join(", ")}
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <p className="label">{t("dashboard.balanceDue")}</p>
          <p className="value">{formatPeso(balance)}</p>
        </div>
        <div className="kpi-card">
          <p className="label">{t("dashboard.nextDue")}</p>
          <p className="value" style={{ fontSize: "var(--fs-h2)" }}>
            {nextDue ?? t("dashboard.none")}
          </p>
        </div>
        <div className="kpi-card">
          <p className="label">{t("dashboard.lastPayment")}</p>
          <p className="value" style={{ fontSize: "var(--fs-h2)" }}>
            {lastPay ? formatPeso(lastPay.amount) : t("dashboard.none")}
          </p>
        </div>
        {hasRole("treasurer") && (
          <>
            <div className="kpi-card">
              <p className="label">{t("dashboard.collectionsMonth")}</p>
              <p className="value">
                {formatPeso(summary?.collectionsThisMonth ?? "0")}
              </p>
            </div>
            <div className="kpi-card">
              <p className="label">{t("dashboard.pendingVerifications")}</p>
              <p className="value">{pendingCount}</p>
            </div>
            <div className="kpi-card">
              <p className="label">{t("dashboard.totalArrears")}</p>
              <p className="value">
                {formatPeso(summary?.communityArrears ?? "0")}
              </p>
            </div>
            <div className="kpi-card">
              <p className="label">{t("dashboard.expensesMonth")}</p>
              <p className="value">
                {formatPeso(summary?.expensesThisMonth ?? "0")}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">{t("dashboard.communitySummary")}</h2>
        <p>{t("dashboard.communityNote")}</p>
        {summary && (
          <ul>
            <li>
              {t("dashboard.collectionsMonth")}:{" "}
              <strong>{formatPeso(summary.collectionsThisMonth)}</strong>
            </li>
            <li>
              {t("dashboard.expensesMonth")}:{" "}
              <strong>{formatPeso(summary.expensesThisMonth)}</strong>
            </li>
            <li>
              {t("reports.communityArrears")}:{" "}
              <strong>{formatPeso(summary.communityArrears)}</strong>
            </li>
          </ul>
        )}
        <div className="btn-row">
          <Link className="btn btn-primary" to="/payments">
            {t("dashboard.quickPay")}
          </Link>
          <Link className="btn btn-secondary" to="/dues">
            {t("dashboard.viewDues")}
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { formatPeso } from "../domain/money";
import type { Lot } from "../domain/types";
import { getServices } from "../services/createServices";

export function MyLotPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [lots, setLots] = useState<Array<Lot & { balance: string }>>([]);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const repo = getServices().repo;
      const result = [];
      for (const id of session.lotIds) {
        const lot = await repo.getLot(id);
        if (lot) {
          result.push({ ...lot, balance: await repo.lotBalance(id) });
        }
      }
      setLots(result);
    })();
  }, [session]);

  return (
    <div>
      <h1 className="page-title">{t("lots.myLots")}</h1>
      <p className="page-lead">{t("lots.myLotsLead")}</p>
      {lots.length === 0 ? (
        <div className="alert alert-warning">{t("lots.noLinked")}</div>
      ) : (
        <div className="bento-grid">
          {lots.map((lot, i) => (
            <div className="bento-card bento-span-6" key={lot.id}>
              <div className="list-row" style={{ border: 0, background: "transparent", padding: 0 }}>
                <span
                  className={`avatar-tile tone-${i % 6}`}
                  aria-hidden="true"
                >
                  {(lot.street || lot.lotCode).slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h2 className="card-title" style={{ marginBottom: "0.25rem" }}>
                    {lot.lotCode} — {lot.householdName}
                  </h2>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>
                    {t("lots.block")}: {lot.block || "—"} · {t("lots.street")}:{" "}
                    {lot.street || "—"}
                  </p>
                </div>
              </div>
              <div className="metric-tile lilac" style={{ marginTop: "1rem" }}>
                <p className="label">{t("common.balance")}</p>
                <p className="value">{formatPeso(lot.balance)}</p>
              </div>
              <div className="btn-row" style={{ marginTop: "1rem" }}>
                <Link className="btn btn-primary" to="/payments">
                  {t("dashboard.quickPay")}
                </Link>
                <Link className="btn btn-secondary" to="/dues">
                  {t("dashboard.viewDues")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

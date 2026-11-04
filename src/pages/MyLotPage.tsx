import { useEffect, useState } from "react";
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
      {lots.length === 0 ? (
        <div className="alert alert-warning">{t("lots.noLinked")}</div>
      ) : (
        lots.map((lot) => (
          <div className="card" key={lot.id}>
            <h2 className="card-title">
              {lot.lotCode} — {lot.householdName}
            </h2>
            <p>
              {t("lots.block")}: {lot.block || "—"} · {t("lots.street")}:{" "}
              {lot.street || "—"}
            </p>
            <p>
              {t("common.balance")}: <strong>{formatPeso(lot.balance)}</strong>
            </p>
          </div>
        ))
      )}
    </div>
  );
}

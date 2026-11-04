import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RequireRole } from "../auth/RequireAuth";
import type { FinanceAuditLog } from "../domain/types";
import { getServices } from "../services/createServices";

function AuditInner() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<FinanceAuditLog[]>([]);

  useEffect(() => {
    void getServices()
      .repo.listAuditLogs(200)
      .then(setRows);
  }, []);

  return (
    <div>
      <h1 className="page-title">{t("audit.title")}</h1>
      <p className="page-lead">{t("audit.lead")}</p>
      {rows.length === 0 ? (
        <p>{t("audit.empty")}</p>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>{t("audit.when")}</th>
                  <th>{t("audit.entity")}</th>
                  <th>{t("audit.action")}</th>
                  <th>{t("audit.actor")}</th>
                  <th>{t("audit.note")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t("audit.when")}>
                      {new Date(r.timestamp).toLocaleString("en-PH")}
                    </td>
                    <td data-label={t("audit.entity")}>
                      {r.entity} / {r.entityId.slice(0, 12)}
                    </td>
                    <td data-label={t("audit.action")}>{r.action}</td>
                    <td data-label={t("audit.actor")}>
                      {r.actorName ?? "—"}
                    </td>
                    <td data-label={t("audit.note")}>{r.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditPage() {
  return (
    <RequireRole roles={["treasurer"]}>
      <AuditInner />
    </RequireRole>
  );
}

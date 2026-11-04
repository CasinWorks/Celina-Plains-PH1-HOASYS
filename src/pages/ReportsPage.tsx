import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { formatPeso } from "../domain/money";
import type {
  HomeownerFinanceSummary,
  MonthStatement,
} from "../domain/types";
import { getServices } from "../services/createServices";

export function ReportsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [statement, setStatement] = useState<MonthStatement | null>(null);
  const [summary, setSummary] = useState<HomeownerFinanceSummary | null>(null);

  async function load() {
    const repo = getServices().repo;
    setSummary(await repo.homeownerFinanceSummary());
    if (hasRole("treasurer") || hasRole("officer")) {
      setStatement(await repo.monthStatement(year, month));
    } else {
      setStatement(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <h1 className="page-title">{t("reports.title")}</h1>
      <p className="page-lead">{t("reports.lead")}</p>

      <div className="card">
        <h2 className="card-title">{t("reports.summaryTitle")}</h2>
        {summary && (
          <>
            <p>{t("reports.asOf", { date: summary.asOf })}</p>
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
            <p>{t("dashboard.communityNote")}</p>
          </>
        )}
      </div>

      {(hasRole("treasurer") || hasRole("officer")) && (
        <div className="card">
          <h2 className="card-title">{t("reports.monthly")}</h2>
          {!hasRole("treasurer") && (
            <p className="alert alert-info">{t("reports.detailedNote")}</p>
          )}
          <div className="btn-row" style={{ alignItems: "end", marginBottom: "1rem" }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="y">{t("common.year")}</label>
              <input
                id="y"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="m">{t("common.month")}</label>
              <select
                id="m"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {t(`months.${m}`)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void load()}
            >
              {t("reports.showStatement")}
            </button>
          </div>
          {statement && hasRole("treasurer") && (
            <div className="table-wrap">
              <table className="data-table">
                <tbody>
                  <tr>
                    <th scope="row">{t("reports.opening")}</th>
                    <td className="num">{formatPeso(statement.openingBalance)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{t("reports.collections")}</th>
                    <td className="num">{formatPeso(statement.collections)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{t("reports.expenses")}</th>
                    <td className="num">{formatPeso(statement.expenses)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{t("reports.net")}</th>
                    <td className="num">{formatPeso(statement.net)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{t("reports.closing")}</th>
                    <td className="num">
                      <strong>{formatPeso(statement.closingBalance)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

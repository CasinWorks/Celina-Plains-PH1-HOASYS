import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { PaymentProgressCharts } from "../components/PaymentProgressCharts";
import { formatPeso } from "../domain/money";
import type {
  HomeownerFinanceSummary,
  MonthlyPaymentProgress,
  MonthStatement,
} from "../domain/types";
import { getServices } from "../services/createServices";

export function ReportsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isStaff = hasRole("treasurer") || hasRole("officer");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [statement, setStatement] = useState<MonthStatement | null>(null);
  const [summary, setSummary] = useState<HomeownerFinanceSummary | null>(null);
  const [progress, setProgress] = useState<MonthlyPaymentProgress[]>([]);

  async function loadSummary() {
    const repo = getServices().repo;
    setSummary(await repo.homeownerFinanceSummary());
  }

  async function loadStatement() {
    if (!isStaff) {
      setStatement(null);
      return;
    }
    setStatement(await getServices().repo.monthStatement(year, month));
  }

  async function loadProgress() {
    if (!isStaff) {
      setProgress([]);
      return;
    }
    setProgress(await getServices().repo.monthlyPaymentProgress(chartYear));
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  useEffect(() => {
    void loadStatement();
  }, [year, month, isStaff]);

  useEffect(() => {
    void loadProgress();
  }, [chartYear, isStaff]);

  return (
    <div>
      <h1 className="page-title">{t("reports.title")}</h1>
      <p className="page-lead">{t("reports.lead")}</p>

      <div className="card">
        <h2 className="card-title">{t("reports.summaryTitle")}</h2>
        {summary && (
          <>
            <p>{t("reports.asOf", { date: summary.asOf })}</p>
            <div className="metric-grid" style={{ marginTop: "1rem" }}>
              <div className="metric-tile mint">
                <p className="label">{t("dashboard.collectionsMonth")}</p>
                <p className="value">
                  {formatPeso(summary.collectionsThisMonth)}
                </p>
              </div>
              <div className="metric-tile peach">
                <p className="label">{t("dashboard.expensesMonth")}</p>
                <p className="value">
                  {formatPeso(summary.expensesThisMonth)}
                </p>
              </div>
              <div className="metric-tile pink">
                <p className="label">{t("reports.communityArrears")}</p>
                <p className="value">
                  {formatPeso(summary.communityArrears)}
                </p>
              </div>
            </div>
            <p style={{ marginTop: "1rem" }}>{t("dashboard.communityNote")}</p>
          </>
        )}
      </div>

      {isStaff && (
        <div className="card report-charts-card">
          <div className="report-charts-head">
            <div>
              <h2 className="card-title">{t("reports.progressTitle")}</h2>
              <p className="page-lead" style={{ margin: 0 }}>
                {t("reports.progressLead")}
              </p>
            </div>
            <div className="form-field" style={{ marginBottom: 0, minWidth: 120 }}>
              <label htmlFor="chart-year">{t("common.year")}</label>
              <input
                id="chart-year"
                type="number"
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
              />
            </div>
          </div>
          {progress.length > 0 ? (
            <PaymentProgressCharts series={progress} />
          ) : (
            <p>{t("common.loading")}</p>
          )}
        </div>
      )}

      {isStaff && (
        <div className="card">
          <h2 className="card-title">{t("reports.monthly")}</h2>
          {!hasRole("treasurer") && (
            <p className="alert alert-info">{t("reports.detailedNote")}</p>
          )}
          <div
            className="btn-row"
            style={{ alignItems: "end", marginBottom: "1rem" }}
          >
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
              onClick={() => void loadStatement()}
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
                    <td className="num">
                      {formatPeso(statement.openingBalance)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{t("reports.collections")}</th>
                    <td className="num">
                      {formatPeso(statement.collections)}
                    </td>
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
          {statement && !hasRole("treasurer") && (
            <div className="metric-grid">
              <div className="metric-tile mint">
                <p className="label">{t("reports.collections")}</p>
                <p className="value">{formatPeso(statement.collections)}</p>
              </div>
              <div className="metric-tile peach">
                <p className="label">{t("reports.expenses")}</p>
                <p className="value">{formatPeso(statement.expenses)}</p>
              </div>
              <div className="metric-tile sky">
                <p className="label">{t("reports.net")}</p>
                <p className="value">{formatPeso(statement.net)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

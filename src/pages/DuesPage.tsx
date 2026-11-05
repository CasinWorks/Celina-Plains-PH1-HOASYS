import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { addMoney, cmpMoney, formatPeso, subMoney } from "../domain/money";
import type { DuesCharge } from "../domain/types";
import { getServices } from "../services/createServices";
import { todayYmd } from "../lib/ids";

export function DuesPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [rows, setRows] = useState<DuesCharge[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isTreasurer = hasRole("treasurer");

  async function load() {
    if (!session) return;
    const repo = getServices().repo;
    if (isTreasurer || hasRole("officer")) {
      setRows(await repo.listDues());
    } else {
      const all: DuesCharge[] = [];
      for (const lotId of session.lotIds) {
        all.push(...(await repo.listDues({ lotId })));
      }
      setRows(all);
    }
  }

  useEffect(() => {
    void load();
  }, [session]);

  async function openPeriod(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    try {
      const created = await getServices().repo.openDuesPeriod(
        year,
        month,
        session,
      );
      setMessage(t("dues.opened", { count: created.length }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function applyPenalties() {
    if (!session) return;
    try {
      const n = await getServices().repo.applyPenalties(todayYmd(), session);
      setMessage(t("dues.penaltiesUpdated", { count: n }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  function canPay(d: DuesCharge, balance: string) {
    if (!session) return false;
    if (d.status !== "unpaid" && d.status !== "partial") return false;
    if (cmpMoney(balance, "0") <= 0) return false;
    return (
      session.lotIds.includes(d.lotId) ||
      hasRole("officer") ||
      hasRole("treasurer")
    );
  }

  function payHref(d: DuesCharge, balance: string) {
    const period = `${d.periodYear}-${String(d.periodMonth).padStart(2, "0")}`;
    const params = new URLSearchParams({
      lotId: d.lotId,
      amount: balance,
      duesId: d.id,
      period,
    });
    return `/payments?${params.toString()}`;
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("dues.title")}</h1>
      <p className="page-lead">{t("dues.lead")}</p>
      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {isTreasurer && (
        <div className="card pop-in">
          <h2 className="card-title">{t("dues.openPeriod")}</h2>
          <form
            onSubmit={openPeriod}
            className="btn-row"
            style={{ alignItems: "end" }}
          >
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="year">{t("common.year")}</label>
              <input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="month">{t("common.month")}</label>
              <select
                id="month"
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
            <button className="btn btn-primary" type="submit">
              {t("dues.openPeriod")}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => void applyPenalties()}
            >
              {t("dues.applyPenalties")}
            </button>
          </form>
        </div>
      )}

      <div className="card pop-in">
        <h2 className="card-title">
          {isTreasurer || hasRole("officer")
            ? t("dues.allDues")
            : t("dues.myDues")}
        </h2>
        <p className="meta-line">{t("dues.payHint")}</p>
        {rows.length === 0 ? (
          <p>{t("dues.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th scope="col">{t("common.lot")}</th>
                  <th scope="col">{t("common.period")}</th>
                  <th scope="col">{t("dues.amountDue")}</th>
                  <th scope="col">{t("common.penalty")}</th>
                  <th scope="col">{t("dues.amountPaid")}</th>
                  <th scope="col">{t("common.balance")}</th>
                  <th scope="col">{t("common.status")}</th>
                  <th scope="col">{t("common.dueDate")}</th>
                  <th scope="col">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const bal = subMoney(
                    addMoney(d.amountDue, d.penaltyAmount),
                    d.amountPaid,
                  );
                  const payable = canPay(d, bal);
                  return (
                    <tr
                      key={d.id}
                      className={payable ? "dues-row-payable" : undefined}
                    >
                      <td data-label={t("common.lot")}>{d.lotCode}</td>
                      <td data-label={t("common.period")}>
                        {d.periodYear}-{String(d.periodMonth).padStart(2, "0")}
                      </td>
                      <td className="num" data-label={t("dues.amountDue")}>
                        {formatPeso(d.amountDue)}
                      </td>
                      <td className="num" data-label={t("common.penalty")}>
                        {formatPeso(d.penaltyAmount)}
                      </td>
                      <td className="num" data-label={t("dues.amountPaid")}>
                        {formatPeso(d.amountPaid)}
                      </td>
                      <td className="num" data-label={t("common.balance")}>
                        {formatPeso(bal)}
                      </td>
                      <td data-label={t("common.status")}>
                        <StatusBadge status={d.status} />
                      </td>
                      <td data-label={t("common.dueDate")}>{d.dueDate}</td>
                      <td data-label={t("common.actions")}>
                        {payable ? (
                          <Link
                            className="btn btn-cta btn-pay"
                            to={payHref(d, bal)}
                          >
                            {t("dues.payNow")}
                          </Link>
                        ) : (
                          <span className="meta-line">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

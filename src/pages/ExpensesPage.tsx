import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { RequireRole } from "../auth/RequireAuth";
import { StatusBadge } from "../components/StatusBadge";
import { formatPeso } from "../domain/money";
import type { Expense, ExpenseCategory } from "../domain/types";
import { getServices } from "../services/createServices";
import { todayYmd } from "../lib/ids";

function ExpensesInner() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [expenseDate, setExpenseDate] = useState(todayYmd());
  const [category, setCategory] = useState<ExpenseCategory>("security");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    setRows(await getServices().repo.listExpenses());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    try {
      await getServices().repo.createExpense(
        { expenseDate, category, amount, payee, description },
        session,
      );
      setMessage(t("expenses.posted"));
      setAmount("");
      setPayee("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function voidExp(id: string) {
    if (!session) return;
    if (!window.confirm(t("expenses.voidConfirm"))) return;
    const reason = window.prompt(t("payments.voidReason"), "");
    if (!reason) return;
    try {
      await getServices().repo.voidExpense(id, reason, session);
      setMessage(t("expenses.voided"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div>
      <h1 className="page-title">{t("expenses.title")}</h1>
      <p className="page-lead">{t("expenses.lead")}</p>
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

      <div className="card">
        <h2 className="card-title">{t("expenses.create")}</h2>
        <form onSubmit={create}>
          <div className="form-field">
            <label htmlFor="date">{t("common.date")}</label>
            <input
              id="date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="cat">{t("common.category")}</label>
            <select
              id="cat"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ExpenseCategory)
              }
            >
              {(
                [
                  "utilities",
                  "security",
                  "maintenance",
                  "admin",
                  "other",
                ] as ExpenseCategory[]
              ).map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="amt">{t("common.amount")}</label>
            <input
              id="amt"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="payee">{t("common.payee")}</label>
            <input
              id="payee"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="desc">{t("common.description")}</label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {t("expenses.create")}
          </button>
        </form>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <p>{t("expenses.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("common.category")}</th>
                  <th>{t("common.payee")}</th>
                  <th>{t("common.amount")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td data-label={t("common.date")}>{e.expenseDate}</td>
                    <td data-label={t("common.category")}>
                      {t(`categories.${e.category}`)}
                    </td>
                    <td data-label={t("common.payee")}>{e.payee}</td>
                    <td className="num" data-label={t("common.amount")}>
                      {formatPeso(e.amount)}
                    </td>
                    <td data-label={t("common.status")}>
                      <StatusBadge status={e.status} />
                    </td>
                    <td data-label={t("common.actions")}>
                      {e.status === "posted" && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => void voidExp(e.id)}
                        >
                          {t("common.void")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExpensesPage() {
  return (
    <RequireRole roles={["treasurer"]}>
      <ExpensesInner />
    </RequireRole>
  );
}

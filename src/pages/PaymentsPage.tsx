import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { PayOptions } from "../components/PayOptions";
import { StatusBadge } from "../components/StatusBadge";
import { formatPeso } from "../domain/money";
import type { Lot, Payment, PaymentMethod, SiteConfig } from "../domain/types";
import { getServices } from "../services/createServices";

export function PaymentsPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [lotId, setLotId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duesId, setDuesId] = useState<string | null>(null);
  const [duesPeriod, setDuesPeriod] = useState<string | null>(null);

  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [orNumber, setOrNumber] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyVerify, setBusyVerify] = useState(false);

  const isTreasurer = hasRole("treasurer");

  async function load() {
    if (!session) return;
    const repo = getServices().repo;
    setCfg(await repo.getSiteConfig());
    const allLots = await repo.listLots();
    if (isTreasurer || hasRole("officer")) {
      setLots(allLots);
      setPayments(await repo.listPayments());
    } else {
      const mine = allLots.filter((l) => session.lotIds.includes(l.id));
      setLots(mine);
      const pays: Payment[] = [];
      for (const id of session.lotIds) {
        pays.push(...(await repo.listPayments({ lotId: id })));
      }
      setPayments(pays);
    }
    if (!lotId) {
      const first = session.lotIds[0] ?? allLots[0]?.id ?? "";
      setLotId(first);
    }
  }

  useEffect(() => {
    void load();
  }, [session]);

  useEffect(() => {
    const qLot = searchParams.get("lotId");
    const qAmount = searchParams.get("amount");
    const qDues = searchParams.get("duesId");
    const qPeriod = searchParams.get("period");
    if (qLot) setLotId(qLot);
    if (qAmount) setAmount(qAmount);
    if (qDues) setDuesId(qDues);
    if (qPeriod) {
      setDuesPeriod(qPeriod);
      setNotes((prev) =>
        prev.trim()
          ? prev
          : t("payments.duesPrefillNote", { period: qPeriod }),
      );
    }
  }, [searchParams, t]);

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setMessage("");
    if (!file) {
      setError(t("payments.proofRequired"));
      return;
    }
    try {
      await getServices().repo.submitPayment(
        {
          lotId,
          amount,
          method,
          payerReference: reference,
          notes,
          proofBlob: file,
          proofFileName: file.name,
          proofMimeType: file.type,
          intendedDuesIds: duesId ? [duesId] : undefined,
        },
        session,
      );
      setMessage(t("payments.submitted"));
      setAmount("");
      setReference("");
      setNotes("");
      setFile(null);
      setDuesId(null);
      setDuesPeriod(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function doVerify(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session || !verifyId || busyVerify) return;
    setVerifyError("");
    setError("");
    setBusyVerify(true);
    try {
      await getServices().repo.verifyPayment(
        verifyId,
        orNumber.trim(),
        session,
      );
      setMessage(t("payments.verified"));
      setVerifyId(null);
      setOrNumber("");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setVerifyError(msg);
      setError(msg);
    } finally {
      setBusyVerify(false);
    }
  }

  async function doReject(e: FormEvent) {
    e.preventDefault();
    if (!session || !rejectId) return;
    try {
      await getServices().repo.rejectPayment(rejectId, rejectReason, session);
      setMessage(t("payments.rejected"));
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const pending = payments.filter((p) => p.status === "pending" && !p.isVoid);

  return (
    <div>
      <h1 className="page-title">{t("payments.title")}</h1>
      <p className="page-lead">{t("payments.lead")}</p>
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

      <PayOptions />
      {isTreasurer && (
        <p className="waiting-count" role="status">
          {t("payments.waitingCount", { count: pending.length })}
        </p>
      )}
      {cfg &&
        cfg.paymentInstructions &&
        !cfg.paymentInstructions.includes("[CONFIG:") && (
          <div className="alert alert-info">
            <strong>{t("payments.instructions")}</strong>
            <div>{cfg.paymentInstructions}</div>
          </div>
        )}

      <div className="card" id="payment-form">
        <h2 className="card-title">{t("payments.submit")}</h2>
        {duesPeriod && (
          <div className="alert alert-info" role="status">
            {t("payments.payingForPeriod", { period: duesPeriod })}
          </div>
        )}
        <form onSubmit={submitPayment}>
          <div className="form-field">
            <label htmlFor="lot">{t("common.lot")}</label>
            <select
              id="lot"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              required
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lotCode} — {l.householdName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="amount">{t("common.amount")}</label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="method">{t("common.method")}</label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              {(["cash", "bank", "gcash", "other"] as PaymentMethod[]).map(
                (m) => (
                  <option key={m} value={m}>
                    {t(`methods.${m}`)}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="ref">{t("common.reference")}</label>
            <input
              id="ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="proof">{t("common.proof")}</label>
            <input
              id="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <span className="hint">{t("payments.proofHint")}</span>
          </div>
          <div className="form-field">
            <label htmlFor="notes">{t("common.notes")}</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button className="btn btn-cta" type="submit">
            {t("payments.submit")}
          </button>
        </form>
      </div>

      {isTreasurer && pending.length > 0 && (
        <div className="card">
          <h2 className="card-title">{t("payments.pendingQueue")}</h2>
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>{t("payments.paymentNo")}</th>
                  <th>{t("common.lot")}</th>
                  <th>{t("common.amount")}</th>
                  <th>{t("common.method")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td data-label={t("payments.paymentNo")}>{p.paymentNo}</td>
                    <td data-label={t("common.lot")}>{p.lotCode}</td>
                    <td className="num" data-label={t("common.amount")}>
                      {formatPeso(p.amount)}
                    </td>
                    <td data-label={t("common.method")}>
                      {t(`methods.${p.method}`)}
                    </td>
                    <td data-label={t("common.actions")}>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setVerifyId(p.id);
                            setOrNumber("");
                            setVerifyError("");
                            setRejectId(null);
                            requestAnimationFrame(() => {
                              document
                                .getElementById("verify-payment-card")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                });
                            });
                          }}
                        >
                          {t("common.verify")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            setRejectId(p.id);
                            setRejectReason("");
                          }}
                        >
                          {t("common.reject")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {verifyId && (
        <div className="card" id="verify-payment-card">
          <h2 className="card-title">{t("payments.verifyTitle")}</h2>
          {verifyError && (
            <div className="alert alert-danger" role="alert">
              {verifyError}
            </div>
          )}
          <form onSubmit={doVerify} noValidate={false}>
            <div className="form-field">
              <label htmlFor="or">{t("common.orNumber")}</label>
              <input
                id="or"
                value={orNumber}
                onChange={(e) => setOrNumber(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="btn-row">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={busyVerify || !orNumber.trim()}
              >
                {busyVerify ? t("common.loading") : t("common.verify")}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busyVerify}
                onClick={() => {
                  setVerifyId(null);
                  setVerifyError("");
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectId && (
        <div className="card">
          <h2 className="card-title">{t("payments.rejectTitle")}</h2>
          <form onSubmit={doReject}>
            <div className="form-field">
              <label htmlFor="reason">{t("payments.rejectReason")}</label>
              <textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>
            <div className="btn-row">
              <button className="btn btn-danger" type="submit">
                {t("common.reject")}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setRejectId(null)}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t("payments.history")}</h2>
        {payments.length === 0 ? (
          <p>{t("payments.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>{t("payments.paymentNo")}</th>
                  <th>{t("common.lot")}</th>
                  <th>{t("common.amount")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.orNumber")}</th>
                  <th>{t("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td data-label={t("payments.paymentNo")}>{p.paymentNo}</td>
                    <td data-label={t("common.lot")}>{p.lotCode}</td>
                    <td className="num" data-label={t("common.amount")}>
                      {formatPeso(p.amount)}
                    </td>
                    <td data-label={t("common.status")}>
                      <StatusBadge
                        status={p.isVoid ? "void" : p.status}
                      />
                    </td>
                    <td data-label={t("common.orNumber")}>
                      {p.orNumber || "—"}
                    </td>
                    <td data-label={t("common.date")}>
                      {p.createdAt.slice(0, 10)}
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

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "./StatusBadge";
import { addMoney, formatPeso, subMoney } from "../domain/money";
import type { DuesCharge, Lot, Payment, UserAccount } from "../domain/types";
import { getServices } from "../services/createServices";

type Props = {
  lot: Lot | null;
  onClose: () => void;
};

export function LotDetailDrawer({ lot, onClose }: Props) {
  const { t } = useTranslation();
  const [balance, setBalance] = useState("0.00");
  const [dues, setDues] = useState<DuesCharge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [residents, setResidents] = useState<UserAccount[]>([]);
  const open = Boolean(lot);

  useEffect(() => {
    if (!lot) return;
    const repo = getServices().repo;
    void (async () => {
      setBalance(await repo.lotBalance(lot.id));
      setDues((await repo.listDues({ lotId: lot.id })).slice(0, 6));
      setPayments((await repo.listPayments({ lotId: lot.id })).slice(0, 6));
      const users = await repo.listUsers();
      setResidents(users.filter((u) => lot.residentUserIds.includes(u.id)));
    })();
  }, [lot]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`lot-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        aria-label={t("lots.drawerTitle")}
      >
        {lot && (
          <div className="lot-drawer-inner">
            <div className="announcement-head">
              <div>
                <p className="meta-line" style={{ margin: 0 }}>
                  {lot.lotCode}
                </p>
                <h2 className="page-title" style={{ fontSize: "var(--fs-h1)" }}>
                  {lot.householdName}
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {t("common.close")}
              </button>
            </div>

            <div className="metric-tile lilac float-soft">
              <p className="label">{t("common.balance")}</p>
              <p className="value">{formatPeso(balance)}</p>
            </div>

            <p className="meta-line">
              {t("lots.block")}: {lot.block || "—"} · {t("lots.street")}:{" "}
              {lot.street || "—"}
            </p>

            <section>
              <h3 className="card-title">{t("lots.residents")}</h3>
              {residents.length === 0 ? (
                <p>{t("common.empty")}</p>
              ) : (
                <div className="list-stack">
                  {residents.map((u, i) => (
                    <div className="list-row" key={u.id}>
                      <span className={`avatar-tile tone-${i % 6}`}>
                        {u.fullName.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{u.fullName}</strong>
                        <div className="meta-line">{u.mobile || u.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="card-title">{t("dues.myDues")}</h3>
              <div className="list-stack">
                {dues.length === 0 ? (
                  <p>{t("dues.empty")}</p>
                ) : (
                  dues.map((d) => {
                    const bal = subMoney(
                      addMoney(d.amountDue, d.penaltyAmount),
                      d.amountPaid,
                    );
                    return (
                      <div className="list-row" key={d.id}>
                        <div>
                          <strong>
                            {d.periodYear}-
                            {String(d.periodMonth).padStart(2, "0")}
                          </strong>
                          <div className="meta-line">
                            {formatPeso(bal)} · {d.dueDate}
                          </div>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section>
              <h3 className="card-title">{t("payments.history")}</h3>
              <div className="list-stack">
                {payments.length === 0 ? (
                  <p>{t("payments.empty")}</p>
                ) : (
                  payments.map((p) => (
                    <div className="list-row" key={p.id}>
                      <div>
                        <strong>{formatPeso(p.amount)}</strong>
                        <div className="meta-line">
                          {p.createdAt.slice(0, 10)} · {t(`methods.${p.method}`)}
                        </div>
                      </div>
                      <StatusBadge status={p.isVoid ? "void" : p.status} />
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}

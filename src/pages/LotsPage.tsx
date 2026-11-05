import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { RequireRole } from "../auth/RequireAuth";
import { LotDetailDrawer } from "../components/LotDetailDrawer";
import type { Lot } from "../domain/types";
import { getServices } from "../services/createServices";

function LotsInner() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [selected, setSelected] = useState<Lot | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = hasRole("treasurer");

  const [lotCode, setLotCode] = useState("");
  const [block, setBlock] = useState("");
  const [street, setStreet] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLots(await getServices().repo.listLots());
  }

  useEffect(() => {
    void load();
  }, []);

  async function createLot(e: FormEvent) {
    e.preventDefault();
    if (!session || !canManage) return;
    setError("");
    try {
      await getServices().repo.createLot(
        {
          lotCode: lotCode.trim(),
          block,
          street,
          householdName,
          residentUserIds: [],
          isActive: true,
          notes,
        },
        session,
      );
      setMessage(t("common.success"));
      setLotCode("");
      setBlock("");
      setStreet("");
      setHouseholdName("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("lots.title")}</h1>
      <p className="page-lead">{t("lots.lead")}</p>
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

      {canManage && (
        <div className="card pop-in">
          <h2 className="card-title">{t("lots.create")}</h2>
          <form onSubmit={createLot}>
            <div className="form-field">
              <label htmlFor="code">{t("lots.lotCode")}</label>
              <input
                id="code"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="block">{t("lots.block")}</label>
              <input
                id="block"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="street">{t("lots.street")}</label>
              <input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="hh">{t("lots.household")}</label>
              <input
                id="hh"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="notes">{t("lots.notes")}</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              {t("lots.create")}
            </button>
          </form>
        </div>
      )}

      <div className="card pop-in">
        <h2 className="card-title">{t("lots.title")}</h2>
        <p className="meta-line">{t("lots.drawerHint")}</p>
        {lots.length === 0 ? (
          <p>{t("lots.empty")}</p>
        ) : (
          <div className="list-stack">
            {lots.map((l, i) => (
              <button
                type="button"
                className="list-row list-row-button"
                key={l.id}
                onClick={() => setSelected(l)}
              >
                <span
                  className={`avatar-tile tone-${i % 6} bob`}
                  aria-hidden="true"
                >
                  {(l.street || l.lotCode).slice(0, 1).toUpperCase()}
                </span>
                <div style={{ textAlign: "left" }}>
                  <strong>
                    {l.lotCode} — {l.householdName}
                  </strong>
                  <div className="meta-line">
                    {t("lots.block")}: {l.block || "—"} · {t("lots.street")}:{" "}
                    {l.street || "—"}
                  </div>
                </div>
                <span
                  className={`badge ${l.isActive ? "badge-success" : "badge-muted"}`}
                >
                  {l.isActive ? t("lots.active") : t("lots.inactive")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <LotDetailDrawer lot={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export function LotsPage() {
  return (
    <RequireRole roles={["officer", "treasurer"]}>
      <LotsInner />
    </RequireRole>
  );
}

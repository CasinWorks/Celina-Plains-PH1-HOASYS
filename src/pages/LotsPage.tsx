import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { RequireRole } from "../auth/RequireAuth";
import { LotDetailDrawer } from "../components/LotDetailDrawer";
import type { Lot, UserAccount } from "../domain/types";
import { getServices } from "../services/createServices";

function LotsInner() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [applications, setApplications] = useState<UserAccount[]>([]);
  const [selected, setSelected] = useState<Lot | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = hasRole("treasurer");

  const [lotCode, setLotCode] = useState("");
  const [block, setBlock] = useState("");
  const [street, setStreet] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [notes, setNotes] = useState("");
  const [residentName, setResidentName] = useState("");
  const [residentUser, setResidentUser] = useState("");
  const [residentPassword, setResidentPassword] = useState("");
  const [residentMobile, setResidentMobile] = useState("");
  const [residentLot, setResidentLot] = useState("");

  async function load() {
    const repo = getServices().repo;
    const [lotRows, users] = await Promise.all([
      repo.listLots(),
      repo.listUsers(),
    ]);
    setLots(lotRows);
    setApplications(users.filter((user) => user.approvalStatus === "pending"));
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

  async function verifyApplication(userId: string) {
    if (!session) return;
    setError("");
    setMessage("");
    try {
      const approved = await getServices().repo.approveHomeownerApplication(
        userId,
        session,
      );
      setMessage(t("lots.verified", { name: approved.fullName }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function declineApplication(userId: string) {
    if (!session) return;
    setError("");
    setMessage("");
    try {
      await getServices().repo.rejectHomeownerApplication(userId, session);
      setMessage(t("lots.declined"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function addResident(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setMessage("");
    if (residentPassword.length < 8) {
      setError(t("register.passwordShort"));
      return;
    }
    try {
      await getServices().auth.provisionHomeowner(
        {
          fullName: residentName,
          username: residentUser,
          password: residentPassword,
          mobile: residentMobile,
          lotCode: residentLot,
        },
        session,
      );
      setMessage(
        t("lots.residentAdded", {
          name: residentName.trim(),
          username: residentUser.trim().toLowerCase(),
        }),
      );
      setResidentName("");
      setResidentUser("");
      setResidentPassword("");
      setResidentMobile("");
      setResidentLot("");
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

      <div className="card pop-in">
        <h2 className="card-title">{t("lots.applications")}</h2>
        <p className="hint">{t("lots.applicationsLead")}</p>
        {applications.length === 0 ? (
          <p>{t("lots.noApplications")}</p>
        ) : (
          <div className="list-stack">
            {applications.map((person) => (
              <div className="list-row list-row-pair" key={person.id}>
                <div style={{ textAlign: "left" }}>
                  <strong>
                    {person.fullName} — {person.requestedLotCode}
                  </strong>
                  <div className="meta-line">{person.username}</div>
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void verifyApplication(person.id)}
                  >
                    {t("lots.verify")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void declineApplication(person.id)}
                  >
                    {t("lots.decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card pop-in">
        <h2 className="card-title">{t("lots.addResident")}</h2>
        <p className="hint">{t("lots.addResidentLead")}</p>
        <form onSubmit={addResident}>
          <div className="form-field">
            <label htmlFor="resident-name">{t("lots.fullName")}</label>
            <input
              id="resident-name"
              value={residentName}
              onChange={(e) => setResidentName(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="resident-lot">{t("lots.lotCode")}</label>
            <input
              id="resident-lot"
              value={residentLot}
              onChange={(e) => setResidentLot(e.target.value)}
              required
            />
            <span className="hint">{t("register.lotHint")}</span>
          </div>
          <div className="form-field">
            <label htmlFor="resident-mobile">{t("lots.mobile")}</label>
            <input
              id="resident-mobile"
              type="tel"
              value={residentMobile}
              onChange={(e) => setResidentMobile(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="resident-user">{t("lots.username")}</label>
            <input
              id="resident-user"
              autoComplete="off"
              value={residentUser}
              onChange={(e) => setResidentUser(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="resident-password">{t("lots.password")}</label>
            <input
              id="resident-password"
              type="password"
              autoComplete="new-password"
              value={residentPassword}
              onChange={(e) => setResidentPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {t("lots.addResident")}
          </button>
        </form>
      </div>

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

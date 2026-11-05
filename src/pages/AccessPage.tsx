import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RequireRole } from "../auth/RequireAuth";
import { useAuth } from "../auth/AuthContext";
import {
  BLOCK_LEADERS,
  EXECUTIVE_CANDIDATES,
} from "../content/election2026";
import type { Lot, UserAccount } from "../domain/types";
import { getServices } from "../services/createServices";

function AccessInner() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [people, setPeople] = useState<UserAccount[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const repo = getServices().repo;
    const [users, lotRows] = await Promise.all([
      repo.listUsers(),
      repo.listLots(),
    ]);
    setPeople(
      users
        .filter(
          (user) =>
            user.roles.includes("homeowner") &&
            user.approvalStatus !== "pending" &&
            user.approvalStatus !== "rejected" &&
            user.isActive,
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    );
    setLots(lotRows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function lotLabel(user: UserAccount): string {
    const codes = user.lotIds
      .map((id) => lots.find((lot) => lot.id === id)?.lotCode)
      .filter((code): code is string => Boolean(code));
    return codes.join(", ");
  }

  async function assign(
    person: UserAccount,
    access: { officer: boolean; treasurer: boolean },
  ) {
    if (!session) return;
    setError("");
    setMessage("");
    try {
      await getServices().repo.setMemberAccess(person.id, access, session);
      setMessage(t("access.saved", { name: person.fullName }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("access.title")}</h1>
      <p className="page-lead">{t("access.lead")}</p>
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
        <h2 className="card-title">{t("access.slate")}</h2>
        <p className="hint">{t("access.slateLead")}</p>
        <ul className="officer-list">
          {EXECUTIVE_CANDIDATES.map((row) => (
            <li className="officer-row" key={row.roleKey}>
              <span className="officer-role">
                {t(`officers.roles.${row.roleKey}`)}
              </span>
              <span className="officer-name">{row.name}</span>
            </li>
          ))}
          {BLOCK_LEADERS.filter((row) => row.name).map((row) => (
            <li className="officer-row" key={row.blocks}>
              <span className="officer-role">
                {t("access.blockSeat", { blocks: row.blocks })}
              </span>
              <span className="officer-name">{row.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="card-title">{t("access.homeowners")}</h2>
        {people.length === 0 ? (
          <p>{t("access.empty")}</p>
        ) : (
          <div className="list-stack">
            {people.map((person) => {
              const officer = person.roles.includes("officer");
              const treasurer = person.roles.includes("treasurer");
              return (
                <div className="list-row list-row-pair" key={person.id}>
                  <div>
                    <strong>{person.fullName}</strong>
                    <div className="meta-line">
                      {person.username}
                      {lotLabel(person) ? ` · ${lotLabel(person)}` : ""}
                    </div>
                  </div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className={officer ? "btn btn-secondary" : "btn btn-primary"}
                      onClick={() =>
                        void assign(person, { officer: !officer, treasurer })
                      }
                    >
                      {officer ? t("access.removeOfficer") : t("access.makeOfficer")}
                    </button>
                    <button
                      type="button"
                      className={treasurer ? "btn btn-secondary" : "btn btn-primary"}
                      onClick={() =>
                        void assign(person, { officer, treasurer: !treasurer })
                      }
                    >
                      {treasurer
                        ? t("access.removeTreasurer")
                        : t("access.makeTreasurer")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccessPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AccessInner />
    </RequireRole>
  );
}

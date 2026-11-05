import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { BrandMark } from "../components/BrandMark";
import { PoweredByCasinWorks } from "../components/PoweredByCasinWorks";
import {
  BLOCK_LEADERS,
  ELECTION_YEAR,
  EXECUTIVE_CANDIDATES,
} from "../content/election2026";

function OfficersList() {
  const { t } = useTranslation();

  return (
    <div className="officers-page">
      <p className="login-eyebrow">{t("officers.kicker", { year: ELECTION_YEAR })}</p>
      <h1 className="page-title">{t("officers.title")}</h1>
      <p className="page-lead">{t("officers.lead")}</p>

      <div className="card">
        <h2 className="card-title">{t("officers.executive")}</h2>
        <ul className="officer-list">
          {EXECUTIVE_CANDIDATES.map((row) => (
            <li key={row.roleKey} className="officer-row">
              <span className="officer-role">
                {t(`officers.roles.${row.roleKey}`)}
              </span>
              <span className="officer-name">{row.name}</span>
            </li>
          ))}
        </ul>
        <p className="officer-note">{t("officers.secretaryNote")}</p>
      </div>

      <div className="card">
        <h2 className="card-title">{t("officers.blockLeaders")}</h2>
        <p className="page-lead" style={{ marginBottom: "1rem" }}>
          {t("officers.blockLead")}
        </p>
        <div className="table-wrap">
          <table className="data-table officers-table">
            <thead>
              <tr>
                <th scope="col">{t("officers.block")}</th>
                <th scope="col">{t("officers.candidate")}</th>
              </tr>
            </thead>
            <tbody>
              {BLOCK_LEADERS.map((row) => (
                <tr key={row.blocks}>
                  <td data-label={t("officers.block")}>
                    <span className="officer-block">{row.blocks}</span>
                  </td>
                  <td data-label={t("officers.candidate")}>
                    {row.name ? (
                      <span className="officer-name">{row.name}</span>
                    ) : (
                      <span className="officer-vacant">{t("officers.vacant")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="hint">{t("officers.source")}</p>
      <p className="login-public-link">
        <Link to="/vote">{t("voting.title")}</Link>
      </p>
    </div>
  );
}

export function OfficersPage() {
  const { t } = useTranslation();
  const { session } = useAuth();

  return (
    <div className="public-page">
      <header className="public-top">
        <Link to={session ? "/" : "/login"} className="brand-wordmark">
          <BrandMark />
          <span>{t("app.shortName")}</span>
        </Link>
        <Link className="btn btn-primary" to={session ? "/" : "/login"}>
          {session ? t("officers.backToPortal") : t("login.submit")}
        </Link>
      </header>
      <main className="public-main">
        <OfficersList />
      </main>
      <footer className="app-footer">
        <PoweredByCasinWorks variant="banner" />
      </footer>
    </div>
  );
}

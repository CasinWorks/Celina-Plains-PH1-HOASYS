import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PoweredByCasinWorks } from "../components/PoweredByCasinWorks";
import { TextSizeToggle } from "../components/TextSizeToggle";
import { DEMO_PASSWORD, DEMO_USERS } from "../lib/config";
import { getServices, isFirebaseEnabled } from "../services/createServices";
import { applyTextSize, getStoredTextSize } from "../lib/textSize";

export function LoginPage() {
  const { t } = useTranslation();
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  useEffect(() => {
    applyTextSize(getStoredTextSize());
  }, []);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username.trim().toLowerCase(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.invalid"));
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    setBusy(true);
    setSeedMsg("");
    try {
      await getServices().repo.seedDemoData(true);
      setSeedMsg(t("settings.seeded"));
      setUsername(DEMO_USERS.homeowner.username);
      setPassword(DEMO_PASSWORD);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function fill(role: keyof typeof DEMO_USERS) {
    setUsername(DEMO_USERS[role].username);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="login-page">
      <div className="demo-banner" role="status">
        {t(isFirebaseEnabled() ? "app.cloudBanner" : "app.demoBanner")}
      </div>
      <PoweredByCasinWorks variant="float" />

      <div className="login-top">
        <Link to="/welcome" className="brand-wordmark">
          <span className="brand-blob" aria-hidden="true">
            CP
          </span>
          <span>{t("app.name")}</span>
        </Link>
        <div className="header-actions">
          <LanguageSwitch />
          <TextSizeToggle />
        </div>
      </div>

      <div className="card login-card">
        <p className="login-eyebrow">{t("app.shortName")}</p>
        <h1 className="page-title">{t("login.title")}</h1>
        <p className="page-lead">{t("login.lead")}</p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {seedMsg && (
          <div className="alert alert-success" role="status">
            {seedMsg}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="username">{t("login.username")}</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">{t("login.password")}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {t("login.submit")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void loadDemo()}
              disabled={busy}
            >
              {t("settings.seedDemo")}
            </button>
          </div>
        </form>

        <p className="login-demo-label">{t("login.demoHint", { password: DEMO_PASSWORD })}</p>
        <div className="demo-chip-row">
          <button
            type="button"
            className="demo-chip"
            onClick={() => fill("homeowner")}
          >
            {t("login.homeownerDemo")}
          </button>
          <button
            type="button"
            className="demo-chip"
            onClick={() => fill("officer")}
          >
            {t("login.officerDemo")}
          </button>
          <button
            type="button"
            className="demo-chip"
            onClick={() => fill("treasurer")}
          >
            {t("login.treasurerDemo")}
          </button>
        </div>
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          {t("settings.seedDemoHint")}
        </p>
        <p className="login-public-link">
          <Link to="/officers">{t("officers.publicLink")}</Link>
        </p>
        <div className="footer-powered" style={{ marginTop: "1.5rem" }}>
          <PoweredByCasinWorks variant="banner" />
        </div>
      </div>
    </div>
  );
}

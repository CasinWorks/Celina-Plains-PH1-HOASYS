import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { TextSizeToggle } from "../components/TextSizeToggle";
import { DEMO_PASSWORD, DEMO_USERS } from "../lib/config";
import { getServices } from "../services/createServices";
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
        {t("app.demoBanner")}
      </div>
      <div className="gold-rule" aria-hidden="true" />
      <header className="official-header">
        <div className="brand-block">
          <div className="brand-monogram" aria-hidden="true">
            CP
          </div>
          <div className="brand-text">
            <strong>{t("app.name")}</strong>
            <span>{t("app.tagline")}</span>
          </div>
        </div>
        <div className="header-actions">
          <LanguageSwitch />
          <TextSizeToggle />
        </div>
      </header>

      <div className="card login-card">
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
          </div>
        </form>

        <hr style={{ margin: "1.5rem 0", borderColor: "var(--border)" }} />

        <p style={{ fontWeight: 700 }}>
          {t("login.demoHint", { password: DEMO_PASSWORD })}
        </p>
        <div className="btn-row" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fill("homeowner")}
          >
            {t("login.homeownerDemo")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fill("officer")}
          >
            {t("login.officerDemo")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fill("treasurer")}
          >
            {t("login.treasurerDemo")}
          </button>
        </div>
        <div className="btn-row" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void loadDemo()}
            disabled={busy}
          >
            {t("settings.seedDemo")}
          </button>
        </div>
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          {t("settings.seedDemoHint")}
        </p>
      </div>
    </div>
  );
}

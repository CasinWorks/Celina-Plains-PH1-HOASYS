import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { BrandMark } from "../components/BrandMark";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PoweredByCasinWorks } from "../components/PoweredByCasinWorks";
import { TextSizeToggle } from "../components/TextSizeToggle";
import { applyTextSize, getStoredTextSize } from "../lib/textSize";

export function RegisterPage() {
  const { t } = useTranslation();
  const { apply, session } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mobile, setMobile] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    applyTextSize(getStoredTextSize());
  }, []);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("register.passwordShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("register.passwordMismatch"));
      return;
    }
    if (!agreed) {
      setError(t("privacy.required"));
      return;
    }
    setBusy(true);
    try {
      await apply({
        fullName,
        username,
        password,
        mobile,
        lotCode,
      });
      setSent(true);
      setFullName("");
      setUsername("");
      setPassword("");
      setConfirm("");
      setMobile("");
      setLotCode("");
      setAgreed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <PoweredByCasinWorks variant="float" />
      <div className="login-top">
        <Link to="/welcome" className="brand-wordmark">
          <BrandMark />
          <span>{t("app.name")}</span>
        </Link>
        <div className="header-actions">
          <LanguageSwitch />
          <TextSizeToggle />
        </div>
      </div>

      <div className="card login-card">
        <p className="login-eyebrow">{t("app.shortName")}</p>
        <h1 className="page-title">{t("register.title")}</h1>
        <p className="page-lead">{t("register.lead")}</p>
        {sent && (
          <div className="alert alert-success" role="status">
            {t("register.sent")}
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="fullName">{t("register.fullName")}</label>
            <input
              id="fullName"
              name="name"
              autoComplete="name"
              placeholder={t("register.fullNamePh")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="lotCode">{t("register.lotCode")}</label>
            <input
              id="lotCode"
              name="lotCode"
              autoComplete="off"
              placeholder={t("register.lotCodePh")}
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              required
            />
            <span className="hint">{t("register.lotHint")}</span>
          </div>
          <div className="form-field">
            <label htmlFor="mobile">{t("register.mobile")}</label>
            <input
              id="mobile"
              name="tel"
              type="tel"
              autoComplete="tel"
              placeholder={t("register.mobilePh")}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="username">{t("register.username")}</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              placeholder={t("register.usernamePh")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">{t("register.password")}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t("register.passwordPh")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="confirm">{t("register.confirm")}</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder={t("register.confirmPh")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <label className="register-consent">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>{t("register.privacy")}</span>
          </label>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? t("common.loading") : t("register.submit")}
            </button>
          </div>
        </form>
        <p className="login-public-link">
          <Link to="/login">{t("register.haveAccount")}</Link>
        </p>
      </div>
    </div>
  );
}

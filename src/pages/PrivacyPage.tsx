import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { BrandMark } from "../components/BrandMark";

export function PrivacyPage() {
  const { t } = useTranslation();
  const { acceptPrivacy, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.consentPrivacyAt) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  return (
    <div className="login-page">
      <div className="login-top">
        <div className="brand-wordmark">
          <BrandMark />
          <span>{t("app.shortName")}</span>
        </div>
      </div>
      <div className="card login-card">
        <p className="login-eyebrow">{t("app.shortName")}</p>
        <h1 className="page-title">{t("privacy.title")}</h1>
        <p className="page-lead">{t("privacy.body")}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void acceptPrivacy().then(() => navigate("/", { replace: true }));
          }}
        >
          {t("privacy.accept")}
        </button>
      </div>
    </div>
  );
}

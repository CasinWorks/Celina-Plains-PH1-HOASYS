import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

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
    <div className="card" style={{ maxWidth: 640, margin: "2rem auto" }}>
      <h1 className="page-title">{t("privacy.title")}</h1>
      <p>{t("privacy.body")}</p>
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
  );
}

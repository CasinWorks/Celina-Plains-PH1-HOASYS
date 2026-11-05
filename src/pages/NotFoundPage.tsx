import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="login-page">
      <div className="card login-card" style={{ marginTop: "4rem" }}>
        <p className="login-eyebrow">{t("app.shortName")}</p>
        <h1 className="page-title">{t("errors.notFound")}</h1>
        <p className="page-lead">{t("errors.notFoundLead")}</p>
        <Link className="btn btn-primary" to="/">
          {t("errors.goHome")}
        </Link>
      </div>
    </div>
  );
}

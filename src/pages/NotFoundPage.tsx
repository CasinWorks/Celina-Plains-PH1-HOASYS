import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="main-panel">
      <h1 className="page-title">{t("errors.notFound")}</h1>
      <Link className="btn btn-primary" to="/">
        {t("errors.goHome")}
      </Link>
    </div>
  );
}

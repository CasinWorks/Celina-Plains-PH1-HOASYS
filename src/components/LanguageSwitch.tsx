import { useTranslation } from "react-i18next";
import {
  setStoredLanguage,
  type AppLanguage,
} from "../i18n";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language === "fil" ? "fil" : "en") as AppLanguage;

  function setLang(lang: AppLanguage) {
    setStoredLanguage(lang);
    void i18n.changeLanguage(lang);
  }

  return (
    <div
      className="text-size-toggle"
      role="group"
      aria-label={t("lang.switch")}
    >
      <button
        type="button"
        aria-pressed={current === "en"}
        onClick={() => setLang("en")}
      >
        {t("lang.english")}
      </button>
      <button
        type="button"
        aria-pressed={current === "fil"}
        onClick={() => setLang("fil")}
      >
        {t("lang.filipino")}
      </button>
    </div>
  );
}

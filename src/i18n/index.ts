import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fil from "./locales/fil.json";

export const LANG_KEY = "celina_hoa_lang";
export type AppLanguage = "en" | "fil";

export function getStoredLanguage(): AppLanguage {
  const raw = localStorage.getItem(LANG_KEY);
  return raw === "fil" ? "fil" : "en";
}

export function setStoredLanguage(lang: AppLanguage): void {
  localStorage.setItem(LANG_KEY, lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fil: { translation: fil },
  },
  lng: typeof window !== "undefined" ? getStoredLanguage() : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

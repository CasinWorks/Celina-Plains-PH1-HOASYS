import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PoweredByCasinWorks } from "../components/PoweredByCasinWorks";

const SCENES = [
  {
    src: "/landing/living.jpg",
    altKey: "landing.livingAlt",
    captionKey: "landing.living",
    span: true,
  },
  {
    src: "/landing/garden.jpg",
    altKey: "landing.gardenAlt",
    captionKey: "landing.garden",
    span: false,
  },
  {
    src: "/landing/gate.jpg",
    altKey: "landing.gateAlt",
    captionKey: "landing.gate",
    span: false,
  },
] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const { session } = useAuth();

  return (
    <div className="landing">
      <header className="public-top landing-top">
        <Link to="/welcome" className="brand-wordmark">
          <span className="brand-blob" aria-hidden="true">
            CP
          </span>
          <span>{t("app.shortName")}</span>
        </Link>
        <div className="landing-top-actions">
          <LanguageSwitch />
          <Link className="btn btn-primary" to={session ? "/" : "/login"}>
            {session ? t("landing.enter") : t("landing.signIn")}
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <img src="/landing/evening.jpg" alt={t("landing.streetAlt")} />
        <div className="landing-hero-shade" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="login-eyebrow">{t("landing.kicker")}</p>
          <h1>{t("landing.title")}</h1>
          <p className="landing-lead">{t("landing.lead")}</p>
          <div className="landing-actions">
            <Link className="btn landing-btn-paper" to={session ? "/" : "/login"}>
              {session ? t("landing.enter") : t("landing.signIn")}
            </Link>
            <Link className="btn landing-btn-ghost" to="/officers">
              {t("landing.candidates")}
            </Link>
          </div>
        </div>
      </section>

      <p className="landing-note">{t("landing.sampleNote")}</p>

      <section className="landing-gallery" aria-label={t("landing.gallery")}>
        {SCENES.map((scene) => (
          <figure
            key={scene.src}
            className={`landing-shot${scene.span ? " is-span" : ""}`}
          >
            <img src={scene.src} alt={t(scene.altKey)} />
            <figcaption>{t(scene.captionKey)}</figcaption>
          </figure>
        ))}
      </section>

      <section className="landing-sheet">
        <div className="landing-sheet-inner">
          <h2>{t("landing.portalTitle")}</h2>
          <ul className="landing-points">
            <li>
              <strong>{t("landing.dues")}</strong>
              <p>{t("landing.duesBody")}</p>
            </li>
            <li>
              <strong>{t("landing.pay")}</strong>
              <p>{t("landing.payBody")}</p>
            </li>
            <li>
              <strong>{t("landing.vote")}</strong>
              <p>{t("landing.voteBody")}</p>
            </li>
          </ul>
        </div>
      </section>

      <footer className="app-footer">
        <PoweredByCasinWorks variant="banner" />
      </footer>
    </div>
  );
}

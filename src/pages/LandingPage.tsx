import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { BrandMark } from "../components/BrandMark";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PayOptions } from "../components/PayOptions";
import { PoweredByCasinWorks } from "../components/PoweredByCasinWorks";
import type { Announcement } from "../domain/types";
import { nextCommunityNotice } from "../lib/notices";
import { getServices } from "../services/createServices";

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

function formatGathering(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LandingPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [notice, setNotice] = useState<Announcement | null>(null);
  const [contact, setContact] = useState("");

  useEffect(() => {
    const repo = getServices().repo;
    void repo
      .listAnnouncements()
      .then((rows) => setNotice(nextCommunityNotice(rows)))
      .catch(() => setNotice(null));
    void repo
      .getSiteConfig()
      .then((cfg) => {
        const line = cfg.hoaContact.trim();
        setContact(line.includes("[CONFIG:") ? "" : line);
      })
      .catch(() => setContact(""));
  }, []);

  return (
    <div className="landing">
      <header className="public-top landing-top">
        <Link to="/welcome" className="brand-wordmark">
          <BrandMark />
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
            {!session && (
              <Link className="btn landing-btn-ghost" to="/register">
                {t("landing.register")}
              </Link>
            )}
            <Link className="btn landing-btn-ghost" to="/officers">
              {t("landing.candidates")}
            </Link>
          </div>
        </div>
      </section>

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
          <section className="use-strip" aria-label={t("landing.stepsTitle")}>
            <h2>{t("landing.stepsTitle")}</h2>
            <ol>
              <li>
                <span>01</span>
                {t("landing.stepSignIn")}
              </li>
              <li>
                <span>02</span>
                {t("landing.stepDue")}
              </li>
              <li>
                <span>03</span>
                {t("landing.stepProof")}
              </li>
            </ol>
            {notice?.eventDate && (
              <p className="landing-next">
                {t("landing.nextGathering", {
                  title: notice.title,
                  date: formatGathering(notice.eventDate),
                })}
              </p>
            )}
          </section>
          <PayOptions />
          {contact && <p className="landing-contact">{contact}</p>}
        </div>
      </section>

      <footer className="app-footer">
        <PoweredByCasinWorks variant="banner" />
      </footer>
    </div>
  );
}

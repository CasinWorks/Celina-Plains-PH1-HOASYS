import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { HOA_NAME } from "../lib/config";
import { LanguageSwitch } from "./LanguageSwitch";
import { TextSizeToggle } from "./TextSizeToggle";

type NavItem = {
  to: string;
  labelKey: string;
  icon: string;
  roles?: Array<"homeowner" | "officer" | "treasurer">;
};

const NAV: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: "⌂" },
  { to: "/my-lot", labelKey: "nav.myLot", icon: "▣" },
  { to: "/dues", labelKey: "nav.dues", icon: "₱" },
  { to: "/payments", labelKey: "nav.payments", icon: "↑" },
  {
    to: "/lots",
    labelKey: "nav.lots",
    icon: "▦",
    roles: ["officer", "treasurer"],
  },
  {
    to: "/expenses",
    labelKey: "nav.expenses",
    icon: "−",
    roles: ["treasurer"],
  },
  { to: "/reports", labelKey: "nav.reports", icon: "▤" },
  {
    to: "/audit",
    labelKey: "nav.audit",
    icon: "📋",
    roles: ["treasurer"],
  },
  {
    to: "/settings",
    labelKey: "nav.settings",
    icon: "⚙",
    roles: ["treasurer"],
  },
];

export function AppLayout() {
  const { t } = useTranslation();
  const { session, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  const items = NAV.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(r)),
  );

  return (
    <div className="app-shell">
      <div className="demo-banner" role="status">
        {t("app.demoBanner")}
      </div>
      <div className="gold-rule" aria-hidden="true" />
      <header className="official-header">
        <div className="brand-block">
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-expanded={open}
            aria-controls="sidebar-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true">☰</span>
            {t("nav.menu")}
          </button>
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
          {session && (
            <>
              <span style={{ fontWeight: 600 }}>
                {session.fullName}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: "var(--primary-dark)" }}
                onClick={() => void logout()}
              >
                {t("nav.logout")}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="layout-body">
        <aside
          id="sidebar-nav"
          className={`sidebar ${open ? "is-open" : ""}`}
        >
          <nav aria-label={t("nav.menu")}>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="nav-link"
                onClick={() => setOpen(false)}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="main-panel">
          <Outlet />
        </main>
      </div>

      <footer className="official-footer">
        <strong>{HOA_NAME}</strong>
        <div>{t("app.officialFooter")}</div>
      </footer>
    </div>
  );
}

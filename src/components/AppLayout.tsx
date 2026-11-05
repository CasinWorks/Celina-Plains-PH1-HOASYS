import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../domain/types";
import { isFirebaseEnabled, subscribeDataChanges } from "../services/createServices";
import { HOA_NAME } from "../lib/config";
import { BrandMark } from "./BrandMark";
import { LanguageSwitch } from "./LanguageSwitch";
import { PoweredByCasinWorks } from "./PoweredByCasinWorks";
import { TextSizeToggle } from "./TextSizeToggle";
import {
  IconAudit,
  IconDues,
  IconExpense,
  IconHome,
  IconLot,
  IconPay,
  IconReport,
  IconSettings,
} from "./NavIcons";

type NavGroup = "house" | "community" | "office";

type NavItem = {
  to: string;
  labelKey: string;
  icon: ReactNode;
  group: NavGroup;
  roles?: Role[];
};

const NAV: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: <IconHome />, group: "house" },
  { to: "/my-lot", labelKey: "nav.myLot", icon: <IconLot />, group: "house" },
  { to: "/dues", labelKey: "nav.dues", icon: <IconDues />, group: "house" },
  { to: "/payments", labelKey: "nav.payments", icon: <IconPay />, group: "house" },
  {
    to: "/announcements",
    labelKey: "nav.announcements",
    icon: <IconReport />,
    group: "community",
  },
  {
    to: "/documents",
    labelKey: "nav.documents",
    icon: <IconReport />,
    group: "community",
  },
  {
    to: "/reports",
    labelKey: "nav.reports",
    icon: <IconReport />,
    group: "community",
  },
  {
    to: "/officers",
    labelKey: "nav.officers",
    icon: <IconAudit />,
    group: "community",
  },
  { to: "/vote", labelKey: "nav.voting", icon: <IconPay />, group: "community" },
  {
    to: "/access",
    labelKey: "nav.access",
    icon: <IconSettings />,
    group: "house",
    roles: ["admin"],
  },
  { to: "/plans", labelKey: "nav.plans", icon: <IconHome />, group: "community" },
  {
    to: "/feedback",
    labelKey: "nav.feedback",
    icon: <IconAudit />,
    group: "community",
  },
  {
    to: "/lots",
    labelKey: "nav.lots",
    icon: <IconLot />,
    group: "office",
    roles: ["officer", "treasurer"],
  },
  {
    to: "/expenses",
    labelKey: "nav.expenses",
    icon: <IconExpense />,
    group: "office",
    roles: ["treasurer"],
  },
  {
    to: "/audit",
    labelKey: "nav.audit",
    icon: <IconAudit />,
    group: "office",
    roles: ["treasurer"],
  },
  {
    to: "/settings",
    labelKey: "nav.settings",
    icon: <IconSettings />,
    group: "office",
    roles: ["treasurer"],
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function NavMenu({
  label,
  open,
  active,
  menuId,
  wrapRef,
  items,
  onToggle,
  onNavigate,
  t,
}: {
  label: string;
  open: boolean;
  active: boolean;
  menuId: string;
  wrapRef: RefObject<HTMLDivElement | null>;
  items: NavItem[];
  onToggle: () => void;
  onNavigate: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="nav-dropdown" ref={wrapRef}>
      <button
        type="button"
        className={`nav-link nav-dropdown-trigger ${open || active ? "is-active" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        {label}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={menuId} className="dropdown-panel" role="menu" aria-label={label}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              role="menuitem"
              className="dropdown-item"
              onClick={onNavigate}
            >
              <span className="nav-icon">{item.icon}</span>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileGroup({
  label,
  items,
  onNavigate,
  t,
}: {
  label: string;
  items: NavItem[];
  onNavigate: () => void;
  t: (key: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mobile-nav-group">
      <p className="mobile-nav-label">{label}</p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className="nav-link mobile-nav-link"
          onClick={onNavigate}
        >
          <span className="nav-icon">{item.icon}</span>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </div>
  );
}

function useClickOutside(
  open: boolean,
  onClose: () => void,
  refs: Array<React.RefObject<HTMLElement | null>>,
) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (refs.every((ref) => ref.current && !ref.current.contains(target))) {
        onClose();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, refs]);
}

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const { session, logout, hasRole } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cloudRev, setCloudRev] = useState(0);
  const [openMenu, setOpenMenu] = useState<NavGroup | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const communityWrapRef = useRef<HTMLDivElement>(null);
  const officeWrapRef = useRef<HTMLDivElement>(null);
  const accountWrapRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const communityMenuId = useId();
  const officeMenuId = useId();
  const accountMenuId = useId();
  const mobileNavId = useId();

  useClickOutside(openMenu === "community", () => setOpenMenu(null), [communityWrapRef]);
  useClickOutside(openMenu === "office", () => setOpenMenu(null), [officeWrapRef]);
  useClickOutside(accountOpen, () => setAccountOpen(false), [accountWrapRef]);

  useEffect(() => subscribeDataChanges(() => setCloudRev((n) => n + 1)), []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const items = NAV.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(r)),
  );
  const houseItems = items.filter((item) => item.group === "house");
  const communityItems = items.filter((item) => item.group === "community");
  const officeItems = items.filter((item) => item.group === "office");

  function groupActive(group: NavItem[]) {
    return group.some(
      (item) =>
        location.pathname === item.to ||
        (item.to !== "/" && location.pathname.startsWith(item.to)),
    );
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="app-shell">
      <div className="demo-banner" role="status">
        {t(isFirebaseEnabled() ? "app.cloudBanner" : "app.demoBanner")}
      </div>
      <PoweredByCasinWorks variant="float" />

      <header className="top-nav">
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={mobileOpen}
          aria-controls={mobileNavId}
          onClick={() => {
            setMobileOpen((v) => !v);
            setOpenMenu(null);
            setAccountOpen(false);
          }}
        >
          <span aria-hidden="true">{mobileOpen ? "✕" : "☰"}</span>
          <span className="sr-only">{t("nav.menu")}</span>
        </button>

        <NavLink to="/" className="brand-wordmark" end onClick={closeMobile}>
          <BrandMark />
          <span className="brand-label">{t("app.shortName")}</span>
        </NavLink>

        {/* Desktop pill nav */}
        <nav className="pill-nav" aria-label={t("nav.menu")}>
          <div className="pill-nav-primary">
            {houseItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="nav-link"
              >
                <span className="nav-icon">{item.icon}</span>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>

          <NavMenu
            label={t("nav.community")}
            open={openMenu === "community"}
            active={groupActive(communityItems)}
            menuId={communityMenuId}
            wrapRef={communityWrapRef}
            items={communityItems}
            onToggle={() => {
              setOpenMenu((current) => (current === "community" ? null : "community"));
              setAccountOpen(false);
            }}
            onNavigate={() => setOpenMenu(null)}
            t={t}
          />
          {officeItems.length > 0 && (
            <NavMenu
              label={t("nav.office")}
              open={openMenu === "office"}
              active={groupActive(officeItems)}
              menuId={officeMenuId}
              wrapRef={officeWrapRef}
              items={officeItems}
              onToggle={() => {
                setOpenMenu((current) => (current === "office" ? null : "office"));
                setAccountOpen(false);
              }}
              onNavigate={() => setOpenMenu(null)}
              t={t}
            />
          )}
        </nav>

        <div className="header-actions">
          {session && (
            <div className="nav-dropdown account-dropdown" ref={accountWrapRef}>
              <button
                type="button"
                className="user-chip user-chip-button"
                aria-expanded={accountOpen}
                aria-controls={accountMenuId}
                aria-haspopup="menu"
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setOpenMenu(null);
                }}
              >
                <span className="user-avatar" aria-hidden="true">
                  {initials(session.fullName)}
                </span>
                <span className="user-chip-name">{session.fullName}</span>
                <span className="user-chip-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              {accountOpen && (
                <div
                  id={accountMenuId}
                  className="dropdown-panel dropdown-panel-end"
                  role="menu"
                  aria-label={t("nav.account")}
                >
                  <div className="dropdown-user">
                    <strong>{session.fullName}</strong>
                    <span>
                      {session.roles.map((r) => t(`roles.${r}`)).join(", ")}
                    </span>
                  </div>
                  <div className="dropdown-section">
                    <p className="dropdown-section-label">{t("lang.label")}</p>
                    <LanguageSwitch />
                  </div>
                  <div className="dropdown-section">
                    <p className="dropdown-section-label">
                      {t("textSize.label")}
                    </p>
                    <TextSizeToggle />
                  </div>
                  <button
                    type="button"
                    className="dropdown-item dropdown-danger"
                    role="menuitem"
                    onClick={() => void logout()}
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer — separate from desktop pill nav */}
      <div
        className={`mobile-nav-backdrop ${mobileOpen ? "is-open" : ""}`}
        aria-hidden={!mobileOpen}
        onClick={closeMobile}
      />
      <div
        ref={mobilePanelRef}
        id={mobileNavId}
        className={`mobile-nav-panel ${mobileOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal={mobileOpen}
        aria-label={t("nav.menu")}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen ? true : undefined}
      >
        <nav className="mobile-nav-list" aria-label={t("nav.menu")}>
          <MobileGroup label={t("nav.groupHouse")} items={houseItems} onNavigate={closeMobile} t={t} />
          <MobileGroup label={t("nav.community")} items={communityItems} onNavigate={closeMobile} t={t} />
          <MobileGroup label={t("nav.office")} items={officeItems} onNavigate={closeMobile} t={t} />
        </nav>
        <div className="mobile-account-block">
          <p className="dropdown-section-label">{t("nav.account")}</p>
          {session && (
            <div className="dropdown-user">
              <strong>{session.fullName}</strong>
              <span>
                {session.roles.map((r) => t(`roles.${r}`)).join(", ")}
              </span>
            </div>
          )}
          <LanguageSwitch />
          <TextSizeToggle />
          {session && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                closeMobile();
                void logout();
              }}
            >
              {t("nav.logout")}
            </button>
          )}
        </div>
      </div>

      <main className="main-panel">
        {session && (
          <div className="concierge">
            <p className="concierge-date">
              {new Intl.DateTimeFormat(
                i18n.language.startsWith("fil") ? "fil-PH" : "en-GB",
                { weekday: "long", day: "numeric", month: "long", year: "numeric" },
              ).format(new Date())}
            </p>
            <p className="concierge-resident">{session.fullName}</p>
          </div>
        )}
        <Outlet key={`${location.pathname}:${cloudRev}`} />
      </main>

      <footer className="app-footer">
        <strong>{HOA_NAME}</strong>
        <div>{t("app.playfulFooter")}</div>
        <div className="footer-powered">
          <PoweredByCasinWorks variant="banner" />
        </div>
      </footer>
    </div>
  );
}

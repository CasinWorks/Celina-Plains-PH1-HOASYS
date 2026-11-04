import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { RequireRole } from "../auth/RequireAuth";
import type { ExportBundle, SiteConfig } from "../domain/types";
import { getServices } from "../services/createServices";

function SettingsInner() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    void getServices()
      .repo.getSiteConfig()
      .then(setCfg);
  }, []);

  async function saveConfig(e: FormEvent) {
    e.preventDefault();
    if (!session || !cfg) return;
    try {
      const saved = await getServices().repo.updateSiteConfig(cfg, session);
      setCfg(saved);
      setMessage(t("settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function seed() {
    if (!window.confirm(t("settings.seedConfirm"))) return;
    try {
      await getServices().repo.seedDemoData(true);
      setCfg(await getServices().repo.getSiteConfig());
      setMessage(t("settings.seeded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function exportBackup() {
    const bundle = await getServices().repo.exportData(true);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `celina-plains-p1-hoa-backup-${bundle.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(t("settings.exported"));
  }

  async function importBackup(file: File) {
    if (!window.confirm(t("settings.importConfirm"))) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as ExportBundle;
      await getServices().repo.importData(bundle);
      setCfg(await getServices().repo.getSiteConfig());
      setMessage(t("settings.imported"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    try {
      await getServices().auth.changePassword(
        session.userId,
        currentPassword,
        newPassword,
      );
      setMessage(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (!cfg) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <h1 className="page-title">{t("settings.title")}</h1>
      <p className="page-lead">{t("settings.lead")}</p>
      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t("settings.siteConfig")}</h2>
        <form onSubmit={saveConfig}>
          <div className="form-field">
            <label htmlFor="lotCount">{t("settings.lotCount")}</label>
            <input
              id="lotCount"
              type="number"
              value={cfg.lotCount}
              onChange={(e) =>
                setCfg({ ...cfg, lotCount: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="dues">{t("settings.monthlyDues")}</label>
            <input
              id="dues"
              value={cfg.monthlyDuesAmount}
              onChange={(e) =>
                setCfg({ ...cfg, monthlyDuesAmount: e.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="prate">{t("settings.penaltyRate")}</label>
            <input
              id="prate"
              value={cfg.penaltyRatePercent}
              onChange={(e) =>
                setCfg({ ...cfg, penaltyRatePercent: e.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="grace">{t("settings.penaltyGrace")}</label>
            <input
              id="grace"
              type="number"
              value={cfg.penaltyGraceDays}
              onChange={(e) =>
                setCfg({ ...cfg, penaltyGraceDays: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="compound">
              <input
                id="compound"
                type="checkbox"
                checked={cfg.penaltyCompounding}
                onChange={(e) =>
                  setCfg({ ...cfg, penaltyCompounding: e.target.checked })
                }
              />{" "}
              {t("settings.penaltyCompounding")}
            </label>
          </div>
          <div className="form-field">
            <label htmlFor="pay">{t("settings.paymentInstructions")}</label>
            <textarea
              id="pay"
              value={cfg.paymentInstructions}
              onChange={(e) =>
                setCfg({ ...cfg, paymentInstructions: e.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="contact">{t("settings.hoaContact")}</label>
            <input
              id="contact"
              value={cfg.hoaContact}
              onChange={(e) => setCfg({ ...cfg, hoaContact: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label htmlFor="open">{t("settings.openingBalance")}</label>
            <input
              id="open"
              value={cfg.openingCashBalance}
              onChange={(e) =>
                setCfg({ ...cfg, openingCashBalance: e.target.value })
              }
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {t("common.save")}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="card-title">{t("settings.demoData")}</h2>
        <p>{t("settings.seedDemoHint")}</p>
        <button type="button" className="btn btn-primary" onClick={() => void seed()}>
          {t("settings.seedDemo")}
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">{t("settings.backup")}</h2>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void exportBackup()}
          >
            {t("settings.exportJson")}
          </button>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            {t("settings.importJson")}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importBackup(f);
              }}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">{t("settings.changePasswordTitle")}</h2>
        <form onSubmit={changePassword}>
          <div className="form-field">
            <label htmlFor="cur">{t("settings.currentPassword")}</label>
            <input
              id="cur"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="neu">{t("settings.newPassword")}</label>
            <input
              id="neu"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {t("nav.changePassword")}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <RequireRole roles={["treasurer"]}>
      <SettingsInner />
    </RequireRole>
  );
}

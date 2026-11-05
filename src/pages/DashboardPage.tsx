import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { formatPeso } from "../domain/money";
import type {
  Announcement,
  DuesCharge,
  HoaPlan,
  HomeownerFinanceSummary,
  Payment,
} from "../domain/types";
import { getServices } from "../services/createServices";
import { todayYmd } from "../lib/ids";

function daysUntil(dueDate: string): number {
  const a = new Date(`${todayYmd()}T00:00:00`);
  const b = new Date(`${dueDate}T00:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [balance, setBalance] = useState("0.00");
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [lastPay, setLastPay] = useState<Payment | null>(null);
  const [summary, setSummary] = useState<HomeownerFinanceSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [upcoming, setUpcoming] = useState<DuesCharge[]>([]);
  const [recentPays, setRecentPays] = useState<Payment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [plans, setPlans] = useState<HoaPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const repo = getServices().repo;
    void (async () => {
      setLoading(true);
      try {
        const lotId = session.lotIds[0];
        if (lotId) {
          setBalance(await repo.lotBalance(lotId));
          const dues = await repo.listDues({ lotId });
          const open = dues
            .filter((d) => d.status === "unpaid" || d.status === "partial")
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          setNextDue(open[0]?.dueDate ?? null);
          setUpcoming(open.slice(0, 4));
          const pays = await repo.listPayments({ lotId });
          setLastPay(
            pays.find((p) => p.status === "verified" && !p.isVoid) ?? null,
          );
          setRecentPays(pays.filter((p) => !p.isVoid).slice(0, 5));
        } else if (hasRole("treasurer") || hasRole("officer")) {
          const pays = await repo.listPayments();
          setRecentPays(pays.filter((p) => !p.isVoid).slice(0, 5));
          const dues = await repo.listDues();
          setUpcoming(
            dues
              .filter((d) => d.status === "unpaid" || d.status === "partial")
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 4),
          );
        }
        setSummary(await repo.homeownerFinanceSummary());
        setAnnouncements((await repo.listAnnouncements()).slice(0, 3));
        setPlans(
          (await repo.listHoaPlans())
            .filter((p) => p.status !== "done")
            .slice(0, 3),
        );
        if (hasRole("treasurer")) {
          const pending = await repo.listPayments({ status: "pending" });
          setPendingCount(pending.filter((p) => !p.isVoid).length);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [session, hasRole]);

  if (!session) return null;
  if (loading) return <p>{t("common.loading")}</p>;

  const firstName = session.fullName.split(/\s+/)[0] ?? session.fullName;
  const hour = new Date().getHours();
  const greetKey =
    hour < 12
      ? "dashboard.morning"
      : hour < 17
        ? "dashboard.afternoon"
        : "dashboard.evening";
  const tone = (i: number) => `tone-${i % 6}`;
  const watchCount =
    upcoming.length +
    (hasRole("treasurer") ? pendingCount : 0) +
    announcements.filter((a) => a.pinned).length;

  return (
    <div className="page-animate">
      <p className="greeting-title">
        {t(greetKey, { name: firstName })}
      </p>
      <p className="greeting-sub">
        {t("dashboard.activityLine", { count: watchCount })}
      </p>
      <span className="role-chip">
        {t("dashboard.rolesLabel")}:{" "}
        {session.roles.map((r) => t(`roles.${r}`)).join(", ")}
      </span>

      {upcoming.length > 0 && (
        <section className="reminder-strip pop-in">
          <div className="reminder-strip-head">
            <h2>{t("dashboard.dueReminders")}</h2>
            <Link to="/dues">{t("dashboard.viewDues")}</Link>
          </div>
          <div className="reminder-chips">
            {upcoming.map((d) => {
              const delta = daysUntil(d.dueDate);
              const overdue = delta < 0;
              const soon = delta >= 0 && delta <= 7;
              return (
                <div
                  key={d.id}
                  className={`reminder-chip ${overdue ? "is-overdue" : soon ? "is-soon" : ""}`}
                >
                  <div>
                    <strong>
                      {d.lotCode} · {d.periodYear}-
                      {String(d.periodMonth).padStart(2, "0")}
                    </strong>
                    <div className="meta-line">
                      {overdue
                        ? t("dashboard.overdueBy", { days: Math.abs(delta) })
                        : t("dashboard.dueIn", { days: delta })}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="bento-grid">
        <section className="bento-card bento-span-5 pop-in">
          <div className="announcement-head">
            <h2 className="card-title">{t("announcements.title")}</h2>
            <Link className="meta-line" to="/announcements">
              {t("common.view")}
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p>{t("announcements.empty")}</p>
          ) : (
            <ul className="timeline">
              {announcements.map((a, i) => (
                <li className="timeline-item" key={a.id}>
                  <span
                    className={`timeline-icon ${i % 2 === 0 ? "mint" : "peach"} bob`}
                    aria-hidden="true"
                  >
                    {a.pinned ? "📌" : "📣"}
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <div className="meta-line">
                      {a.body.slice(0, 90)}
                      {a.body.length > 90 ? "…" : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bento-card bento-span-7 pop-in delay-1">
          <h2 className="card-title">{t("dashboard.snapshot")}</h2>
          <div className="metric-grid">
            <div className="metric-tile lilac float-soft">
              <p className="label">{t("dashboard.balanceDue")}</p>
              <p className="value">{formatPeso(balance)}</p>
            </div>
            <div className="metric-tile peach">
              <p className="label">{t("dashboard.nextDue")}</p>
              <p className="value">{nextDue ?? t("dashboard.none")}</p>
            </div>
            <div className="metric-tile mint">
              <p className="label">{t("dashboard.lastPayment")}</p>
              <p className="value">
                {lastPay ? formatPeso(lastPay.amount) : t("dashboard.none")}
              </p>
            </div>
            <div className="metric-tile sky">
              <p className="label">{t("reports.communityArrears")}</p>
              <p className="value">
                {formatPeso(summary?.communityArrears ?? "0")}
              </p>
            </div>
            {hasRole("treasurer") && (
              <>
                <div className="metric-tile lemon">
                  <p className="label">{t("dashboard.collectionsMonth")}</p>
                  <p className="value">
                    {formatPeso(summary?.collectionsThisMonth ?? "0")}
                  </p>
                </div>
                <div className="metric-tile pink">
                  <p className="label">{t("dashboard.pendingVerifications")}</p>
                  <p className="value">{pendingCount}</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bento-card bento-span-7 pop-in delay-2">
          <div className="announcement-head">
            <h2 className="card-title">{t("plans.activeTitle")}</h2>
            <Link className="meta-line" to="/plans">
              {t("common.view")}
            </Link>
          </div>
          {plans.length === 0 ? (
            <p>{t("plans.empty")}</p>
          ) : (
            <div className="list-stack">
              {plans.map((p, i) => (
                <div className="list-row" key={p.id}>
                  <span className={`avatar-tile ${tone(i)} bob`} aria-hidden="true">
                    {p.progressPct}%
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>{p.title}</strong>
                    <div className="progress-track" style={{ marginTop: "0.4rem" }}>
                      <div
                        className="progress-fill"
                        style={{ width: `${p.progressPct}%` }}
                      />
                    </div>
                  </div>
                  <span className="badge badge-info">
                    {t(`plans.status.${p.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="promo-card bento-span-5 pop-in delay-3 sparkle">
          <h2>{t("dashboard.promoTitle")}</h2>
          <p>{t("dashboard.promoBody")}</p>
          <div className="btn-row">
            <Link className="btn btn-cta pulse-cta" to="/payments">
              {t("dashboard.quickPay")}
            </Link>
            <Link className="btn btn-ghost" to="/feedback" style={{ color: "#fff" }}>
              {t("feedback.shortLink")}
            </Link>
          </div>
          {summary && (
            <p style={{ fontSize: "var(--fs-body-sm)", opacity: 0.9 }}>
              {t("dashboard.collectionsMonth")}:{" "}
              {formatPeso(summary.collectionsThisMonth)} ·{" "}
              {t("dashboard.expensesMonth")}:{" "}
              {formatPeso(summary.expensesThisMonth)}
            </p>
          )}
        </section>

        <section className="bento-card bento-span-12 pop-in delay-2">
          <h2 className="card-title">
            {hasRole("treasurer")
              ? t("payments.pendingQueue")
              : t("payments.history")}
          </h2>
          {recentPays.length === 0 ? (
            <p>{t("payments.empty")}</p>
          ) : (
            <div className="list-stack">
              {(hasRole("treasurer")
                ? recentPays.filter((p) => p.status === "pending").slice(0, 5)
                : recentPays
              ).map((p, i) => (
                <div className="list-row" key={p.id}>
                  <span className={`avatar-tile ${tone(i)}`} aria-hidden="true">
                    {p.lotCode.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>
                      {p.lotCode} · {formatPeso(p.amount)}
                    </strong>
                    <div className="meta-line">
                      {p.createdAt.slice(0, 10)} · {t(`methods.${p.method}`)}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
              {hasRole("treasurer") &&
                recentPays.filter((p) => p.status === "pending").length === 0 && (
                  <p>{t("dashboard.none")}</p>
                )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

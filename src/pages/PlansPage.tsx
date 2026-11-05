import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { HoaPlan, HoaPlanStatus } from "../domain/types";
import { getServices } from "../services/createServices";

export function PlansPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [rows, setRows] = useState<HoaPlan[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = hasRole("officer") || hasRole("treasurer");

  async function load() {
    setRows(await getServices().repo.listHoaPlans());
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!session || !canManage) return;
    setError("");
    try {
      await getServices().repo.createHoaPlan({ title, description }, session);
      setTitle("");
      setDescription("");
      setMessage(t("plans.created"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function patch(
    id: string,
    next: Partial<Pick<HoaPlan, "status" | "progressPct">>,
  ) {
    if (!session || !canManage) return;
    try {
      await getServices().repo.updateHoaPlan(id, next, session);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function addUpdate(id: string) {
    if (!session || !canManage) return;
    try {
      await getServices().repo.addHoaPlanUpdate(
        id,
        updateDrafts[id] ?? "",
        session,
      );
      setUpdateDrafts((d) => ({ ...d, [id]: "" }));
      setMessage(t("plans.updatePosted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("plans.title")}</h1>
      <p className="page-lead">{t("plans.lead")}</p>
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

      {canManage && (
        <div className="card pop-in">
          <h2 className="card-title">{t("plans.create")}</h2>
          <form onSubmit={onCreate}>
            <div className="form-field">
              <label htmlFor="plan-title">{t("plans.fieldTitle")}</label>
              <input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="plan-desc">{t("plans.fieldDescription")}</label>
              <textarea
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-cta" type="submit">
              {t("plans.create")}
            </button>
          </form>
        </div>
      )}

      <div className="bento-grid" style={{ marginTop: "1.25rem" }}>
        {rows.length === 0 ? (
          <div className="card bento-span-12">{t("plans.empty")}</div>
        ) : (
          rows.map((plan, i) => (
            <article
              key={plan.id}
              className={`bento-card bento-span-6 plan-card pop-in delay-${i % 4}`}
            >
              <div className="announcement-head">
                <h2 className="card-title" style={{ marginBottom: 0 }}>
                  {plan.title}
                </h2>
                <span className={`badge badge-${planTone(plan.status)}`}>
                  {t(`plans.status.${plan.status}`)}
                </span>
              </div>
              <p>{plan.description}</p>
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${plan.progressPct}%` }}
                />
              </div>
              <p className="meta-line">
                {t("plans.progress")}: {plan.progressPct}%
              </p>

              {plan.updates.length > 0 && (
                <div className="plan-history">
                  <div className="announcement-head" style={{ marginBottom: "0.5rem" }}>
                    <strong>{t("plans.updateHistory")}</strong>
                    {plan.updates.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost history-toggle"
                        aria-expanded={Boolean(historyOpen[plan.id])}
                        onClick={() =>
                          setHistoryOpen((h) => ({
                            ...h,
                            [plan.id]: !h[plan.id],
                          }))
                        }
                      >
                        {historyOpen[plan.id]
                          ? t("plans.hideHistory")
                          : t("plans.showHistory", {
                              count: plan.updates.length,
                            })}
                      </button>
                    )}
                  </div>
                  <ol className="plan-update-list">
                    {(historyOpen[plan.id]
                      ? plan.updates
                      : plan.updates.slice(0, 1)
                    ).map((u, idx) => (
                      <li
                        key={u.id}
                        className={`reply-bubble plan-update-item ${idx === 0 ? "is-latest" : ""}`}
                      >
                        {idx === 0 && (
                          <span className="badge badge-info">
                            {t("plans.latestUpdate")}
                          </span>
                        )}
                        <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                          {u.body}
                        </p>
                        <span className="meta-line">
                          {u.authorName} ·{" "}
                          {new Date(u.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {canManage && (
                <>
                  <div className="btn-row" style={{ marginTop: "0.75rem" }}>
                    {(
                      ["planned", "in_progress", "done"] as HoaPlanStatus[]
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="btn btn-secondary"
                        disabled={plan.status === s}
                        onClick={() => void patch(plan.id, { status: s })}
                      >
                        {t(`plans.status.${s}`)}
                      </button>
                    ))}
                  </div>
                  <div className="form-field" style={{ marginTop: "0.75rem" }}>
                    <label htmlFor={`pct-${plan.id}`}>
                      {t("plans.progress")}
                    </label>
                    <input
                      id={`pct-${plan.id}`}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={plan.progressPct}
                      onChange={(e) =>
                        void patch(plan.id, {
                          progressPct: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`upd-${plan.id}`}>
                      {t("plans.addUpdate")}
                    </label>
                    <textarea
                      id={`upd-${plan.id}`}
                      value={updateDrafts[plan.id] ?? ""}
                      onChange={(e) =>
                        setUpdateDrafts((d) => ({
                          ...d,
                          [plan.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void addUpdate(plan.id)}
                    >
                      {t("plans.postUpdate")}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function planTone(status: HoaPlanStatus) {
  if (status === "done") return "success";
  if (status === "in_progress") return "info";
  return "warning";
}

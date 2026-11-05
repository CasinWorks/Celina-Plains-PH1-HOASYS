import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { Announcement } from "../domain/types";
import { getServices } from "../services/createServices";

export function AnnouncementsPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canPost = hasRole("officer") || hasRole("treasurer");

  async function load() {
    setRows(await getServices().repo.listAnnouncements());
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || !canPost) return;
    setError("");
    try {
      await getServices().repo.createAnnouncement(
        { title, body, pinned },
        session,
      );
      setTitle("");
      setBody("");
      setPinned(false);
      setMessage(t("announcements.posted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function remove(id: string) {
    if (!session || !canPost) return;
    if (!window.confirm(t("announcements.deleteConfirm"))) return;
    try {
      await getServices().repo.deleteAnnouncement(id, session);
      setMessage(t("announcements.deleted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("announcements.title")}</h1>
      <p className="page-lead">{t("announcements.lead")}</p>
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

      {canPost && (
        <div className="card pop-in">
          <h2 className="card-title">{t("announcements.create")}</h2>
          <form onSubmit={onSubmit}>
            <div className="form-field">
              <label htmlFor="ann-title">{t("announcements.fieldTitle")}</label>
              <input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="ann-body">{t("announcements.fieldBody")}</label>
              <textarea
                id="ann-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              {t("announcements.pin")}
            </label>
            <div className="btn-row" style={{ marginTop: "1rem" }}>
              <button className="btn btn-cta" type="submit">
                {t("announcements.create")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="list-stack" style={{ marginTop: "1.25rem" }}>
        {rows.length === 0 ? (
          <div className="card">{t("announcements.empty")}</div>
        ) : (
          rows.map((a, i) => (
            <article
              key={a.id}
              className={`card announcement-card pop-in delay-${i % 4}`}
            >
              <div className="announcement-head">
                <h2 className="card-title" style={{ marginBottom: 0 }}>
                  {a.title}
                </h2>
                {a.pinned && (
                  <span className="badge badge-info bounce-soft">
                    {t("announcements.pinned")}
                  </span>
                )}
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
              <p className="meta-line">
                {a.authorName} · {new Date(a.publishedAt).toLocaleString()}
              </p>
              {canPost && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void remove(a.id)}
                >
                  {t("announcements.delete")}
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

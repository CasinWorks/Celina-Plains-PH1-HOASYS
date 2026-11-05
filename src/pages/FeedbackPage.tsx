import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { FeedbackItem, FeedbackStatus, FeedbackType, Lot } from "../domain/types";
import { getServices } from "../services/createServices";

export function FeedbackPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [rows, setRows] = useState<FeedbackItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [type, setType] = useState<FeedbackType>("complaint");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [lotId, setLotId] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canModerate = hasRole("officer") || hasRole("treasurer");

  async function load() {
    if (!session) return;
    const repo = getServices().repo;
    const all = await repo.listFeedback();
    if (canModerate) {
      setRows(all);
      setLots(await repo.listLots());
    } else {
      setRows(all.filter((r) => r.authorUserId === session.userId));
      setLots(
        (await repo.listLots()).filter((l) => session.lotIds.includes(l.id)),
      );
    }
  }

  useEffect(() => {
    void load();
  }, [session]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    try {
      await getServices().repo.createFeedback(
        {
          type,
          subject,
          body,
          lotId: lotId || null,
        },
        session,
      );
      setSubject("");
      setBody("");
      setMessage(t("feedback.submitted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function setStatus(id: string, status: FeedbackStatus) {
    if (!session) return;
    try {
      await getServices().repo.updateFeedbackStatus(id, status, session);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function reply(id: string) {
    if (!session) return;
    try {
      await getServices().repo.replyToFeedback(
        id,
        replyDrafts[id] ?? "",
        session,
      );
      setReplyDrafts((d) => ({ ...d, [id]: "" }));
      setMessage(t("feedback.replied"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("feedback.title")}</h1>
      <p className="page-lead">{t("feedback.lead")}</p>
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

      <div className="card pop-in">
        <h2 className="card-title">{t("feedback.create")}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="fb-type">{t("feedback.type")}</label>
            <select
              id="fb-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
            >
              <option value="complaint">{t("feedback.complaint")}</option>
              <option value="suggestion">{t("feedback.suggestion")}</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="fb-lot">{t("common.lot")}</label>
            <select
              id="fb-lot"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
            >
              <option value="">{t("feedback.noLot")}</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lotCode} — {l.householdName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="fb-subject">{t("feedback.subject")}</label>
            <input
              id="fb-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="fb-body">{t("feedback.details")}</label>
            <textarea
              id="fb-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-cta" type="submit">
            {t("feedback.create")}
          </button>
        </form>
      </div>

      <div className="list-stack" style={{ marginTop: "1.25rem" }}>
        {rows.length === 0 ? (
          <div className="card">{t("feedback.empty")}</div>
        ) : (
          rows.map((item, i) => (
            <article
              key={item.id}
              className={`card feedback-card pop-in delay-${i % 4}`}
            >
              <div className="announcement-head">
                <div>
                  <span
                    className={`badge ${item.type === "complaint" ? "badge-warning" : "badge-info"}`}
                  >
                    {t(`feedback.${item.type}`)}
                  </span>{" "}
                  <span className={`badge badge-${statusTone(item.status)}`}>
                    {t(`feedback.status.${item.status}`)}
                  </span>
                </div>
                {item.lotCode && (
                  <span className="meta-line">{item.lotCode}</span>
                )}
              </div>
              <h2 className="card-title">{item.subject}</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.body}</p>
              <p className="meta-line">
                {item.authorName} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>

              {item.replies.length > 0 && (
                <div className="reply-stack">
                  {item.replies.map((r) => (
                    <div key={r.id} className="reply-bubble">
                      <strong>{r.authorName}</strong>
                      <p style={{ margin: "0.25rem 0 0" }}>{r.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {canModerate && (
                <div className="btn-row" style={{ marginTop: "0.75rem" }}>
                  {(
                    [
                      "open",
                      "in_progress",
                      "resolved",
                      "closed",
                    ] as FeedbackStatus[]
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn btn-secondary"
                      disabled={item.status === s}
                      onClick={() => void setStatus(item.id, s)}
                    >
                      {t(`feedback.status.${s}`)}
                    </button>
                  ))}
                </div>
              )}

              {canModerate && (
                <div className="form-field" style={{ marginTop: "1rem" }}>
                  <label htmlFor={`reply-${item.id}`}>
                    {t("feedback.reply")}
                  </label>
                  <textarea
                    id={`reply-${item.id}`}
                    value={replyDrafts[item.id] ?? ""}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({
                        ...d,
                        [item.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void reply(item.id)}
                  >
                    {t("feedback.sendReply")}
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function statusTone(status: FeedbackStatus) {
  if (status === "resolved") return "success";
  if (status === "in_progress") return "info";
  if (status === "closed") return "muted";
  return "warning";
}

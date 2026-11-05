import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { DocumentCategory, HoaDocument } from "../domain/types";
import { getServices } from "../services/createServices";

const CATEGORIES: DocumentCategory[] = ["house_rules", "deed", "minutes"];

export function DocumentsPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [rows, setRows] = useState<HoaDocument[]>([]);
  const [category, setCategory] = useState<DocumentCategory>("house_rules");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canPost = hasRole("officer") || hasRole("treasurer");

  async function load() {
    setRows(await getServices().repo.listDocuments());
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || !canPost) return;
    setError("");
    try {
      await getServices().repo.createDocument(
        { category, title, notes, file },
        session,
      );
      setTitle("");
      setNotes("");
      setFile(null);
      setMessage(t("documents.posted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function remove(id: string) {
    if (!session || !canPost) return;
    if (!window.confirm(t("documents.deleteConfirm"))) return;
    try {
      await getServices().repo.deleteDocument(id, session);
      setMessage(t("documents.deleted"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function openFile(key: string) {
    const url = await getServices().files.getObjectUrl(key);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="page-animate">
      <h1 className="page-title">{t("documents.title")}</h1>
      <p className="page-lead">{t("documents.lead")}</p>
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
        <div className="card">
          <h2 className="card-title">{t("documents.add")}</h2>
          <form onSubmit={onSubmit}>
            <div className="form-field">
              <label htmlFor="doc-category">{t("common.category")}</label>
              <select
                id="doc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {t(`documents.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="doc-title">{t("documents.fieldTitle")}</label>
              <input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="doc-notes">{t("documents.fieldNotes")}</label>
              <textarea
                id="doc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="doc-file">{t("documents.fieldFile")}</label>
              <input
                id="doc-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button className="btn btn-cta" type="submit">
              {t("documents.add")}
            </button>
          </form>
        </div>
      )}

      {CATEGORIES.map((item) => {
        const shelf = rows.filter((row) => row.category === item);
        return (
          <section key={item} className="doc-shelf">
            <h2 className="card-title">{t(`documents.${item}`)}</h2>
            {shelf.length === 0 ? (
              <p className="meta-line">{t("documents.empty")}</p>
            ) : (
              <div className="list-stack">
                {shelf.map((row) => (
                  <article key={row.id} className="card">
                    <h3 className="card-title" style={{ marginBottom: 0 }}>
                      {row.title}
                    </h3>
                    {row.notes && <p style={{ whiteSpace: "pre-wrap" }}>{row.notes}</p>}
                    <p className="meta-line">
                      {row.authorName} · {new Date(row.publishedAt).toLocaleDateString()}
                    </p>
                    {row.storageKey && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void openFile(row.storageKey as string)}
                      >
                        {t("documents.open")}
                      </button>
                    )}
                    {canPost && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void remove(row.id)}
                      >
                        {t("documents.delete")}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

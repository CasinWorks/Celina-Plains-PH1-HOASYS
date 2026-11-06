import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { Announcement, AnnouncementPhoto } from "../domain/types";
import { createId, todayYmd } from "../lib/ids";
import { nextCommunityNotice } from "../lib/notices";
import { compressImageFile } from "../lib/photos";
import { getServices } from "../services/createServices";

const WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const MAX_PHOTOS = 4;

function monthCells(year: number, month: number): (string | null)[] {
  const start = new Date(year, month - 1, 1).getDay();
  const count = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: start }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function AnnouncementsPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [photos, setPhotos] = useState<AnnouncementPhoto[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const today = todayYmd();
  const [cursor, setCursor] = useState(() => {
    const [year, month] = todayYmd().split("-").map(Number);
    return { year: year!, month: month! };
  });
  const [selected, setSelected] = useState(today);
  const canPost = hasRole("officer") || hasRole("treasurer") || hasRole("admin");

  async function load() {
    setRows(await getServices().repo.listAnnouncements());
  }

  useEffect(() => {
    void load();
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, Announcement[]>();
    for (const row of rows) {
      if (!row.eventDate) continue;
      const list = map.get(row.eventDate) ?? [];
      list.push(row);
      map.set(row.eventDate, list);
    }
    return map;
  }, [rows]);

  const upcoming = nextCommunityNotice(rows);
  const dayEvents = byDate.get(selected) ?? [];
  const cells = monthCells(cursor.year, cursor.month);

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  }

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    try {
      const next: AnnouncementPhoto[] = [];
      for (const file of picked) {
        const image = await compressImageFile(file);
        next.push({ id: createId("photo"), ...image });
      }
      setPhotos((current) => [...current, ...next].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("announcements.photoTooBig"));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || !canPost) return;
    setError("");
    try {
      await getServices().repo.createAnnouncement(
        {
          title,
          body,
          pinned,
          eventDate: eventDate || null,
          photos,
        },
        session,
      );
      setTitle("");
      setBody("");
      setPinned(false);
      setEventDate("");
      setPhotos([]);
      setMessage(t("announcements.posted"));
      if (eventDate) {
        setSelected(eventDate);
        const [year, month] = eventDate.split("-").map(Number);
        if (year && month) setCursor({ year, month });
      }
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

  const dayLabel =
    selected < today
      ? t("announcements.happened")
      : selected === today
        ? t("announcements.todayEvent")
        : t("announcements.upcoming");

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

      {upcoming && (
        <button
          type="button"
          className="card event-upcoming"
          onClick={() => {
            const date = upcoming.eventDate!;
            setSelected(date);
            const [year, month] = date.split("-").map(Number);
            if (year && month) setCursor({ year, month });
          }}
        >
          <p className="meta-line">{t("announcements.upcoming")}</p>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            {upcoming.title}
          </h2>
          <p className="meta-line">{upcoming.eventDate}</p>
        </button>
      )}

      <section className="card event-calendar" aria-label={t("announcements.calendar")}>
        <div className="event-cal-head">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => shiftMonth(-1)}
            aria-label={t("announcements.prevMonth")}
          >
            ‹
          </button>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            {t(`months.${cursor.month}`)} {cursor.year}
          </h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => shiftMonth(1)}
            aria-label={t("announcements.nextMonth")}
          >
            ›
          </button>
        </div>
        <div className="event-cal-week">
          {WEEK.map((day) => (
            <span key={day}>{t(`announcements.days.${day}`)}</span>
          ))}
        </div>
        <div className="event-cal-grid">
          {cells.map((date, index) =>
            date ? (
              <button
                key={date}
                type="button"
                className={[
                  "event-cal-day",
                  date === selected ? "is-selected" : "",
                  date === today ? "is-today" : "",
                  byDate.has(date) ? "has-event" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelected(date)}
              >
                {Number(date.slice(-2))}
              </button>
            ) : (
              <span key={`blank-${index}`} className="event-cal-blank" />
            ),
          )}
        </div>
      </section>

      <section className="card" aria-live="polite">
        <p className="meta-line">{dayLabel}</p>
        <h2 className="card-title">
          {selected}
        </h2>
        {dayEvents.length === 0 ? (
          <p>{t("announcements.noEvent")}</p>
        ) : (
          dayEvents.map((event) => (
            <article key={event.id} className="event-day">
              <h3>{event.title}</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{event.body}</p>
              <PhotoGrid photos={event.photos ?? []} empty={t("announcements.noPhotos")} />
              {canPost && (
                <div className="btn-row">
                  <Link className="btn btn-ghost" to={`/attendance/${event.id}`}>
                    {t("announcements.takeAttendance")}
                  </Link>
                </div>
              )}
              {canPost && selected <= today && (
                <AddDayPhotos
                  event={event}
                  onSaved={async () => {
                    setMessage(t("announcements.photosAdded"));
                    await load();
                  }}
                  onError={setError}
                />
              )}
            </article>
          ))
        )}
        {canPost && selected <= today && dayEvents.length === 0 && (
          <PostWhatHappened
            date={selected}
            onPosted={async () => {
              setMessage(t("announcements.posted"));
              await load();
            }}
            onError={setError}
          />
        )}
      </section>

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
            <div className="form-field">
              <label htmlFor="ann-date">{t("announcements.eventDate")}</label>
              <input
                id="ann-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <span className="hint">{t("announcements.eventDateHint")}</span>
            </div>
            <div className="form-field">
              <label htmlFor="ann-photos">{t("announcements.addPhotos")}</label>
              <input
                id="ann-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  void onPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
              <span className="hint">{t("announcements.photoHint")}</span>
            </div>
            {photos.length > 0 && (
              <div className="event-photos">
                {photos.map((photo) => (
                  <figure key={photo.id}>
                    <img src={photo.dataUrl} alt="" />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setPhotos((current) => current.filter((item) => item.id !== photo.id))
                      }
                    >
                      {t("announcements.removePhoto")}
                    </button>
                  </figure>
                ))}
              </div>
            )}
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
        <h2 className="card-title">{t("announcements.feed")}</h2>
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
              <PhotoGrid photos={a.photos ?? []} />
              <p className="meta-line">
                {a.authorName} · {new Date(a.publishedAt).toLocaleString()}
                {a.eventDate ? ` · ${a.eventDate}` : ""}
              </p>
              {a.eventDate && (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setSelected(a.eventDate!);
                      const [year, month] = a.eventDate!.split("-").map(Number);
                      if (year && month) setCursor({ year, month });
                    }}
                  >
                    {t("announcements.openDay")}
                  </button>
                  {canPost && (
                    <Link className="btn btn-ghost" to={`/attendance/${a.id}`}>
                      {t("announcements.takeAttendance")}
                    </Link>
                  )}
                </div>
              )}
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

function PostWhatHappened({
  date,
  onPosted,
  onError,
}: {
  date: string;
  onPosted: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<AnnouncementPhoto[]>([]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (photos.length === 0) {
      onError(t("announcements.needPhoto"));
      return;
    }
    onError("");
    try {
      await getServices().repo.createAnnouncement(
        { title, body, eventDate: date, photos },
        session,
      );
      setTitle("");
      setBody("");
      setPhotos([]);
      await onPosted();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h3>{t("announcements.postHappened")}</h3>
      <p className="hint">{t("announcements.happenedHint")}</p>
      <div className="form-field">
        <label htmlFor="happened-title">{t("announcements.fieldTitle")}</label>
        <input
          id="happened-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="happened-body">{t("announcements.happenedBody")}</label>
        <textarea
          id="happened-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </div>
      <PhotoPicker photos={photos} onChange={setPhotos} onError={onError} inputId="happened-photos" />
      <button className="btn btn-cta" type="submit">
        {t("announcements.postHappened")}
      </button>
    </form>
  );
}

function AddDayPhotos({
  event,
  onSaved,
  onError,
}: {
  event: Announcement;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [photos, setPhotos] = useState<AnnouncementPhoto[]>([]);
  const [note, setNote] = useState("");
  const room = MAX_PHOTOS - (event.photos?.length ?? 0);
  if (room <= 0) return <p className="meta-line">{t("announcements.photoFull")}</p>;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (photos.length === 0) {
      onError(t("announcements.needPhoto"));
      return;
    }
    onError("");
    try {
      await getServices().repo.addEventPhotos(
        event.id,
        { photos, note },
        session,
      );
      setPhotos([]);
      setNote("");
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h3>{t("announcements.addDayPhotos")}</h3>
      <div className="form-field">
        <label htmlFor={`note-${event.id}`}>{t("announcements.happenedBody")}</label>
        <textarea
          id={`note-${event.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <PhotoPicker
        photos={photos}
        onChange={setPhotos}
        onError={onError}
        inputId={`photos-${event.id}`}
        room={room}
      />
      <button className="btn btn-cta" type="submit">
        {t("announcements.addDayPhotos")}
      </button>
    </form>
  );
}

function PhotoPicker({
  photos,
  onChange,
  onError,
  inputId,
  room = MAX_PHOTOS,
}: {
  photos: AnnouncementPhoto[];
  onChange: (photos: AnnouncementPhoto[]) => void;
  onError: (message: string) => void;
  inputId: string;
  room?: number;
}) {
  const { t } = useTranslation();

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    onError("");
    const picked = Array.from(files).slice(0, Math.max(0, room - photos.length));
    try {
      const next: AnnouncementPhoto[] = [];
      for (const file of picked) {
        const image = await compressImageFile(file);
        next.push({ id: createId("photo"), ...image });
      }
      onChange([...photos, ...next].slice(0, room));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("announcements.photoTooBig"));
    }
  }

  return (
    <>
      <div className="form-field">
        <label htmlFor={inputId}>{t("announcements.addPhotos")}</label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            void onPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="hint">{t("announcements.photoHint")}</span>
      </div>
      {photos.length > 0 && (
        <div className="event-photos">
          {photos.map((photo) => (
            <figure key={photo.id}>
              <img src={photo.dataUrl} alt="" />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onChange(photos.filter((item) => item.id !== photo.id))}
              >
                {t("announcements.removePhoto")}
              </button>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

function PhotoGrid({
  photos,
  empty,
}: {
  photos: AnnouncementPhoto[];
  empty?: string;
}) {
  if (photos.length === 0) return empty ? <p className="meta-line">{empty}</p> : null;
  return (
    <div className="event-photos">
      {photos.map((photo) => (
        <figure key={photo.id}>
          <img src={photo.dataUrl} alt="" />
        </figure>
      ))}
    </div>
  );
}

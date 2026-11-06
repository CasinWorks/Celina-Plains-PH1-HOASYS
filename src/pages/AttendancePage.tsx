import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RequireRole } from "../auth/RequireAuth";
import { useAuth } from "../auth/AuthContext";
import type { Announcement, EventAttendance, Lot } from "../domain/types";
import { getServices } from "../services/createServices";

export function AttendancePage() {
  return (
    <RequireRole roles={["officer", "treasurer", "admin"]}>
      <AttendanceBody />
    </RequireRole>
  );
}

function AttendanceBody() {
  const { eventId } = useParams();
  const { t } = useTranslation();
  const { session } = useAuth();
  const [events, setEvents] = useState<Announcement[]>([]);
  const [marks, setMarks] = useState<EventAttendance[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const repo = getServices().repo;
    const notices = await repo.listAnnouncements();
    const dated = notices
      .filter((row) => Boolean(row.eventDate))
      .sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));
    setEvents(dated);
    if (!eventId) {
      const all = await Promise.all(dated.map((row) => repo.listEventAttendance(row.id)));
      setMarks(all.flat());
      return;
    }
    const [sheet, lotRows] = await Promise.all([
      repo.listEventAttendance(eventId),
      repo.listLots(),
    ]);
    setMarks(sheet);
    setLots(lotRows.filter((lot) => lot.isActive));
  }

  useEffect(() => {
    void load();
  }, [eventId]);

  const event = events.find((row) => row.id === eventId);
  const presentIds = useMemo(() => new Set(marks.map((row) => row.lotId)), [marks]);
  const needle = query.trim().toLowerCase();
  const visibleLots = lots.filter((lot) => {
    if (!needle) return true;
    return (
      lot.lotCode.toLowerCase().includes(needle) ||
      lot.householdName.toLowerCase().includes(needle)
    );
  });

  async function toggle(lotId: string, present: boolean) {
    if (!session || !eventId) return;
    setError("");
    try {
      await getServices().repo.setEventPresent(eventId, lotId, present, session);
      setMarks(await getServices().repo.listEventAttendance(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (!eventId) {
    return (
      <div className="page-animate">
        <h1 className="page-title">{t("attendance.title")}</h1>
        <p className="page-lead">{t("attendance.lead")}</p>
        {events.length === 0 ? (
          <div className="card">{t("attendance.empty")}</div>
        ) : (
          <div className="list-stack">
            {events.map((row) => {
              const count = marks.filter((mark) => mark.eventId === row.id).length;
              return (
                <Link key={row.id} className="card list-row" to={`/attendance/${row.id}`}>
                  <span className="avatar-tile" aria-hidden="true">
                    {row.eventDate?.slice(8)}
                  </span>
                  <span>
                    <strong>{row.title}</strong>
                    <span className="meta-line">
                      {row.eventDate} · {t("attendance.presentCount", { count })}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-animate">
      <Link className="btn btn-ghost" to="/attendance">
        {t("attendance.back")}
      </Link>
      <h1 className="page-title">{event?.title ?? t("attendance.title")}</h1>
      <p className="page-lead">
        {event ? `${event.eventDate} · ${t("attendance.presentCount", { count: marks.length })}` : t("attendance.notFound")}
      </p>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {event && (
        <div className="card">
          <div className="form-field">
            <label htmlFor="attendance-search">{t("attendance.search")}</label>
            <input
              id="attendance-search"
              value={query}
              placeholder={t("attendance.searchPh")}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {lots.length === 0 ? (
            <p>{t("attendance.noLots")}</p>
          ) : visibleLots.length === 0 ? (
            <p>{t("attendance.noMatch")}</p>
          ) : (
            <div className="list-stack">
              {visibleLots.map((lot) => {
                const present = presentIds.has(lot.id);
                return (
                  <div className="list-row" key={lot.id}>
                    <span className="avatar-tile" aria-hidden="true">
                      {lot.lotCode.slice(0, 2)}
                    </span>
                    <div>
                      <strong>{lot.lotCode}</strong>
                      <div className="meta-line">{lot.householdName}</div>
                    </div>
                    <button
                      type="button"
                      className={`btn attendance-mark ${present ? "btn-cta" : "btn-ghost"}`}
                      aria-pressed={present}
                      aria-label={`${t("attendance.present")} ${lot.lotCode}`}
                      onClick={() => void toggle(lot.id, !present)}
                    >
                      {t("attendance.present")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

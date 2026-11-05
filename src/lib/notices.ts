import type { Announcement } from "../domain/types";
import { todayYmd } from "./ids";

/** Soonest posted gathering that is still ahead, or today. */
export function nextCommunityNotice(rows: Announcement[]): Announcement | null {
  const today = todayYmd();
  const dated = rows
    .filter((row) => Boolean(row.eventDate) && (row.eventDate as string) >= today)
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));
  return dated[0] ?? null;
}

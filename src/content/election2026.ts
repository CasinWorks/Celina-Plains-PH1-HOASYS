import type { ElectionContest } from "../domain/types";

/** Posted CPI-1 HOA notices for the 2026 election. Names as written. */

export const ELECTION_ID = "election_2026";

export const ELECTION_YEAR = 2026;

export const EXECUTIVE_CANDIDATES = [
  { roleKey: "president", name: "Noel F. Casin" },
  { roleKey: "vicePresident", name: "Isidro P. Abello" },
  { roleKey: "treasurer", name: "Mylene R. Valenzuela" },
  { roleKey: "auditor", name: "Joel M. Conda" },
] as const;

export const BLOCK_LEADERS = [
  { blocks: "1 & 2", name: "Noemi G. Gacal" },
  { blocks: "3", name: null },
  { blocks: "4", name: "Warren S. De Dios" },
  { blocks: "5", name: "Yolicel R. Lim" },
  { blocks: "6", name: "Aeron D. Blas" },
  { blocks: "7", name: "Eduardo A. Bartolay" },
  { blocks: "8", name: "Anthony T. Menor" },
  { blocks: "9 & 10", name: "Giovanni John T. Gonzales" },
  { blocks: "11", name: null },
  { blocks: "12", name: null },
  { blocks: "13", name: "Gilbert T. Lazo" },
  { blocks: "14", name: null },
  { blocks: "15", name: "Anabelle S. Dela Cruz" },
] as const;

export const VOTE_BLOCKS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
] as const;

export function blockTokens(label: string): string[] {
  return label
    .split("&")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Contests for the posted 2026 slate. Vacant blocks are omitted. */
export function buildElectionContests(electionId: string): ElectionContest[] {
  const executive: ElectionContest[] = EXECUTIVE_CANDIDATES.map((row, index) => ({
    id: `contest_${electionId}_${row.roleKey}`,
    electionId,
    scope: "association",
    roleKey: row.roleKey,
    blocks: [],
    candidateName: row.name,
    sortOrder: index,
  }));
  const leaders: ElectionContest[] = BLOCK_LEADERS.filter(
    (row): row is (typeof BLOCK_LEADERS)[number] & { name: string } =>
      Boolean(row.name),
  ).map((row, index) => ({
    id: `contest_${electionId}_block_${row.blocks.replace(/[^0-9]+/g, "_")}`,
    electionId,
    scope: "block",
    roleKey: "blockLeader",
    blocks: blockTokens(row.blocks),
    candidateName: row.name,
    sortOrder: 100 + index,
  }));
  return [...executive, ...leaders];
}

export function contestsForBlock(
  contests: ElectionContest[],
  block: string,
): ElectionContest[] {
  return contests.filter(
    (contest) =>
      contest.scope === "association" || contest.blocks.includes(block),
  );
}

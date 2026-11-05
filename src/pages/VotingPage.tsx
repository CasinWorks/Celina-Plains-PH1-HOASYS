import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { contestsForBlock, VOTE_BLOCKS } from "../content/election2026";
import type { ElectionView, VoteChoice } from "../domain/types";
import { getServices } from "../services/createServices";

export function VotingPage() {
  const { t } = useTranslation();
  const { session, hasRole } = useAuth();
  const canManage = hasRole("officer") || hasRole("treasurer");
  const [view, setView] = useState<ElectionView | null>(null);
  const [lotId, setLotId] = useState("");
  const [choices, setChoices] = useState<Record<string, VoteChoice>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!session) return;
    const next = await getServices().repo.ensureElection(session);
    setView(next);
    setLotId((current) => current || next.myAssignments[0]?.lotId || "");
  }

  useEffect(() => {
    void load();
  }, [session]);

  const assignment = view?.myAssignments.find((row) => row.lotId === lotId) ?? null;
  const ballot = view?.myBallots.find((row) => row.lotId === lotId) ?? null;
  const myContests = useMemo(() => {
    if (!view || !assignment) return [];
    return contestsForBlock(view.contests, assignment.block);
  }, [view, assignment]);

  useEffect(() => {
    if (!assignment || ballot) return;
    setChoices((current) => {
      const next = { ...current };
      for (const contest of myContests) {
        if (!next[contest.id]) next[contest.id] = "for";
      }
      return next;
    });
  }, [assignment, ballot, myContests]);

  function contestLabel(roleKey: string, blocks: string[]) {
    if (roleKey === "blockLeader") {
      return t("voting.blockLeader", { blocks: blocks.join(" & ") });
    }
    return t(`officers.roles.${roleKey}`);
  }

  async function saveAssignment(
    targetLotId: string,
    eligible: boolean,
    block: string,
  ) {
    if (!session) return;
    setError("");
    try {
      setView(
        await getServices().repo.setVoterAssignment(
          { lotId: targetLotId, eligible, block },
          session,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function setStatus(status: "open" | "closed" | "setup") {
    if (!session) return;
    setError("");
    setMessage("");
    try {
      setView(await getServices().repo.setElectionStatus(status, session));
      setMessage(t("voting.statusSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function submitBallot() {
    if (!session || !assignment) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setView(
        await getServices().repo.castBallot(
          {
            lotId: assignment.lotId,
            choices: myContests.map((contest) => ({
              contestId: contest.id,
              choice: choices[contest.id] ?? "for",
            })),
          },
          session,
        ),
      );
      setMessage(t("voting.submitted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (!view) {
    return (
      <div>
        <h1 className="page-title">{t("voting.title")}</h1>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  const statusKey = `voting.status.${view.election.status}` as const;

  return (
    <div>
      <p className="login-eyebrow">{t("voting.kicker", { year: view.election.year })}</p>
      <h1 className="page-title">{t("voting.title")}</h1>
      <p className="page-lead">{t("voting.lead")}</p>
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

      <div className="metric-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="metric-tile lilac">
          <p className="label">{t("voting.electionStatus")}</p>
          <p className="value">{t(statusKey)}</p>
        </div>
        <div className="metric-tile mint">
          <p className="label">{t("voting.turnout")}</p>
          <p className="value">
            {view.votedCount}
            <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>
              {" "}
              / {view.eligibleCount}
            </span>
          </p>
        </div>
      </div>

      {canManage && (
        <div className="card">
          <h2 className="card-title">{t("voting.assignTitle")}</h2>
          <p className="page-lead" style={{ marginBottom: "1rem" }}>
            {t("voting.assignLead")}
          </p>
          <div className="btn-row" style={{ marginBottom: "1rem" }}>
            {view.election.status !== "open" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void setStatus("open")}
              >
                {t("voting.open")}
              </button>
            )}
            {view.election.status === "open" && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void setStatus("closed")}
              >
                {t("voting.close")}
              </button>
            )}
            <Link className="btn btn-secondary" to="/officers">
              {t("voting.seeCandidates")}
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table responsive">
              <thead>
                <tr>
                  <th>{t("common.lot")}</th>
                  <th>{t("voting.household")}</th>
                  <th>{t("voting.block")}</th>
                  <th>{t("voting.eligible")}</th>
                  <th>{t("voting.voted")}</th>
                </tr>
              </thead>
              <tbody>
                {(view.roll ?? []).map((row) => (
                  <tr key={row.id}>
                    <td data-label={t("common.lot")}>{row.lotCode}</td>
                    <td data-label={t("voting.household")}>{row.householdName}</td>
                    <td data-label={t("voting.block")}>
                      <select
                        aria-label={t("voting.block")}
                        value={row.block}
                        disabled={row.hasVoted}
                        onChange={(event) =>
                          void saveAssignment(row.lotId, row.eligible, event.target.value)
                        }
                      >
                        {VOTE_BLOCKS.map((block) => (
                          <option key={block} value={block}>
                            {block}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label={t("voting.eligible")}>
                      <label className="vote-check">
                        <input
                          type="checkbox"
                          checked={row.eligible}
                          disabled={row.hasVoted}
                          onChange={(event) =>
                            void saveAssignment(row.lotId, event.target.checked, row.block)
                          }
                        />
                        {row.eligible ? t("common.yes") : t("common.no")}
                      </label>
                    </td>
                    <td data-label={t("voting.voted")}>
                      {row.hasVoted ? t("voting.votedYes") : t("voting.votedNo")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t("voting.ballotTitle")}</h2>
        {view.myAssignments.length > 1 && (
          <div className="form-field">
            <label htmlFor="vote-lot">{t("common.lot")}</label>
            <select
              id="vote-lot"
              value={lotId}
              onChange={(event) => setLotId(event.target.value)}
            >
              {view.myAssignments.map((row) => (
                <option key={row.lotId} value={row.lotId}>
                  {row.lotCode} — {row.householdName}
                </option>
              ))}
            </select>
          </div>
        )}
        {!assignment && <p>{t("voting.noLot")}</p>}
        {assignment && !assignment.eligible && <p>{t("voting.notAssigned")}</p>}
        {assignment?.eligible && view.election.status !== "open" && !ballot && (
          <p>{t("voting.notOpen")}</p>
        )}
        {ballot && (
          <div className="alert alert-success" role="status">
            {t("voting.alreadyVoted", {
              when: ballot.submittedAt.slice(0, 16).replace("T", " "),
            })}
          </div>
        )}
        {assignment?.eligible && view.election.status === "open" && !ballot && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitBallot();
            }}
          >
            <p className="hint" style={{ marginTop: 0 }}>
              {t("voting.ballotLead", { block: assignment.block })}
            </p>
            <ul className="ballot-list">
              {myContests.map((contest) => (
                <li key={contest.id} className="ballot-item">
                  <div>
                    <p className="officer-role">
                      {contestLabel(contest.roleKey, contest.blocks)}
                    </p>
                    <p className="officer-name">{contest.candidateName}</p>
                  </div>
                  <div className="ballot-choices">
                    <label>
                      <input
                        type="radio"
                        name={contest.id}
                        checked={choices[contest.id] === "for"}
                        onChange={() =>
                          setChoices((current) => ({
                            ...current,
                            [contest.id]: "for",
                          }))
                        }
                      />
                      {t("voting.for")}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={contest.id}
                        checked={choices[contest.id] === "abstain"}
                        onChange={() =>
                          setChoices((current) => ({
                            ...current,
                            [contest.id]: "abstain",
                          }))
                        }
                      />
                      {t("voting.abstain")}
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <button className="btn btn-cta" type="submit" disabled={busy}>
              {busy ? t("common.loading") : t("voting.submit")}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">{t("voting.resultsTitle")}</h2>
        <p className="page-lead" style={{ marginBottom: "1rem" }}>
          {t("voting.resultsLead")}
        </p>
        <div className="table-wrap">
          <table className="data-table responsive">
            <thead>
              <tr>
                <th>{t("voting.contest")}</th>
                <th>{t("voting.candidate")}</th>
                <th>{t("voting.for")}</th>
                <th>{t("voting.abstain")}</th>
              </tr>
            </thead>
            <tbody>
              {view.contests.map((contest) => {
                const tally = view.tallies.find((row) => row.contestId === contest.id);
                return (
                  <tr key={contest.id}>
                    <td data-label={t("voting.contest")}>
                      {contestLabel(contest.roleKey, contest.blocks)}
                    </td>
                    <td data-label={t("voting.candidate")}>{contest.candidateName}</td>
                    <td className="num" data-label={t("voting.for")}>
                      {tally?.votesFor ?? 0}
                    </td>
                    <td className="num" data-label={t("voting.abstain")}>
                      {tally?.abstain ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

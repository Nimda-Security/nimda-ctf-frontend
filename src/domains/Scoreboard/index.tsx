import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { logoutAPI, type CurrentUser } from '@/api/auth';
import { formatDateTime, formatTime } from '@/api/client';
import {
  getMyTeamScore,
  getScoreboard,
  type MyTeamScore,
  type ScoreboardPage as ScoreboardData,
} from '@/api/scoreboard';
import Layout from '@/components/Layout';
import './Scoreboard.css';

const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; board: ScoreboardData; myTeam: MyTeamScore | null };

function ScoreboardPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  const fetchAll = useCallback(
    async (signal: AbortSignal) => {
      const [board, mine] = await Promise.all([
        getScoreboard(page, PAGE_SIZE, signal),
        getMyTeamScore(signal),
      ]);
      if (board.status === 'unauthenticated' || mine.status === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      if (board.status === 'error') {
        setLoad({ status: 'error', message: board.message });
        return;
      }
      setLoad({
        status: 'ok',
        board: board.data,
        myTeam: mine.status === 'ok' ? mine.data.team : null,
      });
    },
    [navigate, page]
  );

  useEffect(() => {
    const controller = new AbortController();
    const run = () => fetchAll(controller.signal).catch(() => {});
    run();

    // 실시간 순위: 화면이 보일 때만 30초마다 다시 불러온다.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') run();
    }, REFRESH_MS);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [fetchAll]);

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const retry = () => {
    setLoad({ status: 'loading' });
    const controller = new AbortController();
    fetchAll(controller.signal).catch(() => {});
  };

  const board = load.status === 'ok' ? load.board : null;
  const myTeam = load.status === 'ok' ? load.myTeam : null;
  const podium = page === 0 && board ? board.entries.slice(0, 3) : [];
  const unranked = board ? board.totalTeams - board.rankedTeams : 0;

  return (
    <Layout user={user} onLogout={handleLogout}>
      <section className="sb-hero">
        <div className="sb-hero__inner">
          <p className="sb-hero__prompt">nimda@security:~$ ./ctf --scoreboard</p>
          <p className="sb-hero__eyebrow">NIMDACON 2026 · TEAM RANKING</p>
          <h1 className="sb-hero__title">SCOREBOARD</h1>
          <p className="sb-hero__lead">팀 점수는 30초마다 갱신됩니다.</p>
        </div>
      </section>

      <div className="sb">
        {load.status === 'loading' && (
          <p className="sb__message">순위를 불러오는 중입니다.</p>
        )}

        {load.status === 'error' && (
          <div className="sb__message" role="alert">
            <p>{load.message}</p>
            <button type="button" className="sb__link" onClick={retry}>
              다시 시도
            </button>
          </div>
        )}

        {board && (
          <>
            {myTeam ? (
              <section className="sb-my" aria-label="내 팀">
                <div className="sb-my__name">
                  <span>내 팀</span>
                  <strong>{myTeam.teamName}</strong>
                </div>
                {[
                  ['순위', myTeam.rank ? `#${myTeam.rank} / ${myTeam.totalTeams}` : '-'],
                  ['점수', String(myTeam.totalScore)],
                  ['해결', String(myTeam.solveCount)],
                  ['멤버', `${myTeam.memberCount}명`],
                ].map(([label, value]) => (
                  <div key={label} className="sb-my__stat">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </section>
            ) : (
              <p className="sb-my sb-my--none">팀에 소속되어 있지 않습니다!</p>
            )}

            {board.rankedTeams === 0 ? (
              <p className="sb__message sb__empty">
                아직 득점한 팀이 없습니다. 첫 번째 정답을 기다리는 중입니다.
              </p>
            ) : (
              <>
                {podium.length > 0 && (
                  <div className="sb-podium">
                    {[podium[1], podium[0], podium[2]]
                      .filter((entry) => entry)
                      .map((entry) => (
                        <div
                          key={entry.teamId}
                          className={`sb-podium__card sb-podium__card--${entry.rank}`}
                        >
                          <span className="sb-podium__rank">#{entry.rank}</span>
                          <strong className="sb-podium__team">{entry.teamName}</strong>
                          <span className="sb-podium__meta">
                            {entry.totalScore.toLocaleString()} pts · {entry.solveCount}문제
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                <div className="sb-table" role="table" aria-label="팀 순위">
                  <div className="sb-row sb-row--head" role="row">
                    <span role="columnheader">#</span>
                    <span role="columnheader">팀</span>
                    <span role="columnheader">멤버</span>
                    <span role="columnheader">해결</span>
                    <span role="columnheader">점수</span>
                    <span role="columnheader">마지막 득점</span>
                  </div>
                  {board.entries.map((entry) => (
                    <div
                      key={entry.teamId}
                      role="row"
                      className={
                        entry.teamId === myTeam?.teamId ? 'sb-row sb-row--me' : 'sb-row'
                      }
                    >
                      <span role="cell">{entry.rank}</span>
                      <span role="cell" className="sb-row__team">
                        {entry.teamName}
                      </span>
                      <span role="cell">{entry.memberCount}</span>
                      <span role="cell">{entry.solveCount}</span>
                      <span role="cell" className="sb-row__score">
                        {entry.totalScore.toLocaleString()}
                      </span>
                      <span role="cell">{formatDateTime(entry.lastSolvedAt)}</span>
                    </div>
                  ))}
                </div>

                <p className="sb__note">
                  동점이면 마지막 득점이 더 이른 팀이 위입니다.
                  {unranked > 0 && ` 점수가 없는 팀(${unranked}팀)은 순위에 표시하지 않습니다.`}
                </p>

                {board.totalPages > 1 && (
                  <nav className="sb-pages" aria-label="페이지">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹
                    </button>
                    {Array.from({ length: board.totalPages }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-current={i === page ? 'page' : undefined}
                        onClick={() => setPage(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={page >= board.totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ›
                    </button>
                  </nav>
                )}
              </>
            )}

            {myTeam && (
              <div className="sb-detail">
                <section className="sb-panel">
                  <h2>MY TEAM · CONTRIBUTION</h2>
                  {myTeam.members.map((member) => (
                    <div key={member.userId} className="sb-contrib">
                      {member.role === 'LEADER' && (
                        <span className="sb-badge">팀장</span>
                      )}
                      <span className="sb-contrib__name">{member.nickname}</span>
                      <span className="sb-contrib__solves">{member.solveCount}문제</span>
                      <strong className="sb-contrib__points">{member.points} pts</strong>
                    </div>
                  ))}
                </section>
                <section className="sb-panel">
                  <h2>MY TEAM · RECENT SOLVES</h2>
                  {myTeam.recentSolves.length === 0 && (
                    <p className="sb-panel__empty">아직 해결한 문제가 없습니다.</p>
                  )}
                  {myTeam.recentSolves.map((solve) => (
                    <div
                      key={`${solve.challengeCode}-${solve.solvedAt}`}
                      className="sb-recent"
                    >
                      <span className="sb-recent__time">{formatTime(solve.solvedAt)}</span>
                      <span className="sb-recent__name">{solve.nickname}</span>
                      <span className="sb-recent__code" title={solve.challengeTitle}>
                        {solve.challengeCode}
                      </span>
                      <strong className="sb-recent__points">+{solve.points}</strong>
                    </div>
                  ))}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default ScoreboardPage;

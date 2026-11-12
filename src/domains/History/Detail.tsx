import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { logoutAPI, type CurrentUser } from '@/api/auth';
import { formatDateTime } from '@/api/client';
import { formatDateMinute, getContest, type ContestDetail } from '@/api/contests';
import Layout from '@/components/Layout';
import '@/domains/Scoreboard/Scoreboard.css';
import './History.css';

type Tab = 'ranking' | 'challenges' | 'team';

type LoadState =
  | { status: 'loading'; id: string }
  | { status: 'not-found'; id: string; message: string }
  | { status: 'error'; id: string; message: string }
  | { status: 'ok'; id: string; data: ContestDetail };

const TABS: [Tab, string][] = [
  ['ranking', '최종 순위'],
  ['challenges', '문제'],
  ['team', '내 팀'],
];

const STANDINGS_PREVIEW = 20;

function HistoryDetailPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const { contestId = '' } = useParams();
  const [load, setLoad] = useState<LoadState>({ status: 'loading', id: contestId });
  const [tab, setTab] = useState<Tab>('ranking');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getContest(contestId, controller.signal)
      .then((r) => {
        if (r.status === 'unauthenticated') navigate('/login', { replace: true });
        else if (r.status === 'error')
          setLoad({ status: r.code === 404 ? 'not-found' : 'error', id: contestId, message: r.message });
        else setLoad({ status: 'ok', id: contestId, data: r.data });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [contestId, navigate]);

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  // 다른 대회로 이동한 직후에는 이전 대회를 보여주지 않는다.
  const current: LoadState = load.id === contestId ? load : { status: 'loading', id: contestId };
  const data = current.status === 'ok' ? current.data : null;
  const myTeamId = data?.myTeam?.teamId;
  const ranked = data ? data.standings.filter((s) => s.rank !== null) : [];
  const podium = ranked.slice(0, 3);
  const standings = data ? (showAll ? data.standings : data.standings.slice(0, STANDINGS_PREVIEW)) : [];

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="hs">
        <p className="hs__crumb">
          <Link to="/history">CTF / HISTORY</Link>
          {data ? ` / ${data.name}` : ''}
        </p>

        {current.status === 'loading' && <p className="hs__message">불러오는 중입니다.</p>}
        {(current.status === 'not-found' || current.status === 'error') && (
          <div className="hs__message" role="alert">
            <p>{current.message}</p>
            <Link to="/history" className="hs__link">
              대회 이력으로
            </Link>
          </div>
        )}

        {data && (
          <>
            <header className="hd-head">
              <div>
                <div className="hd-head__title">
                  <h1>{data.name}</h1>
                  <span className="hs-pill hs-pill--gray">종료</span>
                </div>
                <p>
                  {formatDateMinute(data.startsAt)} ~ {formatDateMinute(data.endsAt)} KST · 팀전
                </p>
              </div>
              <span className="hd-lock">최종 결과 · {formatDateMinute(data.finalizedAt)} 기준으로 고정</span>
            </header>

            <div className="hd-stats">
              {[
                ['참가 팀', data.stats.teamCount],
                ['참가자', data.stats.participantCount],
                ['문제', data.stats.challengeCount],
                ['총 정답', data.stats.totalSolves],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="hd-tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? 'hd-tab hd-tab--on' : 'hd-tab'}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'ranking' &&
              (ranked.length === 0 ? (
                <p className="hs__message hs__empty">득점한 팀이 없는 대회입니다.</p>
              ) : (
                <section className="hd-panel" role="tabpanel">
                  <div className="sb-podium">
                    {[podium[1], podium[0], podium[2]]
                      .filter((s) => s)
                      .map((s) => (
                        <div key={s.teamId} className={`sb-podium__card sb-podium__card--${s.rank}`}>
                          <span className="sb-podium__rank">#{s.rank}</span>
                          <strong className="sb-podium__team">{s.teamName}</strong>
                          <span className="sb-podium__meta">
                            {s.totalScore.toLocaleString()} pts · {s.solveCount}문제
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="sb-table" role="table" aria-label="최종 순위">
                    <div className="sb-row sb-row--head" role="row">
                      <span role="columnheader">#</span>
                      <span role="columnheader">팀</span>
                      <span role="columnheader">멤버</span>
                      <span role="columnheader">해결</span>
                      <span role="columnheader">점수</span>
                      <span role="columnheader">마지막 득점</span>
                    </div>
                    {standings.map((s) => (
                      <div
                        key={s.teamId}
                        role="row"
                        className={s.teamId === myTeamId ? 'sb-row sb-row--me' : 'sb-row'}
                      >
                        <span role="cell">{s.rank ?? '-'}</span>
                        <span role="cell" className="sb-row__team">
                          {s.teamName}
                        </span>
                        <span role="cell">{s.memberCount}</span>
                        <span role="cell">{s.solveCount}</span>
                        <span role="cell" className="sb-row__score">
                          {s.totalScore.toLocaleString()}
                        </span>
                        <span role="cell">{formatDateTime(s.lastSolvedAt)}</span>
                      </div>
                    ))}
                  </div>
                  {data.standings.length > STANDINGS_PREVIEW && (
                    <button type="button" className="hs__link" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? '접기' : `${data.standings.length}팀 전체 보기`}
                    </button>
                  )}
                </section>
              ))}

            {tab === 'challenges' && (
              <section className="hd-panel" role="tabpanel">
                {data.challenges.length === 0 ? (
                  <p className="hs__message hs__empty">문제가 없는 대회입니다.</p>
                ) : (
                  <div className="sb-table" role="table" aria-label="문제별 결과">
                    <div className="hd-crow hd-crow--head" role="row">
                      <span role="columnheader">분류</span>
                      <span role="columnheader">문제</span>
                      <span role="columnheader">최종 점수</span>
                      <span role="columnheader">해결 팀</span>
                      <span role="columnheader">First Blood</span>
                    </div>
                    {data.challenges.map((c) => (
                      <div key={c.challengeId} className="hd-crow" role="row">
                        <span role="cell">
                          <span className="hd-tag">{c.category}</span>
                        </span>
                        <span role="cell" className="hd-crow__title">
                          <strong>{c.title}</strong>
                          <small>{c.code}</small>
                        </span>
                        <span role="cell">
                          {c.maxPoint} → {c.finalPoint}
                        </span>
                        <span role="cell">{c.solvedTeams}</span>
                        <span role="cell">{c.firstBloodTeamName ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="hs-muted">최종 점수는 "최대 → 대회 종료 시점 점수"입니다.</p>
              </section>
            )}

            {tab === 'team' && (
              <section className="hd-panel" role="tabpanel">
                {data.myTeam ? (
                  <div className="sb-detail">
                    <div className="hd-myteam">
                      <span>내 팀</span>
                      <strong className="hd-myteam__name">{data.myTeam.teamName}</strong>
                      <div className="hd-myteam__stats">
                        {[
                          [
                            '최종 순위',
                            data.myTeam.rank ? `#${data.myTeam.rank} / ${data.myTeam.totalTeams}` : '-',
                          ],
                          ['점수', data.myTeam.totalScore.toLocaleString()],
                          ['해결', String(data.myTeam.solveCount)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <section className="sb-panel">
                      <h2>CONTRIBUTION</h2>
                      {data.myTeam.members.map((m) => (
                        <div key={m.userId} className="sb-contrib">
                          {m.role === 'LEADER' && <span className="sb-badge">팀장</span>}
                          <span className="sb-contrib__name">{m.nickname}</span>
                          <span className="sb-contrib__solves">{m.solveCount}문제</span>
                          <strong className="sb-contrib__points">{m.points} pts</strong>
                        </div>
                      ))}
                    </section>
                  </div>
                ) : (
                  <p className="hs__message hs__empty">이 대회에 참가하지 않았습니다.</p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default HistoryDetailPage;

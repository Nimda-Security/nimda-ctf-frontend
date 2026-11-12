import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { canCreateChallenge, logoutAPI, type CurrentUser } from '@/api/auth';
import { formatTime } from '@/api/client';
import {
  CATEGORIES,
  getChallenges,
  type Category,
  type Challenge,
} from '@/api/ctf';
import {
  getMyTeamScore,
  getScoreboard,
  type MyTeamScore,
  type ScoreboardEntry,
} from '@/api/scoreboard';
import Layout from '@/components/Layout';
import NoTeam from '@/components/NoTeam';
import './Dashboard.css';

type Filter = 'ALL' | Category;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-team'; message: string }
  | { status: 'ok'; challenges: Challenge[] };

interface ScoreState {
  myTeam: MyTeamScore | null;
  top: ScoreboardEntry[];
  failed: boolean;
}

const LEADERBOARD_SIZE = 5;

const FILTERS: Filter[] = ['ALL', ...CATEGORIES];

const describeAccess = (challenge: Challenge) => {
  if (challenge.category === 'WEB' || challenge.category === 'PWN') {
    return '인스턴스 필요';
  }
  return challenge.hasAttachment ? '파일 받기' : '첨부파일 없음';
};

const ChallengeCard = ({ challenge }: { challenge: Challenge }) => (
  <Link
    to={`/challenges/${encodeURIComponent(challenge.code)}`}
    className="challenge-card"
  >
    <div>
      <div className="challenge-card__top">
        <span className="challenge-card__code">{challenge.code}</span>
        <span className="challenge-card__tag">{challenge.category}</span>
      </div>
      <h3 className="challenge-card__title">{challenge.title}</h3>
    </div>
    <div className="challenge-card__bottom">
      <span className="challenge-card__access">
        {!challenge.isPublic && '초안 · '}
        {describeAccess(challenge)}
      </span>
      <span className="challenge-card__points">{challenge.points} pts</span>
    </div>
  </Link>
);

const Leaderboard = ({ score }: { score: ScoreState | null }) => (
  <section className="side-panel">
    <h2 className="side-panel__title">TEAM LEADERBOARD</h2>
    {!score && <p className="side-panel__text">불러오는 중입니다.</p>}
    {score?.failed && (
      <p className="side-panel__text">순위를 불러오지 못했습니다.</p>
    )}
    {score && !score.failed && score.top.length === 0 && (
      <p className="side-panel__text">아직 득점한 팀이 없습니다.</p>
    )}
    {score && score.top.length > 0 && (
      <ol className="leaderboard">
        {score.top.map((entry) => (
          <li
            key={entry.teamId}
            className={
              entry.teamId === score.myTeam?.teamId
                ? 'leaderboard__row leaderboard__row--me'
                : 'leaderboard__row'
            }
          >
            <span className="leaderboard__rank">{entry.rank}</span>
            <span className="leaderboard__name">{entry.teamName}</span>
            <span className="leaderboard__score">{entry.totalScore}</span>
          </li>
        ))}
      </ol>
    )}
    <Link to="/scoreboard" className="side-panel__link">
      전체 순위 보기
    </Link>
  </section>
);

const RecentSolves = ({ score }: { score: ScoreState | null }) => {
  const solves = score?.myTeam?.recentSolves.slice(0, LEADERBOARD_SIZE) ?? [];
  return (
    <section className="side-panel">
      <h2 className="side-panel__title">MY TEAM · RECENT SOLVES</h2>
      {score && !score.myTeam && (
        <p className="side-panel__text">소속된 팀이 없습니다.</p>
      )}
      {score?.myTeam && solves.length === 0 && (
        <p className="side-panel__text">아직 해결한 문제가 없습니다.</p>
      )}
      {solves.length > 0 && (
        <ul className="recent">
          {solves.map((solve) => (
            <li key={`${solve.challengeCode}-${solve.solvedAt}`}>
              <strong>{solve.nickname}</strong>
              <span className="recent__meta">
                <span>{solve.challengeCode}</span>
                <span>
                  {formatTime(solve.solvedAt)} · +{solve.points}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

function DashboardPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [score, setScore] = useState<ScoreState | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getChallenges(controller.signal)
      .then((result) => {
        if (result.status === 'unauthenticated') {
          navigate('/login', { replace: true });
        } else {
          setLoad(result);
        }
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });

    // 점수판은 팀이 없어도 볼 수 있다. 실패해도 문제 목록은 그대로 보여준다.
    Promise.all([
      getMyTeamScore(controller.signal),
      getScoreboard(0, LEADERBOARD_SIZE, controller.signal),
    ])
      .then(([mine, board]) => {
        if (mine.status === 'unauthenticated' || board.status === 'unauthenticated') {
          navigate('/login', { replace: true });
          return;
        }
        setScore({
          myTeam: mine.status === 'ok' ? mine.data.team : null,
          top: board.status === 'ok' ? board.data.entries : [],
          failed: mine.status === 'error' || board.status === 'error',
        });
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });

    return () => controller.abort();
  }, [navigate, retryKey]);

  const challenges = useMemo(
    () => (load.status === 'ok' ? load.challenges : []),
    [load]
  );

  const groups = useMemo(
    () =>
      CATEGORIES.filter((c) => filter === 'ALL' || filter === c)
        .map((category) => ({
          category,
          items: challenges.filter((c) => c.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [challenges, filter]
  );

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const retry = () => {
    setLoad({ status: 'loading' });
    setRetryKey((key) => key + 1);
  };

  const myTeam = score?.myTeam ?? null;
  const noTeam = load.status === 'no-team';
  const stats = [
    ['팀 점수', myTeam ? `${myTeam.totalScore} pts` : '-'],
    [
      '팀 순위',
      myTeam?.rank ? `#${myTeam.rank} / ${myTeam.totalTeams}` : '-',
    ],
    ['팀 해결 문제', myTeam ? String(myTeam.solveCount) : '-'],
    ['대회 남은 시간', '준비 중'],
  ];

  return (
    <Layout user={user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <p className="hero__prompt">nimda@security:~$ ./ctf --dashboard</p>
            <p className="hero__eyebrow">NIMDACON 2026 · SECURITY TRACK</p>
            <h1 className="hero__title">CTF DASHBOARD</h1>
            <p className="hero__lead">
              문제를 풀고, 플래그를 제출하고, 순위를 올리세요.
            </p>
          </div>

          <div className="terminal">
            <div className="terminal__bar">
              <i style={{ background: 'var(--color-red)' }} />
              <i style={{ background: 'var(--color-yellow)' }} />
              <i style={{ background: 'var(--color-green)' }} />
              <span>status.sh</span>
            </div>
            <div className="terminal__body">
              <p className="terminal__green">$ ctf status</p>
              <p>[*] user     : {user.nickname}</p>
              <p>[*] team     : {myTeam?.teamName ?? (score ? 'not assigned' : '...')}</p>
              <p>[*] tracks   : WEB / PWN / REV / FOR / CRY / MISC</p>
              {noTeam ? (
                <p className="terminal__red">[!] access   : denied</p>
              ) : (
                <p>
                  [*] problems : {load.status === 'ok' ? challenges.length : '...'}
                </p>
              )}
              <p className="terminal__yellow">[!] flag fmt : NIMDA{'{...}'}</p>
              <p className="terminal__cyan">$ submit --flag _</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="stats__inner">
          {stats.map(([label, value]) => (
            <div key={label} className="stats__item">
              <span className="stats__label">{label}</span>
              <strong
                className={
                  value === '준비 중' || value === '-'
                    ? 'stats__value--pending'
                    : 'stats__value'
                }
              >
                {value}
              </strong>
            </div>
          ))}
        </div>
      </section>

      {noTeam ? (
        <div className="dashboard dashboard--single">
          <section className="dashboard__challenges">
            <p className="dashboard__eyebrow">CHALLENGES</p>
            <h2 className="dashboard__heading dashboard__heading--spaced">
              문제 목록
            </h2>
            <NoTeam nickname={user.nickname} />
          </section>
        </div>
      ) : (
      <div className="dashboard">
        <section className="dashboard__challenges">
          <p className="dashboard__eyebrow">CHALLENGES</p>
          <div className="dashboard__heading-row">
            <h2 className="dashboard__heading">문제 목록</h2>
            {canCreateChallenge(user) && (
              <Link to="/admin/challenges/new" className="dashboard__create">
                문제 추가
              </Link>
            )}
          </div>

          <div className="filters">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                className={filter === item ? 'filter filter--active' : 'filter'}
                onClick={() => setFilter(item)}
              >
                {item === 'ALL' ? '전체' : item}
              </button>
            ))}
          </div>

          {load.status === 'loading' && (
            <p className="dashboard__message">문제를 불러오는 중입니다.</p>
          )}

          {load.status === 'error' && (
            <div className="dashboard__message" role="alert">
              <p>{load.message}</p>
              <button type="button" className="retry" onClick={retry}>
                다시 시도
              </button>
            </div>
          )}

          {load.status === 'ok' && groups.length === 0 && (
            <p className="dashboard__message">
              {filter === 'ALL'
                ? '아직 공개된 문제가 없습니다.'
                : `${filter} 분류에 공개된 문제가 없습니다.`}
            </p>
          )}

          {groups.map(({ category, items }) => (
            <section key={category} className="group">
              <h3 className="group__title">
                {category}
                <span>{items.length}문제</span>
              </h3>
              <div className="group__grid">
                {items.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            </section>
          ))}
        </section>

        <aside className="dashboard__side">
          <Leaderboard score={score} />
          <RecentSolves score={score} />
        </aside>
      </div>
      )}
    </Layout>
  );
}

export default DashboardPage;

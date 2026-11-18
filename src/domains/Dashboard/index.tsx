import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { logoutAPI, seesHiddenRanking, type CurrentUser } from '@/api/auth';
import {
  CATEGORIES,
  getSolvedChallenges,
  type Category,
  type SolvedChallenge,
} from '@/api/ctf';
import {
  getMyTeamScore,
  getScoreboard,
  isHidden,
  type MyTeamScore,
  type ScoreboardEntry,
} from '@/api/scoreboard';
import { getMyTeam, type Team } from '@/api/teams';
import Layout from '@/components/Layout';
import NoTeam from '@/components/NoTeam';
import ScheduleBanner from '@/components/ScheduleBanner';
import { GAME_URL } from '@/constants/game';
import { ago, describeRemaining, kstClock, kstShort, useSchedule } from '@/hooks/useSchedule';
import './Dashboard.css';

/**
 * 게임 모드 대시보드 (Figma G01). 문제는 게임 맵 안에 있고, 여기에는 우리 팀이 푼 문제만 쌓인다.
 * 전체 문제 목록·코드는 보여 주지 않고, 개수만 보여 준다 ("3 / 12", "아직 찾지 못한 문제 9개").
 * 순위 비공개 중에는 팀 점수·순위·리더보드를 가리고, 해결한 문제 목록은 계속 보여 준다.
 */

type Filter = 'ALL' | Category;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-team'; message: string }
  | { status: 'closed'; message: string }
  | { status: 'ok'; total: number; solved: SolvedChallenge[] };

interface ScoreState {
  myTeam: MyTeamScore | null;
  top: ScoreboardEntry[];
  /** 서버가 순위를 가렸다 (순위 비공개 중인 참가자) */
  hidden: boolean;
  failed: boolean;
}

type TeamState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; team: Team | null };

const LEADERBOARD_SIZE = 5;
const RECENT_SIZE = 5;

const FILTERS: Filter[] = ['ALL', ...CATEGORIES];

const SolvedCard = ({ solve }: { solve: SolvedChallenge }) => (
  <Link
    to={`/challenges/${encodeURIComponent(solve.code)}`}
    className="challenge-card challenge-card--solved"
  >
    <div>
      <div className="challenge-card__top">
        <span className="challenge-card__code">{solve.code}</span>
        <span className="challenge-card__tag">{solve.category}</span>
      </div>
      <h3 className="challenge-card__title">{solve.title}</h3>
    </div>
    <div className="challenge-card__bottom">
      <span className="challenge-card__solver">
        ✓ {solve.solvedBy} · {kstShort(solve.solvedAt)}
      </span>
      <span className="challenge-card__points">
        {solve.awardedPoints === null ? '비공개' : `${solve.awardedPoints} pts`}
      </span>
    </div>
  </Link>
);

/** 찾을 수 있는 문제 중 푼 비율 (0~100). total 이 0 이면 0 */
const progressOf = (solved: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((solved / total) * 100)) : 0;

const Progress = ({ solved, total }: { solved: number; total: number }) => (
  <div
    className="locked-panel__progress"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={total}
    aria-valuenow={Math.min(solved, total)}
    aria-label={`찾을 수 있는 문제 ${total}개 중 ${solved}개 해결`}
  >
    <span style={{ width: `${progressOf(solved, total)}%` }} />
  </div>
);

/** 남은 문제: 개수만 보여 준다 (D13, 11-18 결정). 코드·제목은 서버가 주지 않는다 */
const LockedPanel = ({ solved, total }: { solved: number; total: number }) => (
  <section className="locked-panel">
    <p className="locked-panel__eyebrow">
      LOCKED · {Math.max(0, total - solved)} / {total}
    </p>
    <h3 className="locked-panel__title">
      아직 찾지 못한 문제가 {Math.max(0, total - solved)}개 있습니다
    </h3>
    <Progress solved={solved} total={total} />
    <p className="locked-panel__text">
      남은 문제는 게임 맵 곳곳의 물건 속에 있습니다. 게임에서 문제를 풀면 이 목록에 자동으로
      추가되고, 그때부터 설명과 첨부파일을 여기서 다시 볼 수 있습니다.
    </p>
    <a className="locked-panel__button" href={GAME_URL} target="_blank" rel="noreferrer">
      게임에서 찾기 →
    </a>
  </section>
);

/** 모두 풀었을 때 */
const AllSolved = ({ total }: { total: number }) => (
  <section className="locked-panel locked-panel--done">
    <p className="locked-panel__eyebrow">
      SOLVED · {total} / {total}
    </p>
    <h3 className="locked-panel__title">찾을 수 있는 문제를 모두 풀었습니다</h3>
    <Progress solved={total} total={total} />
  </section>
);

const EmptySolved = ({ total }: { total: number }) => (
  <section className="locked-panel">
    <p className="locked-panel__eyebrow">SOLVED · 0 / {total}</p>
    <h3 className="locked-panel__title">아직 해결한 문제가 없습니다</h3>
    <p className="locked-panel__text">
      게임에 들어가 맵의 물건을 살펴보세요. 팀원 누구든 문제를 풀면 팀 전체의 목록에 추가됩니다.
    </p>
    <a className="locked-panel__button" href={GAME_URL} target="_blank" rel="noreferrer">
      게임에서 찾기 →
    </a>
  </section>
);

interface LeaderboardProps {
  score: ScoreState | null;
  rankingHidden: boolean;
  hiddenFrom: number | null;
  endsAt: number | null;
  now: number;
}

const Leaderboard = ({ score, rankingHidden, hiddenFrom, endsAt, now }: LeaderboardProps) => {
  const hidden = rankingHidden || score?.hidden;
  const minutesBefore =
    hiddenFrom !== null && endsAt !== null ? Math.round((endsAt - hiddenFrom) / 60_000) : null;
  return (
    <section className="side-panel">
      <h2 className="side-panel__title">TEAM LEADERBOARD</h2>
      {hidden ? (
        <>
          <p className="ranking-note ranking-note--hidden">
            순위 비공개 중 · {kstClock(endsAt)} 종료 후 공개
          </p>
          <p className="side-panel__text">
            모든 팀의 순위와 점수(우리 팀 포함)를 가렸습니다. {kstClock(endsAt)} 종료와 함께 공개됩니다.
          </p>
        </>
      ) : (
        <>
          {hiddenFrom !== null && now < hiddenFrom && (
            <p className="ranking-note">
              {kstClock(hiddenFrom)}
              {minutesBefore !== null && `(종료 ${minutesBefore}분 전)`}부터 순위·점수가 가려집니다
            </p>
          )}
          {!score && <p className="side-panel__text">불러오는 중입니다.</p>}
          {score?.failed && <p className="side-panel__text">순위를 불러오지 못했습니다.</p>}
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
        </>
      )}
      <Link to="/scoreboard" className="side-panel__link">
        전체 순위 보기
      </Link>
    </section>
  );
};

const MyTeam = ({ state, nickname }: { state: TeamState; nickname: string }) => {
  const team = state.status === 'ok' ? state.team : null;
  return (
    <section className="side-panel">
      <h2 className="side-panel__title">MY TEAM</h2>
      {state.status === 'loading' && <p className="side-panel__text">불러오는 중입니다.</p>}
      {state.status === 'error' && <p className="side-panel__text">{state.message}</p>}
      {state.status === 'ok' && !team && (
        <p className="side-panel__text">
          소속된 팀이 없습니다. 운영진이 팀을 배정하면 여기에 표시됩니다.
        </p>
      )}
      {team && (
        <>
          <div className="my-team__head">
            <strong className="my-team__name">{team.name}</strong>
            <span className="my-team__count">
              {team.memberCount}/{team.capacity}
            </span>
          </div>
          {team.description && <p className="side-panel__text my-team__desc">{team.description}</p>}
          <ul className="my-team__members">
            {team.members.map((member) => (
              <li
                key={member.userId}
                className={
                  member.nickname === nickname ? 'my-team__member my-team__member--me' : 'my-team__member'
                }
              >
                <span className="my-team__nickname">{member.nickname}</span>
                <span className="my-team__login">{member.loginId}</span>
                {member.role === 'LEADER' && <span className="my-team__leader">팀장</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

/** 최근 해결은 해결 목록에서 만든다 (점수 없이 누가·무엇을·언제). 순위 비공개 중에도 보인다 */
const RecentSolves = ({ solved, now }: { solved: SolvedChallenge[] | null; now: number }) => {
  const recent = solved ? [...solved].reverse().slice(0, RECENT_SIZE) : [];
  return (
    <section className="side-panel">
      <h2 className="side-panel__title">RECENT SOLVES</h2>
      {solved && recent.length === 0 && <p className="side-panel__text">아직 해결한 문제가 없습니다.</p>}
      {recent.length > 0 && (
        <ul className="recent">
          {recent.map((solve) => (
            <li key={`${solve.code}-${solve.solvedAt}`}>
              <strong>{solve.solvedBy}</strong>
              <span className="recent__meta">
                <span>{solve.code}</span>
                <span>{ago(solve.solvedAt, now)}</span>
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
  const [team, setTeam] = useState<TeamState>({ status: 'loading' });
  const [retryKey, setRetryKey] = useState(0);
  const schedule = useSchedule(() => navigate('/login', { replace: true }));
  // 운영진(ADMIN·DEV)은 순위 비공개 중에도 전체를 본다 (서버와 같은 기준)
  const rankingHidden = schedule.rankingHidden && !seesHiddenRanking(user);

  useEffect(() => {
    const controller = new AbortController();

    getSolvedChallenges(controller.signal)
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

    // 점수판은 팀이 없어도 볼 수 있다. 실패해도 해결 목록은 그대로 보여준다.
    Promise.all([
      getMyTeamScore(controller.signal),
      getScoreboard(0, LEADERBOARD_SIZE, controller.signal),
    ])
      .then(([mine, board]) => {
        if (mine.status === 'unauthenticated' || board.status === 'unauthenticated') {
          navigate('/login', { replace: true });
          return;
        }
        const mineData = mine.status === 'ok' ? mine.data : null;
        const boardData = board.status === 'ok' ? board.data : null;
        setScore({
          myTeam: mineData && !isHidden(mineData) ? mineData.team : null,
          top: boardData && !isHidden(boardData) ? boardData.entries : [],
          hidden: isHidden(mineData) || isHidden(boardData),
          failed: mine.status === 'error' || board.status === 'error',
        });
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });

    getMyTeam(controller.signal)
      .then((result) => {
        if (result.status === 'unauthenticated') {
          navigate('/login', { replace: true });
        } else if (result.status === 'error') {
          setTeam({ status: 'error', message: result.message });
        } else {
          setTeam({ status: 'ok', team: result.data.team });
        }
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });

    return () => controller.abort();
    // 비공개가 시작되거나 끝나면 점수판을 다시 받는다
  }, [navigate, retryKey, rankingHidden]);

  const solved = useMemo(() => (load.status === 'ok' ? load.solved : []), [load]);
  const total = load.status === 'ok' ? load.total : 0;
  const left = Math.max(0, total - solved.length);

  const groups = useMemo(
    () =>
      CATEGORIES.filter((c) => filter === 'ALL' || filter === c)
        .map((category) => ({ category, items: solved.filter((s) => s.category === category) }))
        .filter((group) => group.items.length > 0),
    [solved, filter]
  );

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const retry = () => {
    setLoad({ status: 'loading' });
    setRetryKey((key) => key + 1);
  };

  const hidden = rankingHidden || Boolean(score?.hidden);
  const myTeam = score?.myTeam ?? null;
  const teamName = team.status === 'ok' ? team.team?.name : undefined;
  const noTeam = load.status === 'no-team';
  const remaining = describeRemaining(schedule);
  const solvedPoints = solved.reduce((sum, s) => sum + (s.awardedPoints ?? 0), 0);
  const stats = [
    ['팀 점수', hidden ? '비공개' : myTeam ? `${myTeam.totalScore} pts` : '-'],
    ['팀 순위', hidden ? '비공개' : myTeam?.rank ? `#${myTeam.rank} / ${myTeam.totalTeams}` : '-'],
    ['팀이 푼 문제', load.status === 'ok' ? `${solved.length} / ${total}` : '-'],
    [remaining.label, remaining.value],
  ];

  return (
    <Layout user={user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <p className="hero__prompt">nimda@security:~$ ./ctf --solved</p>
            <p className="hero__eyebrow">NIMDACON 2026 · GAME MODE</p>
            <h1 className="hero__title">SOLVED LOG</h1>
            <p className="hero__lead">
              문제는 게임 맵 안에 숨어 있습니다.
              <br />
              여기에는 우리 팀이 푼 문제만 쌓입니다.
            </p>
            <a className="hero__game" href={GAME_URL} target="_blank" rel="noreferrer">
              게임 입장 → {GAME_URL.replace('https://', '')}
            </a>
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
              <p>[*] team     : {teamName ?? (team.status === 'loading' ? '...' : 'not assigned')}</p>
              {noTeam ? (
                <p className="terminal__red">[!] access   : denied</p>
              ) : (
                <p>
                  [*] solved   :{' '}
                  {load.status === 'ok'
                    ? `${solved.length} problems${hidden ? '' : ` (+${solvedPoints} pts)`}`
                    : '...'}
                </p>
              )}
              <p>
                [?] hidden   :{' '}
                {load.status === 'ok'
                  ? left > 0
                    ? `${left} more in the map`
                    : 'none left'
                  : 'find the rest in the map'}
              </p>
              {schedule.hiddenFrom !== null && (
                <p className="terminal__yellow">
                  [!] freeze   : ranking hidden {hidden ? 'now' : `from ${kstClock(schedule.hiddenFrom)}`}
                </p>
              )}
              <p className="terminal__cyan">$ open {GAME_URL} _</p>
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
                  ['-', '종료', '일정 미정', '비공개'].includes(value)
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

      <div className="dashboard__banner">
        <ScheduleBanner schedule={schedule} />
      </div>

      {noTeam || load.status === 'closed' ? (
        <div className="dashboard dashboard--single">
          <section className="dashboard__challenges">
            <p className="dashboard__eyebrow">SOLVED</p>
            <h2 className="dashboard__heading dashboard__heading--spaced">해결한 문제</h2>
            {load.status === 'closed' ? (
              <p className="dashboard__message dashboard__closed" role="status">
                {load.message} 운영 정책에 따라 종료 후 문제를 공개하지 않습니다.
              </p>
            ) : (
              <NoTeam nickname={user.nickname} />
            )}
          </section>
        </div>
      ) : (
        <div className="dashboard">
          <section className="dashboard__challenges">
            <p className="dashboard__eyebrow">SOLVED</p>
            <div className="dashboard__heading-row">
              <h2 className="dashboard__heading">해결한 문제</h2>
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

            {load.status === 'loading' && <p className="dashboard__message">해결한 문제를 불러오는 중입니다.</p>}

            {load.status === 'error' && (
              <div className="dashboard__message" role="alert">
                <p>{load.message}</p>
                <button type="button" className="retry" onClick={retry}>
                  다시 시도
                </button>
              </div>
            )}

            {load.status === 'ok' && solved.length === 0 && <EmptySolved total={total} />}

            {load.status === 'ok' && solved.length > 0 && groups.length === 0 && (
              <p className="dashboard__message">{filter} 분류에서 해결한 문제가 없습니다.</p>
            )}

            {groups.map(({ category, items }) => (
              <section key={category} className="group">
                <h3 className="group__title">
                  {category}
                  <span>{items.length}</span>
                </h3>
                <div className="group__grid">
                  {items.map((solve) => (
                    <SolvedCard key={solve.code} solve={solve} />
                  ))}
                </div>
              </section>
            ))}

            {load.status === 'ok' && solved.length > 0 && left > 0 && (
              <LockedPanel solved={solved.length} total={total} />
            )}
            {load.status === 'ok' && solved.length > 0 && left === 0 && <AllSolved total={total} />}
          </section>

          <aside className="dashboard__side">
            <MyTeam state={team} nickname={user.nickname} />
            <Leaderboard
              score={score}
              rankingHidden={rankingHidden}
              hiddenFrom={schedule.hiddenFrom}
              endsAt={schedule.endsAt}
              now={schedule.now}
            />
            <RecentSolves solved={load.status === 'ok' ? solved : null} now={schedule.now} />
          </aside>
        </div>
      )}
    </Layout>
  );
}

export default DashboardPage;

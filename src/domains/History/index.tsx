import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { logoutAPI, type CurrentUser } from '@/api/auth';
import { formatRange, getContests, type ContestList } from '@/api/contests';
import Layout from '@/components/Layout';
import './History.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ContestList };

const CURRENT_LABEL = {
  NOT_SCHEDULED: '일정 없음',
  UPCOMING: '시작 전',
  RUNNING: '진행 중',
  ENDED: '결과 확정 중',
} as const;

function HistoryPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const [participated, setParticipated] = useState(false);
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest');
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getContests(participated, sort, controller.signal)
      .then((r) => {
        if (r.status === 'unauthenticated') navigate('/login', { replace: true });
        else if (r.status === 'error') setLoad({ status: 'error', message: r.message });
        else setLoad({ status: 'ok', data: r.data });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [navigate, participated, sort, retryKey]);

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const data = load.status === 'ok' ? load.data : null;

  return (
    <Layout user={user} onLogout={handleLogout}>
      <section className="hs-hero">
        <div className="hs-hero__inner">
          <p className="hs-hero__prompt">nimda@security:~$ ./ctf --history</p>
          <p className="hs-hero__eyebrow">NIMDACON · ARCHIVE</p>
          <h1 className="hs-hero__title">HISTORY</h1>
          <p className="hs-hero__lead">지난 대회의 최종 순위와 문제를 다시 볼 수 있습니다.</p>
        </div>
      </section>

      <div className="hs">
        <div className="hs-filters">
          {[
            [false, '전체'],
            [true, '참가한 대회'],
          ].map(([value, label]) => (
            <button
              key={String(label)}
              type="button"
              aria-pressed={participated === value}
              className={participated === value ? 'hs-chip hs-chip--on' : 'hs-chip'}
              onClick={() => {
                setLoad({ status: 'loading' });
                setParticipated(Boolean(value));
              }}
            >
              {label}
            </button>
          ))}
          <span className="hs-filters__spacer" />
          <select
            aria-label="정렬"
            value={sort}
            onChange={(e) => {
              setLoad({ status: 'loading' });
              setSort(e.target.value as 'latest' | 'oldest');
            }}
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된 순</option>
          </select>
        </div>

        {load.status === 'loading' && <p className="hs__message">불러오는 중입니다.</p>}
        {load.status === 'error' && (
          <div className="hs__message" role="alert">
            <p>{load.message}</p>
            <button type="button" className="hs__link" onClick={() => setRetryKey((k) => k + 1)}>
              다시 시도
            </button>
          </div>
        )}

        {data?.current && (
          <section className={`hs-current hs-current--${data.current.status.toLowerCase()}`}>
            <div>
              <div className="hs-current__head">
                <strong>{data.current.name}</strong>
                <span className="hs-pill">● {CURRENT_LABEL[data.current.status]}</span>
              </div>
              <p>
                {formatRange(data.current.startsAt, data.current.endsAt)} · 팀전 ·{' '}
                {data.current.teamCount}팀 참가
              </p>
            </div>
            <Link to="/scoreboard" className="hs-current__link">
              스코어보드에서 실시간 순위 보기 →
            </Link>
          </section>
        )}

        {data && (
          <>
            <h2 className="hs__heading">종료된 대회</h2>
            {data.ended.length === 0 ? (
              <p className="hs__message hs__empty">
                {participated
                  ? '참가한 대회가 없습니다.'
                  : '아직 종료된 대회가 없습니다. 첫 대회가 끝나면 최종 결과가 여기에 남습니다.'}
              </p>
            ) : (
              <ul className="hs-list">
                {data.ended.map((c) => (
                  <li key={c.id}>
                    <Link to={`/history/${c.id}`} className="hs-row">
                      <span className="hs-row__year">{c.startsAt.slice(0, 4)}</span>
                      <span className="hs-row__info">
                        <strong>{c.name}</strong>
                        <small>
                          {formatRange(c.startsAt, c.endsAt)} · {c.teamCount}팀 · {c.participantCount}명 ·{' '}
                          {c.challengeCount}문제
                        </small>
                      </span>
                      <span className="hs-row__col">
                        <small>우승</small>
                        {c.winner ? (
                          <>
                            <strong>🏆 {c.winner.teamName}</strong>
                            <small>{c.winner.totalScore.toLocaleString()} pts</small>
                          </>
                        ) : (
                          <span className="hs-muted">득점 팀 없음</span>
                        )}
                      </span>
                      <span className="hs-row__col">
                        <small>내 결과</small>
                        {c.myResult ? (
                          <>
                            <strong>
                              <span className={c.myResult.rank === 1 ? 'hs-rank hs-rank--gold' : 'hs-rank'}>
                                {c.myResult.rank ? `#${c.myResult.rank}` : '-'}
                              </span>{' '}
                              {c.myResult.teamName}
                            </strong>
                            <small>{c.myResult.totalScore.toLocaleString()} pts</small>
                          </>
                        ) : (
                          <span className="hs-muted">참가하지 않음</span>
                        )}
                      </span>
                      <span className="hs-row__more">결과 보기 →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default HistoryPage;

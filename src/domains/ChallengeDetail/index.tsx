import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { isDev, logoutAPI, type CurrentUser } from '@/api/auth';
import { getChallenge, type ChallengeDetail } from '@/api/ctf';
import { getGameItems, type GameItem } from '@/api/gameItems';
import Layout from '@/components/Layout';
import NoTeam from '@/components/NoTeam';
import ScheduleBanner from '@/components/ScheduleBanner';
import { GAME_URL } from '@/constants/game';
import { kstShort, useSchedule } from '@/hooks/useSchedule';
import AttachmentPanel from './AttachmentPanel';
import InstancePanel from './InstancePanel';
import './ChallengeDetail.css';

/**
 * 문제 상세 (게임 모드, Figma G02·G02b·G03).
 * - 우리 팀이 푼 문제: 설명·첨부파일(WEB·PWN 은 인스턴스, 다시 띄울 수 있다)·"해결함" 배너·획득한 게임 아이템 이야기.
 *   플래그 제출은 게임 안 문제 창에서 한다 (이 화면은 다시 보기 전용).
 * - 안 푼 문제·없는 코드·초안: 모두 같은 LOCKED 화면 (코드로 문제 존재를 알아낼 수 없게).
 * - DEV 는 안 푼 문제도 미리 본다.
 */

const usesInstance = (challenge: ChallengeDetail) =>
  challenge.category === 'WEB' || challenge.category === 'PWN';

type LoadState =
  | { status: 'loading'; code: string }
  | { status: 'locked'; code: string }
  | { status: 'no-team'; code: string; message: string }
  | { status: 'closed'; code: string; message: string }
  | { status: 'error'; code: string; message: string }
  | { status: 'ok'; code: string; challenge: ChallengeDetail };

/** G03: 안 푼 문제, 없는 코드, 초안을 구분하지 않는다 */
const Locked = () => (
  <section className="detail__locked">
    <p className="detail__locked-eyebrow">LOCKED · ???</p>
    <h1 className="detail__locked-title">아직 풀지 않은 문제입니다</h1>
    <p className="detail__locked-text">
      문제는 게임 맵 안의 물건 속에 있습니다. 게임에서 이 문제를 찾아 풀면 여기에서 설명과 첨부파일을
      다시 볼 수 있습니다.
    </p>
    <div className="detail__locked-actions">
      <a className="detail__locked-button" href={GAME_URL} target="_blank" rel="noreferrer">
        게임에서 찾기 →
      </a>
      <Link className="detail__link" to="/">
        해결한 문제로
      </Link>
    </div>
  </section>
);

const SolvedBanner = ({ challenge }: { challenge: ChallengeDetail }) => {
  const solve = challenge.mySolve;
  if (!solve) return null;
  return (
    <section>
      <h2 className="detail__label">SOLVED</h2>
      <div className="detail__solved">
        <p className="detail__solved-title">✓ 우리 팀이 해결한 문제입니다</p>
        <p className="detail__solved-meta">
          {solve.solvedBy} · {kstShort(solve.solvedAt)}
          {solve.awardedPoints !== null && ` · +${solve.awardedPoints} pts`}
        </p>
      </div>
      <p className="detail__solved-note">
        플래그 제출은 게임 안 문제 창에서 합니다. 이 화면은 다시 보기 전용입니다.
      </p>
    </section>
  );
};

/** 이 문제에 연결된 게임 아이템 중 우리 팀이 가진 것의 이야기 */
const ItemStories = ({ items }: { items: GameItem[] }) => {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="detail__label">ITEM</h2>
      {items.map((item) => (
        <div key={item.key} className="detail__item">
          <p className="detail__item-head">
            &gt; {item.key} · {item.name} · 획득
          </p>
          {item.description && <p className="detail__item-story">{item.description}</p>}
        </div>
      ))}
    </section>
  );
};

function ChallengeDetailPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const [load, setLoad] = useState<LoadState>({ status: 'loading', code });
  const [items, setItems] = useState<GameItem[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const schedule = useSchedule(() => navigate('/login', { replace: true }));
  const dev = isDev(user);

  useEffect(() => {
    const controller = new AbortController();

    getChallenge(code, controller.signal)
      .then((result) => {
        if (result.status === 'unauthenticated') {
          navigate('/login', { replace: true });
        } else if (result.status === 'not-found') {
          setLoad({ status: 'locked', code });
        } else if (result.status === 'ok' && !result.challenge.solvedByMyTeam && !dev) {
          setLoad({ status: 'locked', code });
        } else {
          setLoad({ ...result, code });
        }
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });

    // 게임 아이템 이야기는 덤이다. 게임 역할이 없거나 실패하면 보여 주지 않는다
    getGameItems(controller.signal)
      .then((result) => setItems(result.status === 'ok' ? result.data : []))
      .catch(() => {});

    return () => controller.abort();
  }, [code, dev, navigate, retryKey]);

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const retry = () => {
    setLoad({ status: 'loading', code });
    setRetryKey((key) => key + 1);
  };

  // 다른 문제로 이동한 직후에는 이전 문제를 보여주지 않는다.
  const current: LoadState = load.code === code ? load : { status: 'loading', code };
  const challenge = current.status === 'ok' ? current.challenge : null;
  const ownedItems = challenge
    ? items.filter((item) => item.challengeCode === challenge.code && item.owned)
    : [];

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="detail">
        <p className="detail__breadcrumb">
          <Link to="/">SOLVED</Link>
          {challenge ? ` / ${challenge.category} / ${challenge.code}` : ''}
        </p>

        {current.status === 'loading' && <p className="detail__message">문제를 불러오는 중입니다.</p>}

        <div className="detail__banner">
          <ScheduleBanner schedule={schedule} />
        </div>

        {current.status === 'locked' && <Locked />}

        {current.status === 'closed' && (
          <div className="detail__message" role="status">
            <p>{current.message}</p>
            <Link to="/scoreboard" className="detail__link">
              최종 순위 보기
            </Link>
          </div>
        )}

        {current.status === 'no-team' && (
          <div className="detail__no-team">
            <NoTeam nickname={user.nickname} />
          </div>
        )}

        {current.status === 'error' && (
          <div className="detail__message" role="alert">
            <p>{current.message}</p>
            <button type="button" className="detail__link" onClick={retry}>
              다시 시도
            </button>
          </div>
        )}

        {challenge && (
          <div className="detail__columns">
            <article className="detail__main">
              {!challenge.solvedByMyTeam && dev && (
                <p className="detail__preview">
                  DEV 미리 보기 — 참가자에게는 우리 팀이 풀기 전까지 "아직 풀지 않은 문제" 로 보입니다.
                </p>
              )}
              <div className="detail__meta">
                <span className="detail__tag">{challenge.category}</span>
                <span className="detail__code">{challenge.code}</span>
                {!challenge.isPublic && <span className="detail__draft">초안</span>}
              </div>
              <h1 className="detail__title">{challenge.title}</h1>
              <p className="detail__points">
                {(() => {
                  // 순위 비공개 중인 참가자에게는 둘 다 null 로 온다
                  const points = challenge.mySolve?.awardedPoints ?? challenge.points;
                  return points === null ? '점수 비공개' : `${points} pts`;
                })()}{' '}
                · {challenge.flagType} FLAG
              </p>

              <hr className="detail__divider" />

              <section>
                <h2 className="detail__label">DESCRIPTION</h2>
                <p className="detail__description">{challenge.description}</p>
              </section>

              <SolvedBanner challenge={challenge} />
              <ItemStories items={ownedItems} />
            </article>

            <aside className="detail__side">
              {/* G02b: 이미 푼 WEB·PWN 도 인스턴스를 다시 띄울 수 있다 (점수 변화 없음) */}
              {usesInstance(challenge) ? (
                <InstancePanel
                  key={challenge.id}
                  challenge={challenge}
                  onUnauthenticated={() => navigate('/login', { replace: true })}
                />
              ) : (
                <AttachmentPanel
                  key={challenge.id}
                  challenge={challenge}
                  onUnauthenticated={() => navigate('/login', { replace: true })}
                />
              )}
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ChallengeDetailPage;

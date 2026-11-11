import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import { logoutAPI, type CurrentUser } from '@/api/auth';
import {
  getChallenge,
  getSubmission,
  submitFlag,
  type ChallengeDetail,
  type SubmitFlagResult,
} from '@/api/ctf';
import Layout from '@/components/Layout';
import './ChallengeDetail.css';

type LoadState =
  | { status: 'loading'; code: string }
  | { status: 'not-found'; code: string }
  | { status: 'error'; code: string; message: string }
  | { status: 'ok'; code: string; challenge: ChallengeDetail };

const describeAccess = (challenge: ChallengeDetail) => {
  if (challenge.category === 'WEB' || challenge.category === 'PWN') {
    return {
      label: 'INSTANCE',
      text: '인스턴스 실행은 인프라 연결 후 제공됩니다.',
    };
  }
  return {
    label: 'ATTACHMENT',
    text: challenge.hasAttachment
      ? '파일 다운로드는 인프라 연결 후 제공됩니다.'
      : '첨부파일이 없는 문제입니다.',
  };
};

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;

type FlagState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'done'; tone: 'correct' | 'wrong' | 'info'; message: string };

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

interface FlagFormProps {
  challenge: ChallengeDetail;
  onUnauthenticated: () => void;
}

const FlagForm = ({ challenge, onUnauthenticated }: FlagFormProps) => {
  const [flag, setFlag] = useState('');
  const [state, setState] = useState<FlagState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  // 페이지를 떠나면 진행 중인 제출·폴링을 멈춘다.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const supported = challenge.flagType === 'STATIC';
  const isSubmitting = state.status === 'submitting';

  const describe = (
    result: Extract<SubmitFlagResult, { status: 'judged' }>
  ): FlagState => {
    if (result.verdict === 'WRONG') {
      return { status: 'done', tone: 'wrong', message: '틀린 플래그입니다.' };
    }
    if (result.verdict === 'ALREADY_SOLVED') {
      return { status: 'done', tone: 'info', message: '이미 해결한 문제입니다.' };
    }
    if (!challenge.isPublic) {
      return {
        status: 'done',
        tone: 'correct',
        message: '정답입니다. 초안 문제라 기록되지 않습니다.',
      };
    }
    return {
      status: 'done',
      tone: 'correct',
      message: `정답입니다! +${result.awardedPoints} pts`,
    };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = flag.trim();
    if (!value || isSubmitting || !supported) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'submitting' });

    try {
      let result = await submitFlag(challenge.id, value, controller.signal);
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (result.status === 'pending' && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS, controller.signal);
        result = await getSubmission(result.submissionId, controller.signal);
      }

      if (result.status === 'unauthenticated') {
        onUnauthenticated();
      } else if (result.status === 'judged') {
        setState(describe(result));
        if (result.verdict !== 'WRONG') setFlag('');
      } else if (result.status === 'pending') {
        setState({
          status: 'done',
          tone: 'info',
          message: '채점이 지연되고 있습니다. 잠시 후 다시 제출해 주세요.',
        });
      } else {
        setState({ status: 'done', tone: 'wrong', message: result.message });
      }
    } catch {
      // 화면을 떠나며 취소된 요청은 무시한다.
    }
  };

  return (
    <section>
      <h2 className="detail__label">SUBMIT FLAG</h2>
      <form className="detail__flag" onSubmit={handleSubmit}>
        <input
          value={flag}
          disabled={!supported || isSubmitting}
          placeholder="NIMDA{...}"
          aria-label="플래그"
          autoComplete="off"
          spellCheck={false}
          maxLength={512}
          onChange={(e) => setFlag(e.target.value)}
        />
        <button
          type="submit"
          disabled={!supported || isSubmitting || !flag.trim()}
        >
          {isSubmitting ? '채점 중...' : '제출'}
        </button>
      </form>
      {!supported && (
        <p className="detail__pending">
          DYNAMIC 플래그 제출은 아직 지원하지 않습니다.
        </p>
      )}
      {state.status === 'done' && (
        <p
          className={`detail__verdict detail__verdict--${state.tone}`}
          role="status"
        >
          {state.message}
        </p>
      )}
    </section>
  );
};

function ChallengeDetailPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const [load, setLoad] = useState<LoadState>({ status: 'loading', code });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getChallenge(code, controller.signal)
      .then((result) => {
        if (result.status === 'unauthenticated') {
          navigate('/login', { replace: true });
        } else {
          setLoad({ ...result, code });
        }
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });

    return () => controller.abort();
  }, [code, navigate, retryKey]);

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const retry = () => {
    setLoad({ status: 'loading', code });
    setRetryKey((key) => key + 1);
  };

  // 다른 문제로 이동한 직후에는 이전 문제를 보여주지 않는다.
  const current: LoadState =
    load.code === code ? load : { status: 'loading', code };
  const challenge = current.status === 'ok' ? current.challenge : null;
  const access = challenge ? describeAccess(challenge) : null;

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="detail">
        <p className="detail__breadcrumb">
          <Link to="/">CTF</Link>
          {challenge ? ` / ${challenge.category} / ${challenge.code}` : ''}
        </p>

        {current.status === 'loading' && (
          <p className="detail__message">문제를 불러오는 중입니다.</p>
        )}

        {current.status === 'not-found' && (
          <div className="detail__message">
            <p>존재하지 않는 문제입니다.</p>
            <Link to="/" className="detail__link">
              문제 목록으로
            </Link>
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

        {challenge && access && (
          <div className="detail__columns">
            <article className="detail__main">
              <div className="detail__meta">
                <span className="detail__tag">{challenge.category}</span>
                <span className="detail__code">{challenge.code}</span>
                {!challenge.isPublic && (
                  <span className="detail__draft">초안</span>
                )}
              </div>
              <h1 className="detail__title">{challenge.title}</h1>
              <p className="detail__points">
                {challenge.points} pts · {challenge.flagType} FLAG
              </p>
              <p className="detail__pending">
                최대 {challenge.maxPoint} pts · 해결자 1명당 -
                {challenge.decreasePoint} · 최소 {challenge.minPoint} pts
              </p>

              <hr className="detail__divider" />

              <section>
                <h2 className="detail__label">DESCRIPTION</h2>
                <p className="detail__description">{challenge.description}</p>
              </section>

              <FlagForm
                key={challenge.id}
                challenge={challenge}
                onUnauthenticated={() => navigate('/login', { replace: true })}
              />
            </article>

            <aside className="detail__side">
              <section className="detail-panel">
                <div className="detail-panel__head">
                  <h2>{access.label}</h2>
                  <span>준비 중</span>
                </div>
                <p>{access.text}</p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ChallengeDetailPage;

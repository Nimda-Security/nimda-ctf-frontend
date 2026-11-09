import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import { logoutAPI, type CurrentUser } from '@/api/auth';
import { getChallenge, type ChallengeDetail } from '@/api/ctf';
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

              <hr className="detail__divider" />

              <section>
                <h2 className="detail__label">DESCRIPTION</h2>
                <p className="detail__description">{challenge.description}</p>
              </section>

              <section>
                <h2 className="detail__label">SUBMIT FLAG</h2>
                <div className="detail__flag">
                  <input
                    disabled
                    placeholder="NIMDA{...}"
                    aria-label="플래그"
                  />
                  <button type="button" disabled>
                    제출
                  </button>
                </div>
                <p className="detail__pending">플래그 제출은 준비 중입니다.</p>
              </section>
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

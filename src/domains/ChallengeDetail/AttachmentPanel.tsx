import { useEffect, useRef, useState } from 'react';
import {
  getDownloadStatus,
  requestDownload,
  type ChallengeDetail,
  type DownloadResult,
} from '@/api/ctf';

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

/** "2026-03-21T15:42:10Z" → "15:42" (로컬 시각) */
const formatExpiry = (value: string | null) => {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

type State =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'ready'; url: string; expiresAt: string | null }
  | { status: 'error'; message: string };

interface AttachmentPanelProps {
  challenge: ChallengeDetail;
  onUnauthenticated: () => void;
}

/**
 * 정적 문제(WEB·PWN 외)의 첨부파일 영역.
 *
 * 버튼을 누르면 서버가 S3 서명 링크를 발급한다. 3초 안에 오면 바로 새 탭으로 열고,
 * 늦어지면(202) 발급될 때까지 폴링한다. 링크는 만료되므로 만료 후에는 다시 요청한다.
 */
const AttachmentPanel = ({ challenge, onUnauthenticated }: AttachmentPanelProps) => {
  const [state, setState] = useState<State>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  // 페이지를 떠나면 진행 중인 요청·폴링을 멈춘다.
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 만료 시각이 지나면 링크를 숨기고 다시 받게 한다.
  const expiresAt =
    state.status === 'ready' && state.expiresAt ? Date.parse(state.expiresAt) : null;
  useEffect(() => {
    if (expiresAt === null || Number.isNaN(expiresAt)) return;
    const timer = setTimeout(
      () => setState({ status: 'idle' }),
      Math.max(0, expiresAt - Date.now())
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const handleDownload = async () => {
    if (state.status === 'requesting') return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    // 팝업 차단을 피하려면 클릭 직후에 창을 열어 두고, 링크를 받으면 주소를 넣는다.
    const popup = window.open('', '_blank');
    setState({ status: 'requesting' });

    try {
      let result: DownloadResult = await requestDownload(challenge.code, controller.signal);
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (result.status === 'pending' && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS, controller.signal);
        result = await getDownloadStatus(result.requestId, controller.signal);
      }

      if (result.status === 'ready') {
        if (popup) {
          popup.opener = null;
          popup.location.href = result.url;
        }
        setState({ status: 'ready', url: result.url, expiresAt: result.expiresAt });
        return;
      }

      popup?.close();
      if (result.status === 'unauthenticated') {
        onUnauthenticated();
      } else if (result.status === 'pending') {
        setState({
          status: 'error',
          message: '링크 발급이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
        });
      } else {
        setState({ status: 'error', message: result.message });
      }
    } catch {
      // 화면을 떠나며 취소된 요청은 무시한다.
      popup?.close();
    }
  };

  if (!challenge.hasAttachment) {
    return (
      <section className="detail-panel">
        <div className="detail-panel__head">
          <h2>ATTACHMENT</h2>
          <span>없음</span>
        </div>
        <p>첨부파일이 없는 문제입니다.</p>
      </section>
    );
  }

  const badge =
    state.status === 'requesting'
      ? '발급 중'
      : state.status === 'ready'
        ? '발급됨'
        : '사용 가능';
  const expiry = state.status === 'ready' ? formatExpiry(state.expiresAt) : null;

  return (
    <section className="detail-panel">
      <div className="detail-panel__head">
        <h2>ATTACHMENT</h2>
        <span>{badge}</span>
      </div>
      <p>문제 파일을 받아 분석하세요. 링크는 일정 시간 뒤 만료됩니다.</p>

      {state.status === 'ready' ? (
        <>
          <a
            className="instance__action instance__action--primary"
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            다시 열기
          </a>
          <p className="instance__meta">
            {expiry ? `${expiry}까지 유효한 링크입니다.` : '다운로드 링크가 발급되었습니다.'}
          </p>
        </>
      ) : (
        <button
          type="button"
          className="instance__action instance__action--primary"
          disabled={state.status === 'requesting'}
          onClick={handleDownload}
        >
          {state.status === 'requesting' ? '링크 발급 중...' : '파일 받기'}
        </button>
      )}

      {state.status === 'error' && (
        <p className="instance__meta" role="alert">
          {state.message}
        </p>
      )}
    </section>
  );
};

export default AttachmentPanel;

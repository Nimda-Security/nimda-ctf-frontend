import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getInstanceStatus,
  getMyInstance,
  getServerStatus,
  startInstance,
  SERVER_DOWN_MESSAGE,
  type ChallengeDetail,
  type InstanceResult,
  type InstanceView,
} from '@/api/ctf';

const PENDING_POLL_MS = 1500;
// 빌드가 오래 걸리는 문제도 있어서 넉넉히 잡는다. 넘기면 폴링만 멈추고 안내한다.
const PENDING_TIMEOUT_MS = 3 * 60_000;
// 서버가 꺼져 있는 동안 다시 확인하는 주기. 켜지면 새로고침 없이 버튼이 나타난다.
const SERVER_RECHECK_MS = 15_000;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok' };

interface InstancePanelProps {
  challenge: ChallengeDetail;
  onUnauthenticated: () => void;
}

/**
 * WEB·PWN 문제의 인스턴스 영역.
 *
 * 이미 띄운 인스턴스(PENDING·READY)는 서버 상태와 상관없이 보여준다.
 * 새로 시작하는 버튼만 CTF 서버가 살아 있을 때 보여주고, 아니면 안내 문구를 보여준다.
 */
const InstancePanel = ({ challenge, onUnauthenticated }: InstancePanelProps) => {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [available, setAvailable] = useState(false);
  const [instance, setInstance] = useState<InstanceView | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const startRef = useRef<AbortController | null>(null);

  // 부모가 매 렌더마다 새 함수를 넘겨도 아래 effect들이 다시 돌지 않게 ref로 든다.
  const onUnauthRef = useRef(onUnauthenticated);
  useEffect(() => {
    onUnauthRef.current = onUnauthenticated;
  });

  useEffect(() => () => startRef.current?.abort(), []);

  // 공통 처리. 결과가 ok가 아니면 false를 돌려준다.
  const apply = useCallback(
    (result: InstanceResult) => {
      if (result.status === 'unauthenticated') {
        onUnauthRef.current();
        return false;
      }
      if (result.status === 'unavailable') {
        setAvailable(false);
        setNotice(null);
        return false;
      }
      if (result.status === 'error') {
        setNotice(result.message);
        return false;
      }
      setInstance(result.instance);
      return true;
    },
    []
  );

  // 1. 처음 들어올 때: 서버 상태와 내 인스턴스를 같이 본다.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getServerStatus(controller.signal),
      getMyInstance(challenge.code, controller.signal),
    ])
      .then(([server, mine]) => {
        if (server.status === 'unauthenticated' || mine.status === 'unauthenticated') {
          onUnauthRef.current();
          return;
        }
        if (mine.status === 'error') {
          setLoad({ status: 'error', message: mine.message });
          return;
        }
        // 상태 확인만 실패했으면 꺼진 것으로 보고 아래 재확인에 맡긴다.
        setAvailable(server.status === 'ok' && server.available);
        if (mine.status === 'ok') setInstance(mine.instance);
        setNotice(null);
        setLoad({ status: 'ok' });
      })
      .catch(() => {
        // 화면을 떠나며 취소된 요청은 무시한다.
      });
    return () => controller.abort();
  }, [challenge.code, reloadKey]);

  // 2. 서버가 꺼져 있는 동안 주기적으로 다시 확인한다.
  useEffect(() => {
    if (load.status !== 'ok' || available) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      getServerStatus(controller.signal)
        .then((result) => {
          if (result.status === 'ok' && result.available) setAvailable(true);
        })
        .catch(() => {});
    }, SERVER_RECHECK_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [load.status, available]);

  // 3. PENDING이면 READY·FAILED가 될 때까지 폴링한다. 페이지를 떠나면 멈춘다.
  const pendingUuid = instance?.status === 'PENDING' ? instance.uuid : null;
  useEffect(() => {
    if (!pendingUuid) return;
    const controller = new AbortController();
    (async () => {
      const deadline = Date.now() + PENDING_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await sleep(PENDING_POLL_MS, controller.signal);
        const result = await getInstanceStatus(pendingUuid, controller.signal);
        if (!apply(result)) return;
        if (result.status === 'ok' && result.instance?.status !== 'PENDING') return;
      }
      setNotice('준비가 지연되고 있습니다. 잠시 후 새로고침해 주세요.');
    })().catch(() => {
      // 화면을 떠나며 취소된 요청은 무시한다.
    });
    return () => controller.abort();
  }, [pendingUuid, apply]);

  // 4. READY면 남은 시간을 1초마다 갱신하고, 시간이 다 되면 만료로 바꾼다.
  const expiresAt =
    instance?.status === 'READY' && instance.expiresAt
      ? Date.parse(instance.expiresAt)
      : null;
  useEffect(() => {
    if (expiresAt === null || Number.isNaN(expiresAt)) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= expiresAt) {
        setInstance((prev) => (prev ? { ...prev, status: 'EXPIRED' } : prev));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleStart = async () => {
    if (starting) return;
    startRef.current?.abort();
    const controller = new AbortController();
    startRef.current = controller;
    setStarting(true);
    setNotice(null);
    try {
      apply(await startInstance(challenge.code, controller.signal));
    } catch {
      // 화면을 떠나며 취소된 요청은 무시한다.
    } finally {
      if (!controller.signal.aborted) setStarting(false);
    }
  };

  const command =
    instance?.host && instance.port ? `nc ${instance.host} ${instance.port}` : null;

  const handleCopy = async () => {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('복사하지 못했습니다. 직접 선택해 복사해 주세요.');
    }
  };

  const badge = (() => {
    if (load.status !== 'ok') return '확인 중';
    if (instance?.status === 'READY') return '실행 중';
    if (instance?.status === 'PENDING') return '준비 중';
    return available ? '사용 가능' : '중지됨';
  })();

  const renderBody = () => {
    if (load.status === 'loading') {
      return <p>상태를 확인하는 중입니다.</p>;
    }
    if (load.status === 'error') {
      return (
        <>
          <p role="alert">{load.message}</p>
          <button
            type="button"
            className="instance__action"
            onClick={() => {
              setLoad({ status: 'loading' });
              setReloadKey((k) => k + 1);
            }}
          >
            다시 시도
          </button>
        </>
      );
    }

    if (instance?.status === 'PENDING') {
      return <p>인스턴스를 준비하는 중입니다...</p>;
    }

    if (instance?.status === 'READY') {
      const remaining =
        expiresAt !== null && !Number.isNaN(expiresAt)
          ? formatRemaining(expiresAt - now)
          : null;
      return (
        <>
          {instance.accessUrl && (
            // 문제 페이지는 적대적인 코드라 iframe에 넣지 않고 새 탭으로 연다.
            <a
              className="instance__action instance__action--primary"
              href={instance.accessUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              접속하기
            </a>
          )}
          {command && (
            <div className="instance__command">
              <code>{command}</code>
              <button type="button" onClick={handleCopy}>
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          )}
          {remaining && <p className="instance__meta">남은 시간 {remaining}</p>}
        </>
      );
    }

    // 시작 전, 실패, 만료. 새로 시작해야 하는 경우다.
    const intro =
      instance?.status === 'FAILED'
        ? instance.message || '인스턴스를 만들지 못했습니다.'
        : instance?.status === 'EXPIRED'
          ? '인스턴스가 만료되었습니다.'
          : challenge.category === 'PWN'
            ? '인스턴스를 시작하면 nc로 접속할 주소를 받습니다.'
            : '인스턴스를 시작하면 접속 주소를 받습니다.';

    if (!available) {
      return (
        <>
          {instance && <p>{intro}</p>}
          <p className="instance__down" role="status">
            {SERVER_DOWN_MESSAGE}
          </p>
        </>
      );
    }

    const label =
      instance?.status === 'FAILED'
        ? '다시 시도'
        : instance?.status === 'EXPIRED'
          ? '다시 시작'
          : '인스턴스 시작';
    return (
      <>
        <p>{intro}</p>
        <button
          type="button"
          className="instance__action instance__action--primary"
          disabled={starting}
          onClick={handleStart}
        >
          {starting ? '요청 중...' : label}
        </button>
      </>
    );
  };

  return (
    <section className="detail-panel">
      <div className="detail-panel__head">
        <h2>INSTANCE</h2>
        <span>{badge}</span>
      </div>
      {renderBody()}
      {notice && (
        <p className="instance__meta" role="status">
          {notice}
        </p>
      )}
    </section>
  );
};

export default InstancePanel;

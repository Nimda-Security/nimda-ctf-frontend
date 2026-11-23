import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminGameSettings,
  STAGE2_MINUTES_MAX,
  STAGE2_MINUTES_MIN,
  updateGameSettings,
  type GameSettings,
} from '@/api/gameSettings';
import { formatCountdown, formatKst } from '@/api/schedule';

/** 빠른 선택 (분). 기획안의 기본 제안은 90분 */
const MINUTE_OPTIONS = [30, 60, 90, 120, 180];
const DEFAULT_MINUTES = 90;

interface Props {
  /** 지금 저장된 대회 시작 (ms). 대회가 없으면 null */
  contestStart: number | null;
  /** 서버 시계 기준 지금 (ms) */
  now: number;
}

/**
 * MMO 게임의 Stage2 시간 개방 (Figma G11). 대회 일정과는 다른 API 라 저장 버튼도 따로 둔다.
 * 대회 시작 기준 상대 시간이므로 일정을 바꿔도 다시 넣을 필요가 없다.
 */
function Stage2Panel({ contestStart, now }: Props) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<GameSettings | null>(null);
  // unavailable: CTF_GAME_ENABLED=false 이거나 백엔드에 아직 이 API 가 없음 (404)
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

  const apply = (s: GameSettings) => {
    setSaved(s);
    setEnabled(s.stage2OpenMinutes !== null);
    setMinutes(String(s.stage2OpenMinutes ?? DEFAULT_MINUTES));
    setState('ready');
  };

  useEffect(() => {
    const controller = new AbortController();
    getAdminGameSettings(controller.signal)
      .then((r) => {
        if (r.status === 'ok') apply(r.data);
        else if (r.status === 'unauthenticated') navigate('/login', { replace: true });
        else if (r.code === 404) setState('unavailable');
        else {
          setLoadError(r.message);
          setState('error');
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [navigate]);

  const value = Number(minutes);
  const valid = Number.isInteger(value) && value >= STAGE2_MINUTES_MIN && value <= STAGE2_MINUTES_MAX;
  const next = enabled ? value : null;
  const dirty = saved !== null && next !== saved.stage2OpenMinutes;
  const invalid = enabled && !valid;

  const save = async () => {
    if (invalid || busy) return;
    setBusy(true);
    const result = await updateGameSettings(next);
    setBusy(false);
    if (result.status === 'unauthenticated') {
      navigate('/login', { replace: true });
      return;
    }
    if (result.status === 'error') {
      setNotice({ tone: 'error', message: result.message });
      return;
    }
    apply(result.data);
    setNotice({
      tone: 'ok',
      message: next === null ? 'Stage2 시간 개방을 껐습니다.' : `Stage2 를 대회 시작 ${next}분 뒤에 엽니다.`,
    });
  };

  // 저장 전 값으로 계산한 미리보기 (저장된 대회 시작 기준)
  const openAt = enabled && valid && contestStart !== null ? contestStart + value * 60_000 : null;
  const preview = () => {
    if (!enabled) return '꺼짐 · 기념품 5개를 모은 팀만 Stage2 에 들어갑니다.';
    if (!valid) return null;
    if (contestStart === null || openAt === null) return '현재 대회가 없어 열리지 않습니다. 대회를 만들면 그 시작 기준으로 열립니다.';
    const status = now >= openAt ? '지금 열림' : `닫힘 · ${formatCountdown(openAt - now)} 남음`;
    return `시작 ${formatKst(contestStart)} · 개방 ${formatKst(openAt)} (+${value}분) · ${status}${dirty ? ' · 저장 전' : ''}`;
  };

  return (
    <section className="cs-panel" aria-label="Stage2 시간 개방">
      <h2>GAME · STAGE2 TIMED OPEN</h2>

      {state === 'loading' && <p className="cs-hint">불러오는 중입니다.</p>}
      {state === 'unavailable' && (
        <p className="cs-hint">
          게임 설정 API 를 쓸 수 없습니다. 백엔드에서 CTF 게임이 꺼져 있거나(CTF_GAME_ENABLED=false) 아직 배포되지 않았습니다.
        </p>
      )}
      {state === 'error' && (
        <p className="cs-notice cs-notice--error" role="alert">
          {loadError}
        </p>
      )}

      {state === 'ready' && (
        <>
          <label className="cs-toggle">
            <span className="cs-toggle__text">
              <strong>Stage2 시간 개방</strong>
              <small>
                켜면 대회 시작 후 정한 시간이 지난 뒤, 기념품 5개를 다 모으지 못한 팀에게도 게임의 Stage2 문을 엽니다. 아이템·점수는 주지 않습니다.
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                setNotice(null);
              }}
            />
            <span className="cs-switch" aria-hidden="true" />
          </label>

          <div className={enabled ? 'cs-stage2' : 'cs-stage2 cs-freeze--off'}>
            <label className="cs-field">
              <span>개방 시각 (대회 시작 몇 분 후)</span>
              <input
                type="number"
                inputMode="numeric"
                min={STAGE2_MINUTES_MIN}
                max={STAGE2_MINUTES_MAX}
                step={1}
                value={minutes}
                disabled={!enabled}
                aria-invalid={invalid}
                onChange={(e) => {
                  setMinutes(e.target.value);
                  setNotice(null);
                }}
              />
            </label>
            {invalid && (
              <p className="cs-field__error" role="alert">
                {STAGE2_MINUTES_MIN} ~ {STAGE2_MINUTES_MAX} 사이의 분(정수)을 입력해 주세요.
              </p>
            )}
            <div className="cs-chips">
              {MINUTE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={enabled && value === m ? 'cs-btn cs-btn--primary' : 'cs-btn'}
                  aria-pressed={enabled && value === m}
                  disabled={!enabled}
                  onClick={() => {
                    setMinutes(String(m));
                    setNotice(null);
                  }}
                >
                  {m}분
                </button>
              ))}
            </div>
          </div>

          {preview() && <p className="cs-freeze-preview">{preview()}</p>}
          <p className="cs-hint">
            대회 시작 기준이라 일정을 바꿔도 다시 넣을 필요가 없습니다. 저장하면 바로 적용되고, 게임은 Stage2 문 앞에서 E 를 누를 때마다 다시 확인합니다.
          </p>

          {notice && (
            <p className={`cs-notice cs-notice--${notice.tone}`} role="status">
              {notice.message}
            </p>
          )}

          <div className="cs-actions">
            <button
              type="button"
              className="cs-btn"
              disabled={busy || !dirty}
              onClick={() => saved && apply(saved)}
            >
              되돌리기
            </button>
            <button
              type="button"
              className="cs-btn cs-btn--primary"
              disabled={busy || !dirty || invalid}
              onClick={save}
            >
              {busy ? '저장 중...' : 'Stage2 설정 저장'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default Stage2Panel;

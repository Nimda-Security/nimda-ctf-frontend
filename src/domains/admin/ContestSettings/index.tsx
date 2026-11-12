import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { canManageTeams, logoutAPI, type CurrentUser } from '@/api/auth';
import type { ApiResult } from '@/api/client';
import { formatDateTime } from '@/api/client';
import {
  createContest,
  finalizeContest,
  formatDateMinute,
  formatRange,
  getAdminContests,
  type AdminContest,
} from '@/api/contests';
import {
  formatCountdown,
  formatKst,
  fromKstParts,
  getAdminSchedule,
  phaseAt,
  toKstParts,
  updateSchedule,
  type AdminSchedule,
  type ContestPhase,
  type ScheduleHistory,
  type ScheduleUpdate,
} from '@/api/schedule';
import Layout from '@/components/Layout';
import './ContestSettings.css';

const FREEZE_OPTIONS = [10, 30, 60, 120];
const QUICK_ADJUST = [
  ['+30분', 30],
  ['+1시간', 60],
  ['+3시간', 180],
] as const;

const PHASE_LABEL: Record<ContestPhase, string> = {
  NOT_SCHEDULED: '대회 없음',
  UPCOMING: '시작 전',
  RUNNING: '진행 중',
  ENDED: '종료',
};

const FIELD_LABEL: Record<string, string> = {
  CREATED: '대회 생성',
  NAME: '이름',
  STARTS_AT: '시작',
  ENDS_AT: '종료',
  CLEANUP_INSTANCES: '인스턴스 정리',
  CHALLENGES_VISIBLE: '종료 후 문제 공개',
  FREEZE_SCOREBOARD: '스코어보드 고정',
  FREEZE_MINUTES: '고정 시점(분 전)',
  REOPENED: '결과 확정 취소 (다시 열림)',
  FINALIZED: '결과 확정',
};

interface Form {
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  cleanup: boolean;
  visible: boolean;
  freeze: boolean;
  freezeMinutes: number;
}

/** 새 대회 기본값: 내일 10시 ~ 모레 18시 */
const blankForm = (serverNow: number): Form => ({
  name: '',
  startDate: toKstParts(serverNow + 86_400_000).date,
  startTime: '10:00',
  endDate: toKstParts(serverNow + 2 * 86_400_000).date,
  endTime: '18:00',
  cleanup: true,
  visible: true,
  freeze: false,
  freezeMinutes: 30,
});

const toForm = (s: AdminSchedule, serverNow: number): Form => {
  if (!s.startsAt || !s.endsAt) return blankForm(serverNow);
  const start = toKstParts(Date.parse(s.startsAt));
  const end = toKstParts(Date.parse(s.endsAt));
  return {
    name: s.name ?? '',
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    cleanup: s.cleanupInstancesOnEnd ?? true,
    visible: s.challengesVisibleAfterEnd ?? true,
    freeze: s.freezeScoreboard ?? false,
    freezeMinutes: s.freezeMinutesBeforeEnd ?? 30,
  };
};

const describeChange = (h: ScheduleHistory) => {
  const label = FIELD_LABEL[h.field] ?? h.field;
  if (h.field === 'CREATED') return `${label} (${h.newValue ?? ''})`;
  if (h.field === 'REOPENED') return label;
  if (h.field === 'FINALIZED') return `${label}${h.newValue ? ` ${h.newValue}` : ''}`;
  return `${label} ${h.oldValue ?? '-'} → ${h.newValue ?? '-'}`;
};

interface ToggleProps {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}

const Toggle = ({ title, desc, checked, disabled, onChange }: ToggleProps) => (
  <label className={disabled ? 'cs-toggle cs-toggle--disabled' : 'cs-toggle'}>
    <span className="cs-toggle__text">
      <strong>{title}</strong>
      <small>{desc}</small>
    </span>
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
    />
    <span className="cs-switch" aria-hidden="true" />
  </label>
);

interface Confirm {
  title: string;
  message: string;
  action: string;
  run: () => Promise<void>;
}

function ContestSettingsPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const allowed = canManageTeams(user);

  const [data, setData] = useState<AdminSchedule | null>(null);
  const [contests, setContests] = useState<AdminContest[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  // edit: 현재 대회 수정 (PUT schedule) / create: 새 대회 만들기 (POST contests)
  const [mode, setMode] = useState<'edit' | 'create'>('edit');
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback((s: AdminSchedule) => {
    const serverNow = Date.parse(s.serverTime);
    setOffset(serverNow - Date.now());
    setData(s);
    setForm(toForm(s, serverNow));
    setMode('edit');
  }, []);

  const loadContests = useCallback(
    (signal?: AbortSignal) =>
      getAdminContests(signal)
        .then((r) => {
          if (r.status === 'ok') setContests(r.data);
        })
        .catch(() => {}),
    []
  );

  const reload = useCallback(
    (signal?: AbortSignal) =>
      getAdminSchedule(signal)
        .then((r) => {
          if (r.status === 'unauthenticated') navigate('/login', { replace: true });
          else if (r.status === 'error') setError(r.message);
          else apply(r.data);
        })
        .catch(() => {}),
    [apply, navigate]
  );

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    reload(controller.signal);
    loadContests(controller.signal);
    const tick = window.setInterval(() => setClock(Date.now()), 1000);
    return () => {
      controller.abort();
      window.clearInterval(tick);
    };
  }, [allowed, reload, loadContests]);

  if (!allowed) return <Navigate to="/" replace />;

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const now = clock + offset;
  const savedStart = data?.startsAt ? Date.parse(data.startsAt) : null;
  const savedEnd = data?.endsAt ? Date.parse(data.endsAt) : null;
  const phase = phaseAt(now, savedStart, savedEnd);
  const finalized = Boolean(data?.finalizedAt);
  const progress =
    savedStart !== null && savedEnd !== null
      ? Math.min(1, Math.max(0, (now - savedStart) / (savedEnd - savedStart)))
      : 0;

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const formStart = form ? fromKstParts(form.startDate, form.startTime) : NaN;
  const formEnd = form ? fromKstParts(form.endDate, form.endTime) : NaN;
  const rangeError =
    form && (Number.isNaN(formStart) || Number.isNaN(formEnd))
      ? '날짜와 시각을 모두 입력해 주세요.'
      : formEnd <= formStart
        ? '종료 시각은 시작 시각보다 늦어야 합니다.'
        : null;

  const adjustEnd = (minutes: number) => {
    if (!form || Number.isNaN(formEnd)) return;
    const next = toKstParts(formEnd + minutes * 60_000);
    setForm({ ...form, endDate: next.date, endTime: next.time });
  };

  const payload = (endsAtMs: number): ScheduleUpdate => {
    const end = toKstParts(endsAtMs);
    return {
      name: form?.name.trim() || undefined,
      startsAt: `${form?.startDate}T${form?.startTime}:00`,
      endsAt: `${end.date}T${end.seconds}`,
      cleanupInstancesOnEnd: form?.cleanup ?? true,
      challengesVisibleAfterEnd: form?.visible ?? true,
      freezeScoreboard: form?.freeze ?? false,
      freezeMinutesBeforeEnd: form?.freezeMinutes ?? 30,
    };
  };

  /** 요청 하나를 보내고 결과에 따라 알림·재조회한다. */
  const run = async <T,>(
    action: () => Promise<ApiResult<T>>,
    success: string,
    onOk?: (data: T) => void
  ) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    setConfirm(null);
    if (result.status === 'unauthenticated') {
      navigate('/login', { replace: true });
      return;
    }
    if (result.status === 'error') {
      setNotice({ tone: 'error', message: result.message });
      return;
    }
    setNotice({ tone: 'ok', message: success });
    if (onOk) onOk(result.data);
    loadContests();
  };

  const saveEdit = (endsAtMs: number) =>
    run(() => updateSchedule(payload(endsAtMs)), '대회 일정이 저장되었습니다.', apply);

  const handleSave = () => {
    if (rangeError || !form) return;
    if (mode === 'create') {
      run(() => createContest(payload(formEnd)), '새 대회를 만들었습니다.', apply);
      return;
    }
    // 확정된 대회의 종료를 미래로 바꾸면 백엔드가 대회를 다시 열고 확정 결과를 지운다.
    if (finalized && formEnd > now) {
      setConfirm({
        title: '확정된 대회를 다시 열까요?',
        message:
          '이 대회는 결과가 확정되어 이력에 올라가 있습니다. 종료 시각을 미래로 바꾸면 이력에서 내려가고 확정된 결과가 지워집니다. 다음 대회를 열려면 "새 대회 만들기"를 쓰세요.',
        action: '다시 열고 저장',
        run: () => saveEdit(formEnd),
      });
      return;
    }
    // 진행 중인 대회를 지금 이전으로 끝내면 즉시 종료되므로 한 번 더 묻는다.
    if (formEnd <= now && phase !== 'ENDED') {
      setConfirm({
        title: '대회를 지금 종료할까요?',
        message: `종료 시각이 ${formatKst(formEnd)}로 바뀌어 저장 즉시 대회가 종료됩니다. 플래그 제출이 마감됩니다.`,
        action: '저장하고 종료',
        run: () => saveEdit(formEnd),
      });
      return;
    }
    saveEdit(formEnd);
  };

  const endNow = () =>
    setConfirm({
      title: '대회를 지금 종료할까요?',
      message: `종료 시각이 ${savedEnd ? formatKst(savedEnd) : '-'} → 지금(${formatKst(now)})으로 바뀝니다. 플래그 제출이 즉시 마감되고, 1분 뒤 결과가 자동으로 확정됩니다.`,
      action: '지금 종료',
      run: () => saveEdit(now),
    });

  const finalizeNow = () => {
    if (!data?.contestId) return;
    const id = data.contestId;
    run(
      () => finalizeContest(id),
      finalized ? '결과를 다시 확정했습니다.' : '대회 결과를 확정했습니다. 이력에 올라갔습니다.',
      () => {
        reload();
      }
    );
  };

  const startCreate = () => {
    setForm(blankForm(now));
    setMode('create');
    setNotice(null);
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="cs">
        <header>
          <p className="cs__crumb">CTF / ADMIN / SETTINGS</p>
          <p className="cs__badge">ADMIN ONLY</p>
          <h1 className="cs__title">대회 운영 설정</h1>
          <p className="cs__lead">
            대회 시작·종료 시각과 종료 후 동작을 정합니다. 시각은 서버 시간(KST) 기준입니다.
          </p>
        </header>

        {error && (
          <p className="cs-notice cs-notice--error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p className="cs__loading">불러오는 중입니다.</p>}

        {data && form && (
          <>
            <section className="cs-status" aria-label="대회 상태">
              <div className="cs-status__row">
                <span className={`cs-pill cs-pill--${phase.toLowerCase()}`}>
                  {PHASE_LABEL[phase]}
                </span>
                {data.name && <strong className="cs-status__name">{data.name}</strong>}
                <span className="cs-status__spacer" />
                {phase === 'UPCOMING' && savedStart !== null && (
                  <>
                    <span className="cs-status__label">시작까지</span>
                    <strong className="cs-status__time">{formatCountdown(savedStart - now)}</strong>
                  </>
                )}
                {phase === 'RUNNING' && savedEnd !== null && (
                  <>
                    <span className="cs-status__label">종료까지</span>
                    <strong className="cs-status__time">{formatCountdown(savedEnd - now)}</strong>
                  </>
                )}
              </div>
              <div className="cs-bar" aria-hidden="true">
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="cs-status__dates">
                <span>시작 {savedStart !== null ? formatKst(savedStart) : '-'}</span>
                <span className="cs-status__now">현재 {formatKst(now)}</span>
                <span>종료 {savedEnd !== null ? formatKst(savedEnd) : '-'}</span>
              </div>
            </section>

            {phase === 'ENDED' && (
              <section
                className={finalized ? 'cs-final cs-final--done' : 'cs-final'}
                aria-label="결과 확정"
              >
                <div>
                  <strong>
                    {finalized
                      ? `결과 확정됨 · ${formatDateMinute(data.finalizedAt)}`
                      : '종료됨 · 결과 확정 대기'}
                  </strong>
                  <p>
                    {finalized
                      ? '이 대회는 이력에 올라갔습니다. 다음 대회는 "새 대회 만들기"로 만드세요.'
                      : '종료 1분 뒤 결과가 자동으로 확정되어 이력에 올라갑니다. 지금 바로 확정할 수도 있습니다.'}
                  </p>
                </div>
                <div className="cs-final__actions">
                  {finalized && data.contestId && (
                    <Link to={`/history/${data.contestId}`} className="cs-btn">
                      이력 보기
                    </Link>
                  )}
                  <button type="button" className="cs-btn" disabled={busy} onClick={finalizeNow}>
                    {finalized ? '결과 다시 확정' : '지금 결과 확정'}
                  </button>
                  {finalized && mode === 'edit' && (
                    <button type="button" className="cs-btn cs-btn--primary" onClick={startCreate}>
                      새 대회 만들기
                    </button>
                  )}
                </div>
              </section>
            )}

            {notice && (
              <p className={`cs-notice cs-notice--${notice.tone}`} role="status">
                {notice.message}
              </p>
            )}

            <div className="cs-columns">
              <div className="cs-main">
                {mode === 'create' && (
                  <p className="cs-mode" role="status">
                    새 대회를 만드는 중입니다. 저장하면 현재 대회가 되고, 팀·점수판은 새 대회 기준으로 시작합니다.
                  </p>
                )}
                <section className="cs-panel">
                  <h2>{mode === 'create' ? 'NEW CONTEST' : 'SCHEDULE'}</h2>
                  <label className="cs-field">
                    <span>대회 이름</span>
                    <input
                      value={form.name}
                      maxLength={100}
                      placeholder={`비워 두면 NIMDACON ${form.startDate.slice(0, 4)}`}
                      onChange={(e) => set('name', e.target.value)}
                    />
                  </label>
                  <div className="cs-grid">
                    <label className="cs-field">
                      <span>시작 날짜</span>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => set('startDate', e.target.value)}
                      />
                    </label>
                    <label className="cs-field">
                      <span>시작 시각 (KST)</span>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => set('startTime', e.target.value)}
                      />
                    </label>
                    <label className="cs-field">
                      <span>종료 날짜</span>
                      <input
                        type="date"
                        value={form.endDate}
                        aria-invalid={Boolean(rangeError)}
                        onChange={(e) => set('endDate', e.target.value)}
                      />
                    </label>
                    <label className="cs-field">
                      <span>종료 시각 (KST)</span>
                      <input
                        type="time"
                        value={form.endTime}
                        aria-invalid={Boolean(rangeError)}
                        onChange={(e) => set('endTime', e.target.value)}
                      />
                    </label>
                  </div>
                  {rangeError && (
                    <p className="cs-field__error" role="alert">
                      {rangeError}
                    </p>
                  )}
                  <div className="cs-quick">
                    <span>빠른 조정 (종료 시각)</span>
                    <div>
                      {QUICK_ADJUST.map(([label, minutes]) => (
                        <button key={label} type="button" className="cs-btn" onClick={() => adjustEnd(minutes)}>
                          {label}
                        </button>
                      ))}
                      {mode === 'edit' && (
                        <button
                          type="button"
                          className="cs-btn cs-btn--danger-outline"
                          disabled={phase !== 'RUNNING' || busy}
                          onClick={endNow}
                        >
                          지금 종료
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="cs-hint">
                    {mode === 'create'
                      ? '새 대회는 이전 대회보다 늦게 시작해야 합니다.'
                      : '종료 시각을 지난 시각으로 바꾸면 저장 즉시 대회가 종료됩니다. "지금 종료"는 진행 중일 때만 쓸 수 있습니다.'}
                  </p>
                </section>

                <section className="cs-panel">
                  <h2>AFTER END</h2>
                  <Toggle
                    title="플래그 제출 마감"
                    desc="종료 시각이 지나면 서버가 제출을 거부합니다. 끌 수 없습니다."
                    checked
                    disabled
                  />
                  <Toggle
                    title="문제 목록 계속 공개"
                    desc="끄면 종료 후 참가자는 문제 목록·상세·첨부파일을 볼 수 없습니다."
                    checked={form.visible}
                    onChange={(v) => set('visible', v)}
                  />
                  <Toggle
                    title="실행 중인 인스턴스 정리"
                    desc="종료 시 모든 WEB·PWN 인스턴스를 내립니다. (설정만 저장, 정리 동작은 준비 중)"
                    checked={form.cleanup}
                    onChange={(v) => set('cleanup', v)}
                  />
                  <Toggle
                    title="스코어보드 미리 고정"
                    desc="종료 전에 순위 갱신을 멈춥니다. (설정만 저장, 고정 동작은 준비 중)"
                    checked={form.freeze}
                    onChange={(v) => set('freeze', v)}
                  />
                  <label className={form.freeze ? 'cs-freeze' : 'cs-freeze cs-freeze--off'}>
                    <span>고정 시점</span>
                    <select
                      value={form.freezeMinutes}
                      disabled={!form.freeze}
                      onChange={(e) => set('freezeMinutes', Number(e.target.value))}
                    >
                      {[...new Set([...FREEZE_OPTIONS, form.freezeMinutes])]
                        .sort((a, b) => a - b)
                        .map((m) => (
                          <option key={m} value={m}>
                            종료 {m}분 전
                          </option>
                        ))}
                    </select>
                  </label>
                </section>

                <div className="cs-actions">
                  <button
                    type="button"
                    className="cs-btn"
                    disabled={busy}
                    onClick={() => {
                      setForm(toForm(data, now));
                      setMode('edit');
                    }}
                  >
                    {mode === 'create' ? '취소' : '되돌리기'}
                  </button>
                  <button
                    type="button"
                    className="cs-btn cs-btn--primary"
                    disabled={busy || Boolean(rangeError)}
                    onClick={handleSave}
                  >
                    {busy ? '저장 중...' : mode === 'create' ? '대회 만들기' : '저장'}
                  </button>
                </div>
              </div>

              <aside className="cs-side">
                <section className="cs-panel">
                  <h2>CHANGE LOG</h2>
                  {data.history.length === 0 && <p className="cs-hint">아직 변경 기록이 없습니다.</p>}
                  <ul className="cs-log">
                    {data.history.map((h, i) => (
                      <li key={`${h.changedAt}-${h.field}-${i}`}>
                        <div>
                          <time>{formatDateTime(h.changedAt)}</time>
                          <strong>{h.changedBy ?? (h.field === 'FINALIZED' ? '자동' : '알 수 없음')}</strong>
                        </div>
                        <p>{describeChange(h)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="cs-panel">
                  <h2>ALL CONTESTS</h2>
                  {contests === null && <p className="cs-hint">불러오는 중입니다.</p>}
                  {contests?.length === 0 && <p className="cs-hint">아직 만든 대회가 없습니다.</p>}
                  <ul className="cs-contests">
                    {contests?.map((c) => (
                      <li key={c.id}>
                        <div>
                          <strong>{c.name}</strong>
                          {c.current && <span className="cs-tag">현재</span>}
                        </div>
                        <small>
                          {formatRange(c.startsAt, c.endsAt)} ·{' '}
                          {c.finalizedAt ? (
                            <Link to={`/history/${c.id}`}>결과 확정</Link>
                          ) : (
                            PHASE_LABEL[c.status]
                          )}
                        </small>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="cs-panel">
                  <h2>NOTES</h2>
                  <p className="cs-hint">&gt; 시간은 서버 시계로 판정합니다. 참가자 PC 시계와 상관없습니다.</p>
                  <p className="cs-hint">&gt; 저장하면 참가자 화면의 남은 시간은 최대 5분 안에 갱신됩니다.</p>
                  <p className="cs-hint">&gt; 운영진(관리자·DEV)은 대회 시간과 상관없이 검수 제출을 할 수 있고, 점수는 기록되지 않습니다.</p>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>

      {confirm && (
        <div
          className="cs-overlay"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && !busy && setConfirm(null)}
        >
          <div className="cs-modal" role="dialog" aria-modal="true" aria-label={confirm.title}>
            <h2>{confirm.title}</h2>
            <p>{confirm.message}</p>
            <div className="cs-actions">
              <button type="button" className="cs-btn" disabled={busy} onClick={() => setConfirm(null)}>
                취소
              </button>
              <button
                type="button"
                className="cs-btn cs-btn--danger"
                disabled={busy}
                onClick={() => confirm.run()}
              >
                {confirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default ContestSettingsPage;

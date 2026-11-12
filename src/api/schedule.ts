import { apiRequest } from './client';

export type ContestPhase = 'NOT_SCHEDULED' | 'UPCOMING' | 'RUNNING' | 'ENDED';

/** 시각은 KST 오프셋이 붙은 ISO 문자열이다 (예: 2026-03-21T10:00:00+09:00). 대회가 없으면 null. */
export interface Schedule {
  contestId: number | null;
  name: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: ContestPhase;
  serverTime: string;
}

export interface ScheduleHistory {
  changedAt: string;
  changedBy: string | null;
  /** CREATED, NAME, STARTS_AT, ENDS_AT, CLEANUP_INSTANCES, CHALLENGES_VISIBLE, FREEZE_SCOREBOARD, FREEZE_MINUTES, REOPENED, FINALIZED */
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AdminSchedule extends Schedule {
  /** 최종 결과가 확정돼 이력에 오른 시각. null이면 아직 */
  finalizedAt: string | null;
  closeSubmissionsOnEnd: boolean;
  cleanupInstancesOnEnd: boolean | null;
  challengesVisibleAfterEnd: boolean | null;
  freezeScoreboard: boolean | null;
  freezeMinutesBeforeEnd: number | null;
  history: ScheduleHistory[];
}

export interface ScheduleUpdate {
  /** 비우면 기존 이름(처음이면 "NIMDACON {시작 연도}") */
  name?: string;
  /** KST 로컬 시각 (예: 2026-03-21T10:00:00) */
  startsAt: string;
  endsAt: string;
  cleanupInstancesOnEnd: boolean;
  challengesVisibleAfterEnd: boolean;
  freezeScoreboard: boolean;
  freezeMinutesBeforeEnd: number;
}

export const getSchedule = (signal?: AbortSignal) =>
  apiRequest<Schedule>('/api/ctf/schedule', {
    signal,
    fallback: '대회 일정을 불러오지 못했습니다.',
  });

export const getAdminSchedule = (signal?: AbortSignal) =>
  apiRequest<AdminSchedule>('/api/admin/ctf/schedule', {
    signal,
    fallback: '대회 설정을 불러오지 못했습니다.',
  });

export const updateSchedule = (input: ScheduleUpdate) =>
  apiRequest<AdminSchedule>('/api/admin/ctf/schedule', {
    method: 'PUT',
    json: input,
    fallback: '대회 설정을 저장하지 못했습니다.',
  });

// ---------------------------------------------------------------- 시각 계산

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 서버 시각 기준 ms를 KST 날짜·시각 문자열로 ("2026-03-21", "10:00"). */
export const toKstParts = (ms: number) => {
  const iso = new Date(ms + KST_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16), seconds: iso.slice(11, 19) };
};

/** "2026-03-21" + "10:00" (KST) → ms */
export const fromKstParts = (date: string, time: string) =>
  Date.parse(`${date}T${time}:00+09:00`);

/** ms → "2026-03-21 10:00" (KST) */
export const formatKst = (ms: number) => {
  const { date, time } = toKstParts(ms);
  return `${date} ${time}`;
};

/** 남은 시간. 24시간이 넘으면 "D-2 13:24:08". */
export const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return days > 0 ? `D-${days} ${clock}` : clock;
};

export const phaseAt = (
  now: number,
  startsAt: number | null,
  endsAt: number | null
): ContestPhase => {
  if (startsAt === null || endsAt === null) return 'NOT_SCHEDULED';
  if (now < startsAt) return 'UPCOMING';
  if (now < endsAt) return 'RUNNING';
  return 'ENDED';
};

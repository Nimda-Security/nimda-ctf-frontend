import { useEffect, useState } from 'react';
import {
  formatCountdown,
  getSchedule,
  phaseAt,
  type ContestPhase,
} from '@/api/schedule';

const REFRESH_MS = 5 * 60_000;

export interface ScheduleState {
  loaded: boolean;
  startsAt: number | null;
  endsAt: number | null;
  /** 서버 시계 기준 현재 시각(ms). 1초마다 갱신된다. */
  now: number;
  phase: ContestPhase;
  /** 순위 비공개 시작 시각(ms). 대회 설정에서 껐거나 대회가 없으면 null */
  hiddenFrom: number | null;
  /** 지금 참가자에게 순위가 가려져 있는지 (hiddenFrom ≤ now < endsAt). 1초 안에 바뀐다 */
  rankingHidden: boolean;
}

/**
 * 대회 일정과 서버 기준 현재 시각.
 * 남은 시간은 참가자 PC 시계가 아니라 응답의 serverTime과의 차이로 계산한다.
 */
export const useSchedule = (onUnauthenticated?: () => void): ScheduleState => {
  const [range, setRange] = useState<{
    startsAt: number | null;
    endsAt: number | null;
    hiddenFrom: number | null;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      getSchedule(controller.signal)
        .then((result) => {
          if (result.status === 'unauthenticated') {
            onUnauthenticated?.();
            return;
          }
          if (result.status !== 'ok') return;
          const s = result.data;
          setOffset(Date.parse(s.serverTime) - Date.now());
          setRange({
            startsAt: s.startsAt ? Date.parse(s.startsAt) : null,
            endsAt: s.endsAt ? Date.parse(s.endsAt) : null,
            hiddenFrom: s.scoreboardHiddenFrom ? Date.parse(s.scoreboardHiddenFrom) : null,
          });
        })
        .catch(() => {});
    load();
    // 운영자가 일정을 바꾸면 몇 분 안에 반영되도록 주기적으로 다시 받는다.
    const refresh = window.setInterval(load, REFRESH_MS);
    const tick = window.setInterval(() => setClock(Date.now()), 1000);
    return () => {
      controller.abort();
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
    // onUnauthenticated는 페이지마다 새로 만들어져도 다시 불러올 이유가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = clock + offset;
  const hiddenFrom = range?.hiddenFrom ?? null;
  const endsAt = range?.endsAt ?? null;
  // 경계(시작·종료·비공개 시작)를 넘으면 1초 안에 바뀐다.
  return {
    loaded: range !== null,
    startsAt: range?.startsAt ?? null,
    endsAt,
    now,
    phase: range ? phaseAt(now, range.startsAt, range.endsAt) : 'NOT_SCHEDULED',
    hiddenFrom,
    rankingHidden: hiddenFrom !== null && endsAt !== null && now >= hiddenFrom && now < endsAt,
  };
};

/** "16:00" (KST) */
export const kstClock = (ms: number | null) => {
  if (ms === null) return '-';
  return new Date(ms + 9 * 3600_000).toISOString().slice(11, 16);
};

/** "03/21 12:41" (KST ISO 문자열에서) */
export const kstShort = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const local = new Date(Date.parse(iso) + 9 * 3600_000).toISOString();
  return `${local.slice(5, 10).replace('-', '/')} ${local.slice(11, 16)}`;
};

/** "2분 전", "3시간 전" */
export const ago = (iso: string, now: number) => {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

/** 대시보드 상단 통계의 "대회 남은 시간" 칸 */
export const describeRemaining = ({ loaded, phase, now, startsAt, endsAt }: ScheduleState) => {
  if (!loaded) return { label: '대회 남은 시간', value: '-' };
  if (phase === 'UPCOMING' && startsAt !== null) {
    return { label: '대회 시작까지', value: formatCountdown(startsAt - now) };
  }
  if (phase === 'RUNNING' && endsAt !== null) {
    return { label: '대회 남은 시간', value: formatCountdown(endsAt - now) };
  }
  if (phase === 'ENDED') return { label: '대회 남은 시간', value: '종료' };
  return { label: '대회 남은 시간', value: '일정 미정' };
};

/** 운영진(관리자·DEV)이 아닌 참가자가 지금 제출할 수 없으면 그 이유 */
export const submissionBlockedReason = (phase: ContestPhase) => {
  if (phase === 'UPCOMING') return '대회가 아직 시작되지 않았습니다.';
  if (phase === 'ENDED') return '대회가 종료되어 제출할 수 없습니다.';
  return null;
};

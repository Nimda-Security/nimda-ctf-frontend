import { apiRequest } from './client';
import type { AdminSchedule, ContestPhase, ScheduleUpdate } from './schedule';

// ---------------------------------------------------------------- 대회 이력 (로그인 사용자)

export interface CurrentContest {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  status: ContestPhase;
  teamCount: number;
}

export interface EndedContest {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  teamCount: number;
  participantCount: number;
  challengeCount: number;
  /** 점수를 얻은 팀이 없으면 null */
  winner: { teamId: number; teamName: string; totalScore: number } | null;
  /** 참가하지 않았으면 null. rank는 점수가 0이었으면 null */
  myResult: { rank: number | null; teamId: number; teamName: string; totalScore: number } | null;
}

export interface ContestList {
  /** 결과가 아직 확정되지 않은 현재 대회. 없으면 null */
  current: CurrentContest | null;
  ended: EndedContest[];
}

export interface Standing {
  /** 점수가 0인 팀은 null */
  rank: number | null;
  teamId: number;
  teamName: string;
  memberCount: number;
  solveCount: number;
  totalScore: number;
  lastSolvedAt: string | null;
}

export interface ChallengeResult {
  challengeId: number;
  code: string;
  title: string;
  category: string;
  maxPoint: number;
  /** 종료 시점 배점 */
  finalPoint: number;
  solvedTeams: number;
  firstBloodTeamName: string | null;
  firstBloodAt: string | null;
}

export interface ContestDetail {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  finalizedAt: string;
  stats: { teamCount: number; participantCount: number; challengeCount: number; totalSolves: number };
  standings: Standing[];
  challenges: ChallengeResult[];
  /** 참가하지 않은 대회면 null */
  myTeam: {
    teamId: number;
    teamName: string;
    rank: number | null;
    totalTeams: number;
    totalScore: number;
    solveCount: number;
    members: { userId: number; nickname: string; role: 'LEADER' | 'MEMBER'; solveCount: number; points: number }[];
  } | null;
}

export const getContests = (
  participated: boolean,
  sort: 'latest' | 'oldest',
  signal?: AbortSignal
) =>
  apiRequest<ContestList>(`/api/ctf/contests?participated=${participated}&sort=${sort}`, {
    signal,
    fallback: '대회 이력을 불러오지 못했습니다.',
  });

/** 결과가 확정되지 않은 대회는 404 */
export const getContest = (id: string, signal?: AbortSignal) =>
  apiRequest<ContestDetail>(`/api/ctf/contests/${encodeURIComponent(id)}`, {
    signal,
    fallback: '대회 결과를 불러오지 못했습니다.',
  });

// ---------------------------------------------------------------- 운영자 대회 관리 (ADMIN)

export interface AdminContest {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  status: ContestPhase;
  /** 있으면 이력에 오른 대회 */
  finalizedAt: string | null;
  current: boolean;
}

export const getAdminContests = (signal?: AbortSignal) =>
  apiRequest<AdminContest[]>('/api/admin/ctf/contests', {
    signal,
    fallback: '대회 목록을 불러오지 못했습니다.',
  });

/** 새 대회. 이전 대회 결과가 확정된 뒤에만 만들 수 있다 (아니면 409). */
export const createContest = (input: ScheduleUpdate) =>
  apiRequest<AdminSchedule>('/api/admin/ctf/contests', {
    method: 'POST',
    json: input,
    fallback: '대회를 만들지 못했습니다.',
  });

/** 종료된 대회의 결과를 지금 확정한다. 이미 확정됐으면 다시 만든다. */
export const finalizeContest = (id: number) =>
  apiRequest<void>(`/api/admin/ctf/contests/${id}/finalize`, {
    method: 'POST',
    fallback: '대회 결과를 확정하지 못했습니다.',
  });

/** "2026-03-21T10:00:00+09:00" → "2026.03.21" */
export const formatDate = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).replaceAll('-', '.') : '-';

/** "2026-03-21T10:00:00+09:00" → "2026.03.21 10:00" */
export const formatDateMinute = (iso: string | null | undefined) =>
  iso ? `${formatDate(iso)} ${iso.slice(11, 16)}` : '-';

/** 같은 날이면 한 번만: "2025.03.22 ~ 03.23" */
export const formatRange = (startsAt: string, endsAt: string) => {
  const s = formatDate(startsAt);
  const e = formatDate(endsAt);
  if (s === e) return s;
  return s.slice(0, 4) === e.slice(0, 4) ? `${s} ~ ${e.slice(5)}` : `${s} ~ ${e}`;
};

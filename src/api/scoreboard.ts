import { apiRequest } from './client';

export type MemberRole = 'LEADER' | 'MEMBER';

export interface ScoreboardEntry {
  rank: number;
  teamId: number;
  teamName: string;
  memberCount: number;
  totalScore: number;
  solveCount: number;
  lastSolvedAt: string | null;
}

export interface ScoreboardPage {
  entries: ScoreboardEntry[];
  page: number;
  size: number;
  /** 점수가 있어 순위에 오른 팀 수 */
  rankedTeams: number;
  totalPages: number;
  /** 전체 팀 수. 점수 0인 팀은 순위에 없다 */
  totalTeams: number;
}

export interface Contribution {
  userId: number;
  nickname: string;
  role: MemberRole;
  solveCount: number;
  points: number;
}

export interface RecentSolve {
  solvedAt: string;
  nickname: string;
  challengeCode: string;
  challengeTitle: string;
  points: number;
}

export interface MyTeamScore {
  teamId: number;
  teamName: string;
  /** 아직 점수가 없으면 null */
  rank: number | null;
  totalTeams: number;
  totalScore: number;
  solveCount: number;
  memberCount: number;
  lastSolvedAt: string | null;
  members: Contribution[];
  recentSolves: RecentSolve[];
}

/**
 * 순위 비공개 중 참가자에게 오는 응답 (두 경로 공통). 점수·순위·팀 정보가 하나도 없다.
 * 대회 설정에서 켜면 종료 N분 전(hiddenFrom)부터 종료(revealAt)까지. ADMIN·DEV 는 받지 않는다.
 */
export interface ScoreboardHidden {
  hidden: true;
  hiddenFrom: string;
  revealAt: string;
}

export const isHidden = (data: unknown): data is ScoreboardHidden =>
  typeof data === 'object' && data !== null && (data as { hidden?: unknown }).hidden === true;

/** 점수가 있는 팀의 순위. page는 0부터. 순위 비공개 중이면 ScoreboardHidden. */
export const getScoreboard = (page: number, size: number, signal?: AbortSignal) =>
  apiRequest<ScoreboardPage | ScoreboardHidden>(`/api/ctf/scoreboard?page=${page}&size=${size}`, {
    signal,
    fallback: '스코어보드를 불러오지 못했습니다.',
  });

/** 내 팀 점수. 팀이 없으면 team이 null이다. 순위 비공개 중이면 ScoreboardHidden. */
export const getMyTeamScore = (signal?: AbortSignal) =>
  apiRequest<{ team: MyTeamScore | null } | ScoreboardHidden>('/api/ctf/scoreboard/me', {
    signal,
    fallback: '내 팀 점수를 불러오지 못했습니다.',
  });

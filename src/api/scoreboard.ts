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

/** 점수가 있는 팀의 순위. page는 0부터. */
export const getScoreboard = (page: number, size: number, signal?: AbortSignal) =>
  apiRequest<ScoreboardPage>(`/api/ctf/scoreboard?page=${page}&size=${size}`, {
    signal,
    fallback: '스코어보드를 불러오지 못했습니다.',
  });

/** 내 팀 점수. 팀이 없으면 team이 null이다. */
export const getMyTeamScore = (signal?: AbortSignal) =>
  apiRequest<{ team: MyTeamScore | null }>('/api/ctf/scoreboard/me', {
    signal,
    fallback: '내 팀 점수를 불러오지 못했습니다.',
  });

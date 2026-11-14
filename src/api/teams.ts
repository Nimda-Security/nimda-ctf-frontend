import { apiRequest } from './client';
import type { MemberRole } from './scoreboard';

export interface TeamMember {
  /** users.id. API에서 유저를 가리킬 때 쓴다. */
  userId: number;
  /** 로그인 아이디. 닉네임 옆에 보여준다. */
  loginId: string;
  nickname: string;
  studentNum: string | null;
  role: MemberRole;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  memberCount: number;
  members: TeamMember[];
}

export interface UnassignedUser {
  userId: number;
  loginId: string;
  nickname: string;
  studentNum: string | null;
}

export interface TeamInput {
  name: string;
  capacity: number;
  description?: string;
}

const BASE = '/api/admin/ctf/teams';

// ---------------------------------------------------------------- 운영자 (ADMIN)

export const getTeams = (signal?: AbortSignal) =>
  apiRequest<Team[]>(BASE, { signal, fallback: '팀 목록을 불러오지 못했습니다.' });

export const getUnassignedUsers = (keyword: string, signal?: AbortSignal) =>
  apiRequest<UnassignedUser[]>(
    `${BASE}/unassigned${keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : ''}`,
    { signal, fallback: '미배정 참가자를 불러오지 못했습니다.' }
  );

export const createTeam = (
  input: TeamInput & { leaderUserId?: number; memberUserIds?: number[] }
) => apiRequest<Team>(BASE, { method: 'POST', json: input, fallback: '팀을 만들지 못했습니다.' });

export const updateTeam = (teamId: number, input: TeamInput) =>
  apiRequest<Team>(`${BASE}/${teamId}`, {
    method: 'PATCH',
    json: input,
    fallback: '팀을 수정하지 못했습니다.',
  });

export const deleteTeam = (teamId: number) =>
  apiRequest<void>(`${BASE}/${teamId}`, {
    method: 'DELETE',
    fallback: '팀을 삭제하지 못했습니다.',
  });

export const addTeamMembers = (teamId: number, userIds: number[]) =>
  apiRequest<Team>(`${BASE}/${teamId}/members`, {
    method: 'POST',
    json: { userIds },
    fallback: '참가자를 배정하지 못했습니다.',
  });

export const removeTeamMember = (teamId: number, userId: number) =>
  apiRequest<Team>(`${BASE}/${teamId}/members/${userId}`, {
    method: 'DELETE',
    fallback: '멤버를 제거하지 못했습니다.',
  });

export const changeTeamLeader = (teamId: number, userId: number) =>
  apiRequest<Team>(`${BASE}/${teamId}/leader`, {
    method: 'PATCH',
    json: { userId },
    fallback: '팀장을 바꾸지 못했습니다.',
  });

// ---------------------------------------------------------------- 참가자

/** 현재 대회에서 내가 속한 팀. 팀이 없으면 team이 null이다. */
export const getMyTeam = (signal?: AbortSignal) =>
  apiRequest<{ team: Team | null }>('/api/ctf/teams/me', {
    signal,
    fallback: '내 팀 정보를 불러오지 못했습니다.',
  });

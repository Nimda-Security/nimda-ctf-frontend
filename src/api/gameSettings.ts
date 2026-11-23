import { apiRequest } from './client';

/**
 * CTF 게임(game.nimda.kr) 설정. 백엔드 nimda-web-backend 의 docs/api/CTF 게임 설정 API.md.
 * 지금은 Stage2 시간 개방 하나: 대회 시작 후 N분이 지나면 기념품을 다 모으지 못한 팀에게도 Stage2 문을 연다 (아이템·점수는 주지 않음).
 * CTF_GAME_ENABLED=false 거나 백엔드가 아직 이 API 를 모르면 404.
 */
export interface GameSettings {
  /** 대회 시작 후 몇 분 뒤 여는지. null 이면 시간 개방 없음 */
  stage2OpenMinutes: number | null;
  /** 여는 시각 = 현재 대회 시작 + 분 (KST). 시간 개방이 없거나 대회가 없으면 null */
  stage2OpenAt: string | null;
  /** 지금 열린 상태인지 (서버 시계) */
  stage2Open: boolean;
  serverTime: string;
  /** 마지막으로 바꾼 때 (관리 응답에만) */
  updatedAt: string | null;
}

/** 서버가 받는 범위 (분) */
export const STAGE2_MINUTES_MIN = 1;
export const STAGE2_MINUTES_MAX = 1440;

export const getAdminGameSettings = (signal?: AbortSignal) =>
  apiRequest<GameSettings>('/api/ctf/game/admin/settings', {
    signal,
    fallback: '게임 설정을 불러오지 못했습니다.',
  });

/** stage2OpenMinutes 가 null 이면 시간 개방을 끈다 */
export const updateGameSettings = (stage2OpenMinutes: number | null) =>
  apiRequest<GameSettings>('/api/ctf/game/admin/settings', {
    method: 'PUT',
    json: { stage2OpenMinutes },
    fallback: '게임 설정을 저장하지 못했습니다.',
  });

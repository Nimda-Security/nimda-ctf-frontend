/**
 * CTF 게임 주소. 문제는 게임 맵 안에서 찾고 게임 안 문제 창에서 제출한다 (게임 모드).
 * 로컬에서 다른 게임 서버를 보려면 VITE_GAME_URL 로 바꾼다 (예: http://localhost:8080).
 */
export const GAME_URL: string = import.meta.env.VITE_GAME_URL || 'https://game.nimda.kr';

/**
 * 게임 맵 오브젝트 목록 (key·hint). 문제 관리 화면에서 물건을 연결할 때 쓴다.
 * 게임 저장소의 정적 파일 client/ctf/objects.json. 운영 nginx 가 https://ctf.nimda.kr 에만 CORS 를 연다.
 */
export const GAME_OBJECTS_URL = `${GAME_URL}/ctf/objects.json`;

/** 게임 구역 번호 → 이름 (게임 저장소 town.cpp buildStages) */
export const ZONE_NAMES: Record<number, string> = {
  0: '동방 로비',
  1: 'Stage1',
  2: 'Stage2',
};

export const zoneName = (zone: number) => ZONE_NAMES[zone] ?? `구역 ${zone}`;

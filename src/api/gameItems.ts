import { GAME_OBJECTS_URL } from '@/constants/game';
import { addVersionToHeaders } from '@/constants/version';
import { apiRequest } from './client';

/**
 * CTF 게임(game.nimda.kr) 물건. 백엔드 nimda-web-backend 의 docs/api/CTF 게임 물건 API.md, CTF 게임 물건 연결 API.md.
 * 물건은 게임 맵 위에 있고(위치는 게임 쪽), 여기서는 문제와의 연결·이야기만 다룬다.
 */
export interface GameItem {
  /** 게임 맵 오브젝트의 key */
  key: string;
  name: string;
  sortOrder: number;
  /** 연결 문제 코드. 문제가 없거나 공개 전이면 null */
  challengeCode: string | null;
  challengeTitle: string | null;
  /** 우리 팀이 연결 문제를 풀었는지 */
  owned: boolean;
  /** 이야기. owned 일 때만 값이 있다 */
  description: string | null;
}

/**
 * 게임 물건 목록 (참가자). 문제 상세(G02)에서 "획득한 아이템" 이야기를 보여 줄 때 쓴다.
 * 게임 역할(CTF_USER·CTF_MASTER·ADMIN·DEV)이 없으면 403 이므로, 실패해도 상세는 그대로 보여 준다.
 */
export const getGameItems = (signal?: AbortSignal) =>
  apiRequest<GameItem[]>('/api/ctf/game/items', {
    signal,
    fallback: '게임 아이템을 불러오지 못했습니다.',
  });

export interface LinkedItem {
  id: number;
  key: string;
  name: string;
  visible: boolean;
}

export interface GameItemLinks {
  /** 모든 문제(초안 포함)와 연결된 물건. 연결이 없으면 items 가 빈 목록 */
  links: { challengeCode: string; items: LinkedItem[] }[];
  /** 어느 문제에도 연결되지 않은 물건 (게임에서는 장식) */
  unlinkedItems: LinkedItem[];
}

/** 문제별 연결된 물건 (ADMIN·DEV, 문제 관리 표의 "게임 물건 key" 칸) */
export const getGameItemLinks = (signal?: AbortSignal) =>
  apiRequest<GameItemLinks>('/api/ctf/game/admin/links', {
    signal,
    fallback: '게임 물건 연결을 불러오지 못했습니다.',
  });

// ---------------------------------------------------------------- 문제 쪽 연결 (CTF 게임 물건 연결 API.md 2-2 ~ 2-4)

/** 물건 관리 응답 (AdminGameItemResponse) */
export interface AdminGameItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  challengeCode: string | null;
  challengeTitle: string | null;
  sortOrder: number;
  visible: boolean;
  updatedAt: string;
}

/** 물건 key 형식 (백엔드와 같다) */
export const ITEM_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,49}$/;

const path = (code: string, key?: string) =>
  `/api/ctf/game/admin/challenges/${encodeURIComponent(code)}/items${
    key === undefined ? '' : `/${encodeURIComponent(key)}`
  }`;

/** 한 문제에 연결된 물건들 (연결 패널 위쪽) */
export const getChallengeItems = (code: string, signal?: AbortSignal) =>
  apiRequest<AdminGameItem[]>(path(code), {
    signal,
    fallback: '연결된 물건을 불러오지 못했습니다.',
  });

export interface LinkItemRequest {
  /** 물건이 없어 새로 만들 때 필수. 비우면 그대로 */
  name?: string;
  /** 비우면 그대로 */
  description?: string;
  visible?: boolean;
  sortOrder?: number;
  /** true 면 다른 문제에 연결된 물건도 이 문제로 옮긴다. 아니면 409 */
  moveFromOtherChallenge?: boolean;
}

export type LinkItemResult =
  | { status: 'ok'; item: AdminGameItem; created: boolean }
  /** 409: 이미 다른 문제(challengeCode)에 연결된 물건 */
  | { status: 'conflict'; challengeCode: string | null; message: string }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

const LINK_ERROR = '물건을 연결하지 못했습니다.';

/**
 * key 의 물건을 이 문제에 연결한다 (없으면 만든다: 201).
 * 409 의 data.challengeCode(지금 연결된 문제)가 필요해서 공용 apiRequest 대신 직접 부른다.
 */
export const linkItem = async (
  code: string,
  key: string,
  body: LinkItemRequest
): Promise<LinkItemResult> => {
  try {
    const response = await fetch(path(code, key), {
      method: 'PUT',
      headers: addVersionToHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401 || (response.status === 403 && result?.success === undefined)) {
      return { status: 'unauthenticated' };
    }
    if (response.status === 409) {
      return {
        status: 'conflict',
        challengeCode: result?.data?.challengeCode ?? null,
        message: result?.message || '이미 다른 문제에 연결된 물건입니다.',
      };
    }
    if (!response.ok || result?.success === false || !result?.data) {
      return { status: 'error', message: result?.message || LINK_ERROR };
    }
    return { status: 'ok', item: result.data, created: response.status === 201 };
  } catch {
    return { status: 'error', message: LINK_ERROR };
  }
};

/** 연결 해제. 물건은 남고(challengeCode: null) 게임에서는 장식이 된다 */
export const unlinkItem = (code: string, key: string) =>
  apiRequest<AdminGameItem>(path(code, key), {
    method: 'DELETE',
    fallback: '연결을 해제하지 못했습니다.',
  });

// ---------------------------------------------------------------- 맵 오브젝트 (게임 저장소 objects.json)

/** 게임 맵 위의 물건 자리 (게임 저장소 docs/MAP_OBJECTS.md 1장). 정보는 없고 디자인만 있다 */
export interface GameObject {
  key: string;
  zone: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  sprite?: string;
  /** 사람이 연결할 때 보는 설명 (어디에 있는 무엇인지) */
  hint?: string;
}

/**
 * 게임에서 맵 오브젝트 목록을 받는다. 백엔드는 맵을 모른다 (D12).
 * 게임이 꺼져 있거나 CORS 로 막히면(로컬 개발 등) 실패 → 화면은 key 직접 입력으로 바꾼다.
 */
export const getGameObjects = async (signal?: AbortSignal): Promise<GameObject[] | null> => {
  try {
    const response = await fetch(GAME_OBJECTS_URL, { signal, cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    if (!Array.isArray(body?.objects)) return null;
    return (body.objects as GameObject[]).filter(
      (o) => typeof o?.key === 'string' && Number.isFinite(o?.zone)
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
};

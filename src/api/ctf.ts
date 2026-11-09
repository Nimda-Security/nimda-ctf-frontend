import { addVersionToHeaders } from '@/constants/version';

export const CATEGORIES = [
  'WEB',
  'PWN',
  'REVERSING',
  'FORENSICS',
  'CRYPTO',
  'MISC',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Challenge {
  id: number;
  code: string;
  title: string;
  category: Category;
  points: number;
  isolationType: 'NONE' | 'SHARED' | 'PER_USER';
  hasAttachment: boolean;
  isPublic: boolean;
}

export type ChallengesResult =
  | { status: 'ok'; challenges: Challenge[] }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

export interface ChallengeDetail extends Challenge {
  description: string;
  flagType: 'STATIC' | 'DYNAMIC';
}

export type ChallengeDetailResult =
  | { status: 'ok'; challenge: ChallengeDetail }
  | { status: 'not-found' }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

const DETAIL_ERROR_MESSAGE = '문제를 불러오지 못했습니다.';

export const getChallenge = async (
  code: string,
  signal?: AbortSignal
): Promise<ChallengeDetailResult> => {
  try {
    const response = await fetch(
      `/api/ctf/challenges/${encodeURIComponent(code)}`,
      {
        headers: addVersionToHeaders(),
        credentials: 'include',
        signal,
      }
    );

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthenticated' };
    }
    if (response.status === 404) return { status: 'not-found' };

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.data) {
      return {
        status: 'error',
        message: result?.message || DETAIL_ERROR_MESSAGE,
      };
    }
    return { status: 'ok', challenge: result.data };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: DETAIL_ERROR_MESSAGE };
  }
};

export type CreateChallengeResult =
  | { status: 'ok'; id: number }
  | { status: 'duplicate'; message: string }
  | { status: 'error'; message: string };

export const createChallenge = async (
  form: FormData
): Promise<CreateChallengeResult> => {
  try {
    // Content-Type은 브라우저가 multipart 경계값과 함께 넣도록 지정하지 않는다.
    const response = await fetch('/api/ctf/challenge', {
      method: 'POST',
      headers: addVersionToHeaders(),
      credentials: 'include',
      body: form,
    });

    const result = await response.json().catch(() => null);
    if (response.ok) return { status: 'ok', id: result?.data };
    if (response.status === 409) {
      return {
        status: 'duplicate',
        message: result?.message || '이미 존재하는 문제 코드입니다.',
      };
    }
    if (response.status === 401 || response.status === 403) {
      return { status: 'error', message: '문제를 등록할 권한이 없습니다.' };
    }
    if (response.status === 413) {
      return { status: 'error', message: '파일이 너무 큽니다. (최대 10MB)' };
    }
    return {
      status: 'error',
      message:
        result?.message || `문제 등록에 실패했습니다. (${response.status})`,
    };
  } catch {
    return { status: 'error', message: '서버에 연결할 수 없습니다.' };
  }
};

const LOAD_ERROR_MESSAGE = '문제 목록을 불러오지 못했습니다.';

export const getChallenges = async (
  signal?: AbortSignal
): Promise<ChallengesResult> => {
  try {
    const response = await fetch('/api/ctf/challenges', {
      headers: addVersionToHeaders(),
      credentials: 'include',
      signal,
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthenticated' };
    }

    const result = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(result?.data)) {
      return { status: 'error', message: result?.message || LOAD_ERROR_MESSAGE };
    }
    return { status: 'ok', challenges: result.data };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: LOAD_ERROR_MESSAGE };
  }
};

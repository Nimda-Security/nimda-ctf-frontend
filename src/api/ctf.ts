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
  /** 지금 풀면 받는 점수. 해결자가 늘면 decreasePoint씩 줄고 minPoint 밑으로는 안 내려간다. */
  points: number;
  maxPoint: number;
  minPoint: number;
  decreasePoint: number;
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

export type VerdictStatus = 'CORRECT' | 'WRONG' | 'ALREADY_SOLVED';

export type SubmitFlagResult =
  | { status: 'judged'; verdict: VerdictStatus; awardedPoints: number }
  // 서버가 3초 안에 채점하지 못했다. submissionId로 getSubmission을 폴링한다.
  | { status: 'pending'; submissionId: string }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

const SUBMIT_ERROR_MESSAGE = '플래그를 제출하지 못했습니다.';

const parseSubmission = async (
  response: Response,
  fallbackMessage: string
): Promise<SubmitFlagResult> => {
  const result = await response.json().catch(() => null);

  // Spring Security가 막은 경우(비로그인)는 공통 응답 형식이 아니다.
  if (response.status === 403 && result?.success === undefined) {
    return { status: 'unauthenticated' };
  }
  if (!response.ok || !result?.data) {
    return { status: 'error', message: result?.message || fallbackMessage };
  }

  const data = result.data;
  if (data.status === 'PENDING') {
    return { status: 'pending', submissionId: data.submissionId };
  }
  return {
    status: 'judged',
    verdict: data.status,
    awardedPoints: data.awardedPoints ?? 0,
  };
};

/** 플래그 제출. 경로는 code가 아니라 문제 id를 쓴다. */
export const submitFlag = async (
  challengeId: number,
  flag: string,
  signal?: AbortSignal
): Promise<SubmitFlagResult> => {
  try {
    const response = await fetch(`/api/ctf/challenge/${challengeId}`, {
      method: 'POST',
      headers: addVersionToHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ flag }),
      signal,
    });
    if (response.status === 429) {
      const result = await response.json().catch(() => null);
      return {
        status: 'error',
        message:
          result?.message || '제출이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      };
    }
    return await parseSubmission(response, SUBMIT_ERROR_MESSAGE);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: SUBMIT_ERROR_MESSAGE };
  }
};

/** 202를 받은 제출의 채점 결과. 아직이면 pending. */
export const getSubmission = async (
  submissionId: string,
  signal?: AbortSignal
): Promise<SubmitFlagResult> => {
  try {
    const response = await fetch(
      `/api/ctf/challenge/submission/${encodeURIComponent(submissionId)}`,
      {
        headers: addVersionToHeaders(),
        credentials: 'include',
        signal,
      }
    );
    return await parseSubmission(response, '채점 결과를 불러오지 못했습니다.');
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: '채점 결과를 불러오지 못했습니다.' };
  }
};

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
  // 팀전이라 팀이 없는 참가자에게는 문제를 보여주지 않는다 (공통 형식 403).
  | { status: 'no-team'; message: string }
  // 대회가 끝났고 운영자가 종료 후 문제 공개를 껐다 (공통 형식 403).
  | { status: 'closed'; message: string }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

export const NO_TEAM_MESSAGE =
  '팀에 소속되어 있지 않습니다. 운영진이 팀을 배정하면 문제가 공개됩니다.';

/**
 * 403은 세 가지다. 로그인이 풀린 경우는 Spring Security 기본 형식(success 없음),
 * 팀이 없거나 대회가 끝나 문제를 닫은 경우는 공통 형식(success: false, message)이다.
 * 둘은 상태 코드가 같아서 메시지로 구분한다.
 */
const classify403 = (result: { success?: boolean; message?: string } | null) => {
  if (result?.success !== false) return { status: 'unauthenticated' } as const;
  const message = result.message || NO_TEAM_MESSAGE;
  return message.startsWith('팀에 소속되어 있지 않습니다')
    ? ({ status: 'no-team', message } as const)
    : ({ status: 'closed', message } as const);
};

export interface ChallengeDetail extends Challenge {
  description: string;
  flagType: 'STATIC' | 'DYNAMIC';
}

export type ChallengeDetailResult =
  | { status: 'ok'; challenge: ChallengeDetail }
  | { status: 'not-found' }
  | { status: 'no-team'; message: string }
  | { status: 'closed'; message: string }
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

    const result = await response.json().catch(() => null);
    if (response.status === 401) return { status: 'unauthenticated' };
    if (response.status === 403) return classify403(result);
    if (response.status === 404) return { status: 'not-found' };

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

    const result = await response.json().catch(() => null);
    if (response.status === 401) return { status: 'unauthenticated' };
    if (response.status === 403) return classify403(result);

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

// ---------------------------------------------------------------- 인스턴스

export const SERVER_DOWN_MESSAGE = 'CTF 서버가 아직 작동중이지 않습니다.';

export type ServerStatusResult =
  | { status: 'ok'; available: boolean }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

/**
 * CTF 서버가 인스턴스 요청을 받을 수 있는지.
 * CTF 서버가 10초마다 갱신하는 신호를 보므로, 꺼진 뒤 최대 30초 늦게 반영된다.
 */
export const getServerStatus = async (
  signal?: AbortSignal
): Promise<ServerStatusResult> => {
  try {
    const response = await fetch('/api/ctf/server-status', {
      headers: addVersionToHeaders(),
      credentials: 'include',
      signal,
    });
    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthenticated' };
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.data?.available !== 'boolean') {
      return { status: 'error', message: 'CTF 서버 상태를 확인하지 못했습니다.' };
    }
    return { status: 'ok', available: result.data.available };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: 'CTF 서버 상태를 확인하지 못했습니다.' };
  }
};

export type InstanceStatus = 'PENDING' | 'READY' | 'FAILED' | 'EXPIRED';

export interface InstanceView {
  uuid: string;
  status: InstanceStatus;
  /** READY인 WEB 문제. 새 탭으로 연다. */
  accessUrl?: string;
  /** READY인 PWN 문제. nc host port로 붙는다. */
  host?: string;
  port?: number;
  /** READY일 때 만료 시각(UTC). */
  expiresAt?: string;
  /** FAILED일 때 사유. */
  message?: string;
}

export type InstanceResult =
  // instance가 null이면 아직 시작한 적 없다.
  | { status: 'ok'; instance: InstanceView | null }
  // CTF 서버가 꺼져 있어서 시작 요청을 거절했다 (503).
  | { status: 'unavailable'; message: string }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

const parseInstance = async (
  response: Response,
  fallbackMessage: string
): Promise<InstanceResult> => {
  const result = await response.json().catch(() => null);

  // Spring Security가 막은 경우(비로그인)는 공통 응답 형식이 아니다.
  // "본인 인스턴스가 아닙니다" 같은 403은 공통 형식이라 에러로 보여준다.
  if (
    response.status === 401 ||
    (response.status === 403 && result?.success === undefined)
  ) {
    return { status: 'unauthenticated' };
  }
  if (response.status === 503) {
    return {
      status: 'unavailable',
      message: result?.message || SERVER_DOWN_MESSAGE,
    };
  }
  if (!response.ok || !result?.data) {
    return { status: 'error', message: result?.message || fallbackMessage };
  }
  if (result.data.hasInstance === false) {
    return { status: 'ok', instance: null };
  }
  return { status: 'ok', instance: result.data };
};

const instanceRequest = async (
  url: string,
  init: RequestInit,
  fallbackMessage: string,
  signal?: AbortSignal
): Promise<InstanceResult> => {
  try {
    const response = await fetch(url, {
      ...init,
      headers: addVersionToHeaders(),
      credentials: 'include',
      signal,
    });
    return await parseInstance(response, fallbackMessage);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: fallbackMessage };
  }
};

/** 이 문제로 내가 띄운 인스턴스. 페이지에 들어올 때 부른다. */
export const getMyInstance = (code: string, signal?: AbortSignal) =>
  instanceRequest(
    `/api/ctf/instance/${encodeURIComponent(code)}`,
    {},
    '인스턴스 정보를 불러오지 못했습니다.',
    signal
  );

/** 인스턴스 시작. 이미 만들고 있거나 떠 있으면 같은 인스턴스를 돌려준다. */
export const startInstance = (code: string, signal?: AbortSignal) =>
  instanceRequest(
    `/api/ctf/instance/${encodeURIComponent(code)}`,
    { method: 'POST' },
    '인스턴스를 시작하지 못했습니다.',
    signal
  );

/** 시작 직후 PENDING인 동안 폴링한다. */
export const getInstanceStatus = (uuid: string, signal?: AbortSignal) =>
  instanceRequest(
    `/api/ctf/instance/status/${encodeURIComponent(uuid)}`,
    {},
    '인스턴스 상태를 불러오지 못했습니다.',
    signal
  );

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

export type DownloadResult =
  // 링크 발급 완료. expiresAt이 비어 있으면 만료 시각을 모른다.
  | { status: 'ready'; url: string; expiresAt: string | null }
  // 3초 안에 발급되지 않았다. requestId로 getDownloadStatus를 폴링한다.
  | { status: 'pending'; requestId: string }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

const DOWNLOAD_ERROR_MESSAGE = '다운로드 링크를 받지 못했습니다.';

const parseDownload = async (response: Response): Promise<DownloadResult> => {
  const result = await response.json().catch(() => null);

  // Spring Security가 막은 경우(비로그인)는 공통 응답 형식이 아니다.
  if (
    response.status === 401 ||
    (response.status === 403 && result?.success === undefined)
  ) {
    return { status: 'unauthenticated' };
  }
  // 503은 CTF 서버가 준 발급 실패 사유를 message로 담아 온다.
  if (!response.ok || !result?.data) {
    return { status: 'error', message: result?.message || DOWNLOAD_ERROR_MESSAGE };
  }

  const data = result.data;
  if (data.status === 'PENDING') {
    return { status: 'pending', requestId: data.requestId };
  }
  if (data.status === 'READY' && data.url) {
    return { status: 'ready', url: data.url, expiresAt: data.expiresAt || null };
  }
  return { status: 'error', message: DOWNLOAD_ERROR_MESSAGE };
};

const downloadRequest = async (
  url: string,
  init: RequestInit,
  signal?: AbortSignal
): Promise<DownloadResult> => {
  try {
    const response = await fetch(url, {
      ...init,
      headers: addVersionToHeaders(),
      credentials: 'include',
      signal,
    });
    return await parseDownload(response);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', message: DOWNLOAD_ERROR_MESSAGE };
  }
};

/** 첨부파일 다운로드 링크 요청. 같은 문제는 서버가 캐시한 링크를 돌려준다. */
export const requestDownload = (code: string, signal?: AbortSignal) =>
  downloadRequest(
    `/api/ctf/challenge/${encodeURIComponent(code)}/download`,
    { method: 'POST' },
    signal
  );

/** 202를 받은 다운로드 요청의 발급 결과. 아직이면 pending. */
export const getDownloadStatus = (requestId: string, signal?: AbortSignal) =>
  downloadRequest(
    `/api/ctf/challenge/download/${encodeURIComponent(requestId)}`,
    {},
    signal
  );

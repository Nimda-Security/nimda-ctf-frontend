import { addVersionToHeaders } from '@/constants/version';

export type ApiResult<T> =
  | { status: 'ok'; data: T }
  // 로그인이 풀렸다 (Spring Security가 막은 403/401은 공통 응답 형식이 아니다).
  | { status: 'unauthenticated' }
  | { status: 'error'; code: number; message: string };

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  json?: unknown;
  signal?: AbortSignal;
  fallback: string;
}

/** 공통 응답 형식({success, message, data})을 쓰는 API 호출. */
export const apiRequest = async <T>(
  path: string,
  { method = 'GET', json, signal, fallback }: RequestOptions
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(path, {
      method,
      headers: addVersionToHeaders(
        json === undefined ? {} : { 'Content-Type': 'application/json' }
      ),
      credentials: 'include',
      body: json === undefined ? undefined : JSON.stringify(json),
      signal,
    });
    const body = await response.json().catch(() => null);

    if (
      response.status === 401 ||
      (response.status === 403 && body?.success === undefined)
    ) {
      return { status: 'unauthenticated' };
    }
    if (!response.ok || body?.success === false) {
      return {
        status: 'error',
        code: response.status,
        message: body?.message || fallback,
      };
    }
    return { status: 'ok', data: body?.data as T };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { status: 'error', code: 0, message: fallback };
  }
};

/** 서버의 LocalDateTime("2026-03-21T15:42:10.123")을 "03/21 15:42:10"으로. */
export const formatDateTime = (value: string | null | undefined) =>
  value ? `${value.slice(5, 10).replace('-', '/')} ${value.slice(11, 19)}` : '-';

/** "15:42" */
export const formatTime = (value: string | null | undefined) =>
  value ? value.slice(11, 16) : '-';

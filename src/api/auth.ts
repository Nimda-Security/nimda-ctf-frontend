import { addVersionToHeaders } from '@/constants/version';

const API_BASE_URL = '/api';

export interface CurrentUser {
  nickname: string;
  profileImage?: string | null;
  roles?: string[];
}

export const canCreateChallenge = (user: CurrentUser): boolean =>
  Boolean(
    user.roles?.includes('ROLE_DEV') || user.roles?.includes('ROLE_ADMIN')
  );

/** 팀 빌딩은 백엔드가 ADMIN에게만 연다. */
export const canManageTeams = (user: CurrentUser): boolean =>
  Boolean(user.roles?.includes('ROLE_ADMIN'));

export type SessionResult =
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'unauthenticated' }
  | { status: 'error' };

export interface LoginResult {
  success: boolean;
  message: string;
}

export const loginAPI = async (
  userId: string,
  password: string
): Promise<LoginResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: addVersionToHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ userId, password }),
    });

    if (response.ok) return { success: true, message: '로그인 성공' };

    const result = await response.json().catch(() => null);
    if (result?.message) return { success: false, message: result.message };
    if (response.status === 403) {
      return {
        success: false,
        message:
          '승인 대기 중인 계정입니다. 관리자 승인 후 로그인할 수 있습니다.',
      };
    }
    if (response.status === 401) {
      return {
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      };
    }
    return {
      success: false,
      message: `로그인에 실패했습니다. (${response.status})`,
    };
  } catch {
    return {
      success: false,
      message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
    };
  }
};

export const logoutAPI = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: addVersionToHeaders(),
      credentials: 'include',
    });
  } catch {
    // 서버 응답이 없어도 로그인 화면으로 보낸다.
  }
};

/**
 * 인증 쿠키는 nimda.kr과 공유하지만 localStorage는 도메인마다 따로이므로,
 * 로그인 여부는 항상 서버 응답으로 판단한다.
 */
export const getSession = async (): Promise<SessionResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: addVersionToHeaders(),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthenticated' };
    }
    if (!response.ok) return { status: 'error' };

    const result = await response.json();
    return { status: 'authenticated', user: result.data ?? result };
  } catch {
    return { status: 'error' };
  }
};

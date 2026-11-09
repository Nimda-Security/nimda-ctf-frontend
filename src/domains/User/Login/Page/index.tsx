import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAPI } from '@/api/auth';
import Layout from '@/components/Layout';
import './Login.css';

const LOGIN_ERROR_MESSAGE = '아이디 또는 비밀번호를 잘못 입력했습니다.';
const SIGNUP_URL = 'https://nimda.kr/signup';

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const userId = String(formData.get('userid') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!userId || !password) {
      setErrorMessage(LOGIN_ERROR_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    const result = await loginAPI(userId, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setErrorMessage(result.message || LOGIN_ERROR_MESSAGE);
    }
  };

  return (
    <Layout>
      <div className="login-page">
        <div className="login-page__inner">
          <h1 className="login-page__title">NIMDA CTF</h1>

          <form onSubmit={handleLogin} className="login-page__form">
            <input
              name="userid"
              type="text"
              className="login-page__input"
              placeholder="아이디"
              aria-label="아이디"
              required
              autoComplete="username"
            />

            <div className="login-page__password-wrap">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="login-page__input"
                placeholder="비밀번호"
                aria-label="비밀번호"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-page__password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? '숨기기' : '보기'}
              </button>
            </div>

            {errorMessage && (
              <p className="login-page__error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="login-page__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <a className="login-page__signup-link" href={SIGNUP_URL}>
            회원가입
          </a>
        </div>
      </div>
    </Layout>
  );
}

export default LoginPage;

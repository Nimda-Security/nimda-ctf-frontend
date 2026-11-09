import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CurrentUser } from '@/api/auth';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  user?: CurrentUser;
  onLogout?: () => void;
}

const MAIN_SITE = 'https://nimda.kr';
const CONTACT_EMAIL = 'nimda0410@gmail.com';
const FOOTER_LINKS = [
  ['서비스 이용약관', '/board/notice/5'],
  ['개인정보 보호정책', '/board/notice/6'],
  ['청소년 보호정책', '/board/notice/7'],
  ['사이트 이용규칙', '/board/notice/8'],
];

const Layout = ({ children, user, onLogout }: LayoutProps) => {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__header-inner">
          <Link to="/" className="layout__brand">
            <img src="/nimda.png" alt="" width="20" />
            NIMDA
          </Link>
          {user && (
            <div className="layout__user">
              <span className="layout__nickname">{user.nickname}</span>
              <img
                className="layout__avatar"
                src={user.profileImage || '/default_user_profile.svg'}
                alt=""
              />
              <button
                type="button"
                className="layout__logout"
                onClick={onLogout}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="layout__main">{children}</main>

      <footer className="layout__footer">
        <img src="/nimda.png" alt="" width="24" />
        <p>31080 충청남도 천안시 서북구 천안대로 1223-24 학생회관 305호</p>
        <nav className="layout__footer-links">
          {FOOTER_LINKS.map(([label, path]) => (
            <a key={path} href={`${MAIN_SITE}${path}`}>
              {label}
            </a>
          ))}
          <button type="button" onClick={copyEmail}>
            {copied ? '이메일 복사됨' : '비즈니스 문의'}
          </button>
        </nav>
        <p className="layout__copyright">
          © NIMDA Security. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Layout;

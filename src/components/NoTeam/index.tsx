import { Link } from 'react-router-dom';
import './NoTeam.css';

interface NoTeamProps {
  nickname: string;
}

/** 팀전이라 팀이 없는 참가자에게 문제 대신 보여주는 안내 (Figma 06). */
const NoTeam = ({ nickname }: NoTeamProps) => (
  <section className="no-team" role="status">
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="#8b8b8b"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="#8b8b8b" strokeWidth="1.6" />
      <path
        d="M17 8l5 5M22 8l-5 5"
        stroke="#d64454"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
    <h2 className="no-team__title">팀에 소속되어 있지 않습니다!</h2>
    <p className="no-team__text">
      NIMDACON CTF는 팀전으로 진행됩니다. 운영진이 팀을 배정하면 문제가
      공개됩니다.
    </p>
    <p className="no-team__account">
      <span>내 계정</span>
      <strong>{nickname}</strong>
    </p>
    <div className="no-team__actions">
      <Link to="/scoreboard" className="no-team__button">
        스코어보드 보기
      </Link>
      <button
        type="button"
        className="no-team__button no-team__button--primary"
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
    <p className="no-team__hint">배정 후에도 이 화면이 보이면 새로고침하세요.</p>
  </section>
);

export default NoTeam;

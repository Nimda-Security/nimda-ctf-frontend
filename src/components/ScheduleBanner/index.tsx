import { Link } from 'react-router-dom';
import { formatCountdown, formatKst } from '@/api/schedule';
import type { ScheduleState } from '@/hooks/useSchedule';
import './ScheduleBanner.css';

/** 종료 몇 분 전부터 "곧 종료" 배너를 띄울지 */
const SOON_MS = 30 * 60_000;

/** 대회 시작 전 · 종료 임박 · 종료 후 배너 (Figma 08 참가자 화면 상태). 진행 중에는 아무것도 없다. */
const ScheduleBanner = ({ schedule }: { schedule: ScheduleState }) => {
  const { loaded, phase, now, startsAt, endsAt } = schedule;
  if (!loaded) return null;

  if (phase === 'UPCOMING' && startsAt !== null) {
    return (
      <section className="schedule-banner" role="status">
        <div>
          <strong>대회 시작 전입니다</strong>
          <p>{formatKst(startsAt)}에 시작합니다.</p>
        </div>
        <span className="schedule-banner__time">{formatCountdown(startsAt - now)}</span>
      </section>
    );
  }

  if (phase === 'RUNNING' && endsAt !== null && endsAt - now <= SOON_MS) {
    return (
      <section className="schedule-banner schedule-banner--soon" role="status">
        <div>
          <strong>종료 30분 전</strong>
          <p>남은 시간 안에 제출하세요. 종료 시각이 지나면 제출이 마감됩니다.</p>
        </div>
        <span className="schedule-banner__time">{formatCountdown(endsAt - now)}</span>
      </section>
    );
  }

  if (phase === 'ENDED') {
    return (
      <section className="schedule-banner schedule-banner--ended" role="status">
        <div>
          <strong>대회가 종료되었습니다</strong>
          <p>플래그 제출이 마감되었습니다. 최종 순위는 스코어보드에서 확인하세요.</p>
        </div>
        <Link to="/scoreboard" className="schedule-banner__link">
          최종 순위 보기 →
        </Link>
      </section>
    );
  }

  return null;
};

export default ScheduleBanner;

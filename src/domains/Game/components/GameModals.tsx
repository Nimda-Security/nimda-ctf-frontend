import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Flag, KeyRound, Sparkles, X } from 'lucide-react';
import {
  CHALLENGE_BY_ID,
  SOUVENIR_BY_ID,
  verifyLocalFlag,
} from '../data/challenges';
import type { ActiveModal, DialogueLine, SouvenirData } from '../types';

interface GameModalsProps {
  modal: ActiveModal | null;
  solvedChallengeIds: string[];
  onClose: () => void;
  onSolveChallenge: (challengeId: string, souvenir: SouvenirData) => void;
  onOpenChallengeFromSouvenir: (challengeId: string) => void;
}

const ROLE_LABELS: Record<NonNullable<DialogueLine['speakerRole']>, string> = {
  president: '회장',
  vice: '안내 NPC',
  clone: '복제 NPC',
  system: 'SYSTEM',
  object: '조사',
};

const GameModals = ({
  modal,
  solvedChallengeIds,
  onClose,
  onSolveChallenge,
  onOpenChallengeFromSouvenir,
}: GameModalsProps) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [flagInput, setFlagInput] = useState('');
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'success' | 'info';
    text: string;
    awarded?: SouvenirData;
  } | null>(null);

  // 모달이 바뀔 때 내부 상태 초기화
  useEffect(() => {
    setLineIndex(0);
    setFlagInput('');
    setFeedback(null);
  }, [modal]);

  // Esc 키로 모든 팝업 닫기 · 대사창에서 Enter/Space로 다음 대사 진행
  useEffect(() => {
    if (!modal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (
        modal.type === 'dialogue' &&
        !event.repeat &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'INPUT') return;
        event.preventDefault();
        if (lineIndex < modal.lines.length - 1) {
          setLineIndex((i) => i + 1);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal, lineIndex, onClose]);

  if (!modal) return null;

  // ===================== 1. 대사 팝업 =====================
  if (modal.type === 'dialogue') {
    const currentLine = modal.lines[lineIndex] ?? modal.lines[0];
    const isLast = lineIndex >= modal.lines.length - 1;
    const role = currentLine?.speakerRole ?? 'object';

    const handleNext = () => {
      if (!isLast) {
        setLineIndex((i) => i + 1);
      } else {
        onClose();
      }
    };

    return (
      <div
        className="game-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
        onClick={onClose}
      >
        <div
          className="game-modal game-modal--dialogue"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="game-modal__header">
            <div className="game-modal__badges">
              <span className={`game-badge game-badge--${role}`}>
                {ROLE_LABELS[role]}
              </span>
              <span className="game-modal__speaker">{currentLine?.speaker}</span>
            </div>
            <button
              type="button"
              className="game-modal__close"
              onClick={onClose}
              aria-label="닫기 (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          <p className="game-modal__dialogue-text">{currentLine?.text}</p>

          <div className="game-modal__footer">
            <span className="game-modal__hint">
              {lineIndex + 1} / {modal.lines.length} · <kbd>Esc</kbd> 닫기
            </span>
            <div className="game-modal__actions">
              {isLast && modal.cta && (
                <button
                  type="button"
                  className="game-btn game-btn--accent"
                  onClick={modal.cta.onConfirm}
                >
                  {modal.cta.label}
                </button>
              )}
              <button
                type="button"
                className="game-btn game-btn--primary"
                onClick={handleNext}
              >
                {isLast ? '닫기' : '다음 →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== 2. 임시 문제 팝업 =====================
  if (modal.type === 'challenge') {
    const challenge = CHALLENGE_BY_ID[modal.challengeId];
    if (!challenge) return null;
    const alreadySolved = solvedChallengeIds.includes(challenge.id);

    const handleSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!flagInput.trim()) {
        setFeedback({ tone: 'error', text: '플래그를 입력해 주세요.' });
        return;
      }

      const result = verifyLocalFlag(
        challenge.id,
        flagInput,
        solvedChallengeIds
      );

      if (!result.correct) {
        setFeedback({
          tone: 'error',
          text: '플래그가 일치하지 않습니다. 대소문자와 중괄호 형식을 확인해 주세요.',
        });
        return;
      }

      if (result.alreadySolved) {
        setFeedback({
          tone: 'info',
          text: `이미 해결한 문제입니다. 기념품 「${challenge.souvenir.name}」은 이미 가방에 보관되어 있습니다.`,
        });
        return;
      }

      if (result.souvenir) {
        onSolveChallenge(challenge.id, result.souvenir);
        setFeedback({
          tone: 'success',
          text: `정답입니다! 기념품 「${result.souvenir.name}」을(를) 획득했습니다.`,
          awarded: result.souvenir,
        });
        setFlagInput('');
      }
    };

    return (
      <div
        className="game-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={`${challenge.id} ${challenge.title}`}
        onClick={onClose}
      >
        <div
          className="game-modal game-modal--challenge"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="game-modal__header">
            <div className="game-modal__badges">
              <span className="game-badge game-badge--code">{challenge.id}</span>
              <span className="game-badge game-badge--cat">
                {challenge.category}
              </span>
              <span className="game-badge game-badge--pts">
                {challenge.points} pts
              </span>
              {alreadySolved && (
                <span className="game-badge game-badge--solved">
                  <CheckCircle2 size={13} /> 해결 완료
                </span>
              )}
            </div>
            <button
              type="button"
              className="game-modal__close"
              onClick={onClose}
              aria-label="닫기 (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="game-modal__title">{challenge.title}</h2>
          <p className="game-modal__quote">{challenge.flavorQuote}</p>
          <p className="game-modal__desc">{challenge.description}</p>

          <div className="game-modal__meta-box">
            <span className="game-modal__meta-label">프로토타입 문제 자료</span>
            <p className="game-modal__meta-value">{challenge.artifactHint}</p>
            <p className="game-modal__reward-preview">
              보상 기념품: <strong>{challenge.souvenir.icon} {challenge.souvenir.name}</strong>
            </p>
          </div>

          <form className="game-flag-form" onSubmit={handleSubmit}>
            <label htmlFor="ctf-flag-input" className="game-flag-form__label">
              <Flag size={14} /> 플래그 제출 (로컬 테스트 채점)
            </label>
            <div className="game-flag-form__row">
              <input
                id="ctf-flag-input"
                type="text"
                className="game-flag-form__input"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                placeholder="NIMDA{...}"
                autoFocus
                autoComplete="off"
              />
              <button
                type="submit"
                className="game-btn game-btn--accent"
              >
                제출
              </button>
            </div>
          </form>

          {feedback && (
            <div
              className={`game-feedback game-feedback--${feedback.tone}`}
              role="status"
            >
              <p>{feedback.text}</p>
              {feedback.awarded && (
                <p className="game-feedback__story">
                  “{feedback.awarded.story}”
                </p>
              )}
            </div>
          )}

          <div className="game-modal__footer">
            <span className="game-modal__hint">
              <kbd>Esc</kbd> 키로 닫고 맵으로 돌아갑니다
            </span>
            <button
              type="button"
              className="game-btn game-btn--ghost"
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== 3. 인벤토리 기념품 상세 팝업 =====================
  if (modal.type === 'souvenir') {
    const souvenir = SOUVENIR_BY_ID[modal.souvenirId];
    if (!souvenir) return null;

    return (
      <div
        className="game-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={souvenir.name}
        onClick={onClose}
      >
        <div
          className="game-modal game-modal--souvenir"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="game-modal__header">
            <div className="game-modal__badges">
              <span className="game-badge game-badge--souvenir">
                <Sparkles size={13} />{' '}
                {souvenir.stage === 'stage1' ? 'STAGE 1 기념품' : 'STAGE 2 출구 조각'}
              </span>
              <span className="game-badge game-badge--cat">
                {souvenir.category}
              </span>
            </div>
            <button
              type="button"
              className="game-modal__close"
              onClick={onClose}
              aria-label="닫기 (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          <div className="game-souvenir-hero">
            <div className="game-souvenir-hero__icon" aria-hidden="true">
              {souvenir.icon}
            </div>
            <div>
              <h2 className="game-modal__title">{souvenir.name}</h2>
              <p className="game-souvenir-hero__challenge">
                관련 문제: <strong>{souvenir.challengeId} · {souvenir.challengeTitle}</strong>
              </p>
            </div>
          </div>

          <blockquote className="game-souvenir-story">
            “{souvenir.story}”
          </blockquote>

          <div className="game-modal__footer">
            <span className="game-modal__hint">
              <kbd>Esc</kbd> 닫기
            </span>
            <div className="game-modal__actions">
              <button
                type="button"
                className="game-btn game-btn--ghost"
                onClick={() => onOpenChallengeFromSouvenir(souvenir.challengeId)}
              >
                관련 문제 보기
              </button>
              <button
                type="button"
                className="game-btn game-btn--primary"
                onClick={onClose}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== 4. Stage 1 완료 전환 팝업 =====================
  if (modal.type === 'stage1-complete') {
    return (
      <div
        className="game-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Stage 1 완료"
        onClick={onClose}
      >
        <div
          className="game-modal game-modal--transition"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="game-transition__eyebrow">SYSTEM LOG · STAGE 1 CLEAR</p>
          <h2 className="game-transition__title">게임 조정 완료.</h2>
          <p className="game-transition__line">참가자 만족도 — 목표 미달.</p>
          <p className="game-transition__accent">다음 수정 대상: 참가자</p>
          <p className="game-transition__sub">
            오락실 오른쪽 문(Stage 2 · 완벽한 동아리)이 정식 개방되었습니다.
          </p>
          <div className="game-modal__footer">
            <span className="game-modal__hint">
              <kbd>Esc</kbd> 닫기
            </span>
            <button
              type="button"
              className="game-btn game-btn--accent"
              onClick={onClose}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== 5. Stage 2 완주 엔딩 팝업 =====================
  return (
    <div
      className="game-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Stage 2 탈출"
      onClick={onClose}
    >
      <div
        className="game-modal game-modal--transition"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="game-transition__eyebrow">
          <KeyRound size={14} /> GAME CLEAR · 오늘은 여기까지
        </p>
        <h2 className="game-transition__title">“방금 건 저장해 둘게.”</h2>
        <p className="game-transition__line">
          출구 조각 다섯 개가 맞춰지며 잠겨 있던 문이 열렸다.
        </p>
        <p className="game-transition__sub">
          회장이 문 옆으로 비켜선다. 출입문에 붙어 있던 ‘퇴장 불가’ 표지가 뒤집혀
          <strong> ‘이어하기 가능’</strong>으로 바뀐다.
        </p>
        <div className="game-modal__footer">
          <span className="game-modal__hint">
            <kbd>Esc</kbd> 닫기
          </span>
          <button
            type="button"
            className="game-btn game-btn--accent"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameModals;

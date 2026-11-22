import { Backpack, RotateCcw } from 'lucide-react';
import { STAGE1_SOUVENIRS, STAGE2_SOUVENIRS } from '../data/challenges';
import type { PlayerSkin, RoomDefinition, SouvenirData } from '../types';

interface GameHudProps {
  room: RoomDefinition;
  collectedSouvenirIds: string[];
  playerSkin: PlayerSkin;
  onChangeSkin: (skin: PlayerSkin) => void;
  onSelectSouvenir: (souvenir: SouvenirData) => void;
  onResetProgress: () => void;
}

const SKIN_OPTIONS: { id: PlayerSkin; label: string; color: string }[] = [
  { id: 'white', label: '흰색', color: '#f4f2eb' },
  { id: 'red', label: '빨강', color: '#a3443a' },
  { id: 'dark', label: '다크', color: '#2c2938' },
];

export const GameTopBar = ({
  room,
  collectedSouvenirIds,
  playerSkin,
  onChangeSkin,
  onResetProgress,
}: Omit<GameHudProps, 'onSelectSouvenir'>) => {
  const s1Count = STAGE1_SOUVENIRS.filter((s) =>
    collectedSouvenirIds.includes(s.id)
  ).length;
  const s2Count = STAGE2_SOUVENIRS.filter((s) =>
    collectedSouvenirIds.includes(s.id)
  ).length;

  return (
    <header className="game-topbar">
      <div className="game-topbar__room">
        <span className={`game-room-pill game-room-pill--${room.theme}`}>
          {room.code}
        </span>
        <div>
          <h1 className="game-topbar__title">{room.title}</h1>
          <p className="game-topbar__subtitle">{room.subtitle}</p>
        </div>
      </div>

      <div className="game-topbar__controls">
        <div className="game-progress-pills" aria-label="수집 진행도">
          <span className="game-progress-pill">
            방 1 기념품 <strong>{s1Count}/5</strong>
          </span>
          <span className="game-progress-pill">
            방 2 출구 조각 <strong>{s2Count}/5</strong>
          </span>
        </div>

        <div className="game-skin-picker" role="group" aria-label="캐릭터 색상">
          {SKIN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={
                playerSkin === opt.id
                  ? 'game-skin-dot game-skin-dot--active'
                  : 'game-skin-dot'
              }
              style={{ backgroundColor: opt.color }}
              title={`캐릭터 색상: ${opt.label}`}
              aria-label={`캐릭터 색상 ${opt.label}`}
              aria-pressed={playerSkin === opt.id}
              onClick={() => onChangeSkin(opt.id)}
            />
          ))}
        </div>

        <button
          type="button"
          className="game-reset-btn"
          onClick={onResetProgress}
          title="로컬 테스트 진행도 초기화"
        >
          <RotateCcw size={13} />
          <span>초기화</span>
        </button>
      </div>
    </header>
  );
};

export const GameInventoryBar = ({
  collectedSouvenirIds,
  onSelectSouvenir,
}: Pick<GameHudProps, 'collectedSouvenirIds' | 'onSelectSouvenir'>) => {
  const totalCollected = collectedSouvenirIds.length;

  const renderSlot = (item: SouvenirData) => {
    const owned = collectedSouvenirIds.includes(item.id);
    if (!owned) {
      return (
        <div
          key={item.id}
          className="game-inv-slot game-inv-slot--locked"
          title={`미획득 (${item.challengeId})`}
        >
          <span className="game-inv-slot__lock">?</span>
          <span className="game-inv-slot__code">{item.challengeId}</span>
        </div>
      );
    }
    return (
      <button
        key={item.id}
        type="button"
        className={`game-inv-slot game-inv-slot--owned game-inv-slot--${item.stage}`}
        onClick={() => onSelectSouvenir(item)}
        title={`${item.name} — 클릭하여 이야기 보기`}
      >
        <span className="game-inv-slot__icon" aria-hidden="true">
          {item.icon}
        </span>
        <span className="game-inv-slot__name">{item.name}</span>
      </button>
    );
  };

  return (
    <section className="game-inventory" aria-label="팀 인벤토리">
      <div className="game-inventory__head">
        <span className="game-inventory__label">
          <Backpack size={15} />
          가방 <strong>{totalCollected} / 10</strong>
        </span>
        <span className="game-inventory__controls-hint">
          <kbd>WASD</kbd>/<kbd>방향키</kbd> 이동 · <kbd>E</kbd> 상호작용 ·{' '}
          <kbd>Esc</kbd> 팝업 닫기
        </span>
      </div>

      <div className="game-inventory__groups">
        <div className="game-inventory__group">
          <span className="game-inventory__group-title">STAGE 1</span>
          <div className="game-inventory__slots">
            {STAGE1_SOUVENIRS.map(renderSlot)}
          </div>
        </div>
        <div className="game-inventory__divider" aria-hidden="true" />
        <div className="game-inventory__group">
          <span className="game-inventory__group-title">STAGE 2</span>
          <div className="game-inventory__slots">
            {STAGE2_SOUVENIRS.map(renderSlot)}
          </div>
        </div>
      </div>
    </section>
  );
};

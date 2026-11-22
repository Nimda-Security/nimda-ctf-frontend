import { useCallback, useEffect, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameInventoryBar, GameTopBar } from './components/GameHud';
import GameModals from './components/GameModals';
import { STAGE1_SOUVENIRS, STAGE2_SOUVENIRS } from './data/challenges';
import { ROOMS } from './data/rooms';
import type {
  ActiveModal,
  GameProgressState,
  InteractTarget,
  PlayerSkin,
  RoomId,
  SouvenirData,
} from './types';
import './Game.css';

const STORAGE_KEY = 'nimda_ctf_escape_prototype_v1';

const DEFAULT_PROGRESS: GameProgressState = {
  solvedChallengeIds: [],
  collectedSouvenirIds: [],
  stage2Unlocked: false,
  playerSkin: 'white',
};

const loadProgress = (): GameProgressState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<GameProgressState>;
    return {
      solvedChallengeIds: Array.isArray(parsed.solvedChallengeIds)
        ? parsed.solvedChallengeIds
        : [],
      collectedSouvenirIds: Array.isArray(parsed.collectedSouvenirIds)
        ? parsed.collectedSouvenirIds
        : [],
      stage2Unlocked: Boolean(parsed.stage2Unlocked),
      playerSkin:
        parsed.playerSkin === 'red' || parsed.playerSkin === 'dark'
          ? parsed.playerSkin
          : 'white',
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
};

const GamePage = () => {
  const [roomId, setRoomId] = useState<RoomId>('lobby');
  const [spawnKey, setSpawnKey] = useState<string>('default');
  const [spawnToken, setSpawnToken] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [progress, setProgress] = useState<GameProgressState>(loadProgress);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const room = ROOMS[roomId];
  const spawnPoint = room.spawns[spawnKey] ?? room.spawns.default;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage quota errors
    }
  }, [progress]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const moveToRoom = useCallback((nextRoom: RoomId, nextSpawnKey: string) => {
    setActiveModal(null);
    setIsFading(true);
    window.setTimeout(() => {
      setRoomId(nextRoom);
      setSpawnKey(nextSpawnKey);
      setSpawnToken((t) => t + 1);
      window.setTimeout(() => setIsFading(false), 120);
    }, 170);
  }, []);

  const handleInteract = useCallback(
    (target: InteractTarget) => {
      if (target.source.kind === 'npc') {
        setActiveModal({
          type: 'dialogue',
          title: target.source.npc.name,
          lines: target.source.npc.lines,
        });
        return;
      }

      const { object } = target.source;
      const action = object.action;
      if (!action) return;

      switch (action.type) {
        case 'dialogue':
          setActiveModal({
            type: 'dialogue',
            title: object.name,
            lines: action.lines,
          });
          return;

        case 'tv':
          setActiveModal({
            type: 'dialogue',
            title: object.name,
            lines: action.lines,
            cta: {
              label: '특별활동 참가 → Stage 1',
              onConfirm: () => moveToRoom(action.targetRoom, 'fromLobby'),
            },
          });
          return;

        case 'portal': {
          if (action.requiresStage1Complete && !progress.stage2Unlocked) {
            const collectedCount = STAGE1_SOUVENIRS.filter((s) =>
              progress.collectedSouvenirIds.includes(s.id)
            ).length;
            setActiveModal({
              type: 'dialogue',
              title: object.name,
              lines: [
                {
                  speaker: '시스템',
                  speakerRole: 'system',
                  text: `현재 Stage 1 기념품을 ${collectedCount} / 5개 모았습니다. 본 대회에서는 5개를 모두 모으거나 개방 시각이 지나면 Stage 2가 열립니다.`,
                },
                {
                  speaker: '프로토타입 안내',
                  speakerRole: 'system',
                  text: '지금은 1차 프로토타입 체험을 위해 아래 버튼으로 Stage 2(완벽한 동아리)에 바로 입장해 볼 수 있습니다.',
                },
              ],
              cta: {
                label: 'Stage 2 입장 (체험 개방)',
                onConfirm: () => moveToRoom(action.targetRoom, action.spawnKey),
              },
            });
            return;
          }
          moveToRoom(action.targetRoom, action.spawnKey);
          return;
        }

        case 'challenge':
          setActiveModal({
            type: 'challenge',
            challengeId: action.challengeId,
          });
          return;

        case 'stage2-exit': {
          const collectedExit = STAGE2_SOUVENIRS.filter((s) =>
            progress.collectedSouvenirIds.includes(s.id)
          ).length;

          if (collectedExit >= STAGE2_SOUVENIRS.length) {
            setActiveModal({ type: 'stage2-ending' });
            return;
          }

          setActiveModal({
            type: 'dialogue',
            title: object.name,
            lines: [
              {
                speaker: '출구 문',
                speakerRole: 'object',
                text: `출입문에 ‘퇴장 불가’라고 적혀 있다. 출구 조각이 ${collectedExit} / 5개 모였다.`,
              },
              {
                speaker: '안내',
                speakerRole: 'system',
                text: 'Stage 2의 문제 5개를 모두 풀어 출구 조각을 모으면 탈출할 수 있습니다. 로비로 돌아가 쉬고 싶다면 아래 버튼을 누르세요.',
              },
            ],
            cta: {
              label: '로비로 돌아가기',
              onConfirm: () => moveToRoom('lobby', 'default'),
            },
          });
          return;
        }
      }
    },
    [moveToRoom, progress.collectedSouvenirIds, progress.stage2Unlocked]
  );

  const handleSolveChallenge = useCallback(
    (challengeId: string, souvenir: SouvenirData) => {
      let newlyCompletedStage1 = false;

      setProgress((prev) => {
        if (prev.solvedChallengeIds.includes(challengeId)) {
          return prev;
        }
        const nextSolved = [...prev.solvedChallengeIds, challengeId];
        const nextSouvenirs = prev.collectedSouvenirIds.includes(souvenir.id)
          ? prev.collectedSouvenirIds
          : [...prev.collectedSouvenirIds, souvenir.id];

        const stage1Done = STAGE1_SOUVENIRS.every((s) =>
          nextSouvenirs.includes(s.id)
        );
        if (stage1Done && !prev.stage2Unlocked) {
          newlyCompletedStage1 = true;
        }

        return {
          ...prev,
          solvedChallengeIds: nextSolved,
          collectedSouvenirIds: nextSouvenirs,
          stage2Unlocked: prev.stage2Unlocked || stage1Done,
        };
      });

      setToast(`${souvenir.icon} 기념품 「${souvenir.name}」 획득!`);

      if (newlyCompletedStage1) {
        window.setTimeout(() => {
          setActiveModal({ type: 'stage1-complete' });
        }, 700);
      }
    },
    []
  );

  const handleChangeSkin = useCallback((skin: PlayerSkin) => {
    setProgress((prev) => ({ ...prev, playerSkin: skin }));
  }, []);

  const handleResetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    setActiveModal(null);
    setRoomId('lobby');
    setSpawnKey('default');
    setSpawnToken((t) => t + 1);
    setToast('로컬 테스트 진행도가 초기화되었습니다.');
  }, []);

  return (
    <div className="game-page">
      <GameTopBar
        room={room}
        collectedSouvenirIds={progress.collectedSouvenirIds}
        playerSkin={progress.playerSkin}
        onChangeSkin={handleChangeSkin}
        onResetProgress={handleResetProgress}
      />

      <main className="game-viewport">
        <GameCanvas
          room={room}
          spawnPoint={spawnPoint}
          spawnToken={spawnToken}
          playerSkin={progress.playerSkin}
          solvedChallengeIds={progress.solvedChallengeIds}
          isPaused={activeModal !== null}
          onInteract={handleInteract}
        />
        <div
          className={
            isFading ? 'game-room-fade game-room-fade--active' : 'game-room-fade'
          }
          aria-hidden="true"
        />
      </main>

      <GameInventoryBar
        collectedSouvenirIds={progress.collectedSouvenirIds}
        onSelectSouvenir={(souvenir) =>
          setActiveModal({ type: 'souvenir', souvenirId: souvenir.id })
        }
      />

      {toast && (
        <div className="game-toast" role="status">
          {toast}
        </div>
      )}

      <GameModals
        modal={activeModal}
        solvedChallengeIds={progress.solvedChallengeIds}
        onClose={() => setActiveModal(null)}
        onSolveChallenge={handleSolveChallenge}
        onOpenChallengeFromSouvenir={(challengeId) =>
          setActiveModal({ type: 'challenge', challengeId })
        }
      />
    </div>
  );
};

export default GamePage;

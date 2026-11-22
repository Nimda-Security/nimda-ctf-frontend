import { useEffect, useRef, useState } from 'react';
import {
  findNearestInteractable,
  moveWithCollision,
} from '../engine/physics';
import { PLAYER_RADIUS } from '../data/rooms';
import { drawBlobCharacter } from '../renderers/characters';
import { drawRoomObject } from '../renderers/furniture';
import { drawRoomBackdrop } from '../renderers/roomBackdrop';
import type {
  InteractTarget,
  PlayerSkin,
  Point,
  RoomDefinition,
} from '../types';

interface GameCanvasProps {
  room: RoomDefinition;
  spawnPoint: Point;
  spawnToken: number;
  playerSkin: PlayerSkin;
  solvedChallengeIds: string[];
  isPaused: boolean;
  onInteract: (target: InteractTarget) => void;
}

const MOVE_SPEED = 215; // px/sec in logical room coordinates

const drawInteractPrompt = (
  ctx: CanvasRenderingContext2D,
  target: InteractTarget,
  roomWidth: number,
  timeSec: number
) => {
  const bob = Math.sin(timeSec * 5) * 2.2;
  const label = target.name;
  ctx.save();
  ctx.font = '700 12px Pretendard, sans-serif';
  const nameWidth = ctx.measureText(label).width;
  const keyW = 22;
  const padX = 11;
  const gap = 8;
  const pillW = padX * 2 + keyW + gap + nameWidth;
  const pillH = 32;

  const px = Math.max(
    26,
    Math.min(roomWidth - 26 - pillW, target.x - pillW / 2)
  );
  const py = Math.max(26, target.y - pillH - 4 + bob);

  // 배경 알약
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(18, 20, 30, 0.92)';
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, 9);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 224, 130, 0.72)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // [E] 키캡
  const kx = px + padX;
  const ky = py + 5;
  ctx.fillStyle = '#ffe082';
  ctx.beginPath();
  ctx.roundRect(kx, ky, keyW, 22, 5);
  ctx.fill();

  ctx.fillStyle = '#181a24';
  ctx.font = '800 12px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', kx + keyW / 2, ky + 11.5);

  // 오브젝트 이름
  ctx.fillStyle = '#f8f7f2';
  ctx.font = '700 12px Pretendard, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, kx + keyW + gap, py + pillH / 2 + 0.5);

  ctx.restore();
};

const GameCanvas = ({
  room,
  spawnPoint,
  spawnToken,
  playerSkin,
  solvedChallengeIds,
  isPaused,
  onInteract,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<Point>({ ...spawnPoint });
  const lookRef = useRef<Point>({ x: 0, y: 1 });
  const walkPhaseRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const nearestRef = useRef<InteractTarget | null>(null);
  const [nearestLabel, setNearestLabel] = useState<string | null>(null);

  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const solvedSetRef = useRef<Set<string>>(new Set(solvedChallengeIds));
  solvedSetRef.current = new Set(solvedChallengeIds);

  const skinRef = useRef<PlayerSkin>(playerSkin);
  skinRef.current = playerSkin;

  const roomRef = useRef<RoomDefinition>(room);
  roomRef.current = room;

  // 방 이동 시 스폰 위치 초기화
  useEffect(() => {
    playerRef.current = { ...spawnPoint };
    keysRef.current.clear();
  }, [spawnPoint, spawnToken]);

  // 팝업이 열리면 이동 키 입력 즉시 해제 (캐릭터 이동 멈춤)
  useEffect(() => {
    if (isPaused) {
      keysRef.current.clear();
    }
  }, [isPaused]);

  // 키보드 이벤트 (WASD / 방향키 이동, E 상호작용)
  useEffect(() => {
    const isMovementKey = (code: string) =>
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight';

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (isTyping || isPausedRef.current) {
        return;
      }

      if (isMovementKey(event.code)) {
        event.preventDefault();
        keysRef.current.add(event.code);
        return;
      }

      if (event.code === 'KeyE' && !event.repeat) {
        if (nearestRef.current) {
          event.preventDefault();
          keysRef.current.clear();
          onInteractRef.current(nearestRef.current);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };

    const handleBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // 메인 60fps 렌더 & 업데이트 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = now / 1000;
      const activeRoom = roomRef.current;

      // 1) 이동 업데이트 (팝업 중에는 완전 정지)
      let vx = 0;
      let vy = 0;
      if (!isPausedRef.current) {
        const keys = keysRef.current;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) vx -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) vx += 1;
        if (keys.has('KeyW') || keys.has('ArrowUp')) vy -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) vy += 1;
      }

      const isMoving = vx !== 0 || vy !== 0;
      if (isMoving) {
        const len = Math.hypot(vx, vy);
        const nx = vx / len;
        const ny = vy / len;
        lookRef.current = { x: nx, y: ny };
        walkPhaseRef.current += dt * 13;
        playerRef.current = moveWithCollision(
          playerRef.current,
          nx * MOVE_SPEED * dt,
          ny * MOVE_SPEED * dt,
          PLAYER_RADIUS,
          activeRoom
        );
      }

      // 2) 가장 가까운 상호작용 대상 탐색 (맵 좌표 기준)
      const nearest = findNearestInteractable(playerRef.current, activeRoom);
      if (nearest?.id !== nearestRef.current?.id) {
        nearestRef.current = nearest;
        setNearestLabel(nearest ? nearest.name : null);
      } else {
        nearestRef.current = nearest;
      }

      // 3) 고해상도 DPR 스케일링
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = activeRoom.width * dpr;
      const targetH = activeRoom.height * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 배경(방 구조, 창문, 조명, 시계, 눈)
      drawRoomBackdrop(ctx, activeRoom, timeSec);

      // Y-정렬 렌더 목록 (가구 + NPC + 플레이어)
      type DrawItem = { sortY: number; draw: () => void };
      const drawables: DrawItem[] = [];

      for (const obj of activeRoom.objects) {
        const isHighlighted = nearest?.id === obj.id;
        const isSolved =
          obj.action?.type === 'challenge' &&
          solvedSetRef.current.has(obj.action.challengeId);
        drawables.push({
          sortY: obj.sortY ?? obj.y + obj.h,
          draw: () =>
            drawRoomObject(ctx, obj, {
              highlighted: isHighlighted,
              solved: isSolved,
              timeSec,
            }),
        });
      }

      for (const npc of activeRoom.npcs) {
        const isHighlighted = nearest?.id === npc.id;
        drawables.push({
          sortY: npc.y + npc.radius,
          draw: () =>
            drawBlobCharacter(ctx, {
              x: npc.x,
              y: npc.y,
              radius: npc.radius,
              skin: npc.skin,
              isHighlighted,
              displayTag: npc.displayTag,
              spriteUrl: npc.spriteUrl,
              timeSec,
            }),
        });
      }

      const player = playerRef.current;
      drawables.push({
        sortY: player.y + PLAYER_RADIUS,
        draw: () =>
          drawBlobCharacter(ctx, {
            x: player.x,
            y: player.y,
            radius: PLAYER_RADIUS,
            skin: skinRef.current,
            lookX: lookRef.current.x,
            lookY: lookRef.current.y,
            walkPhase: walkPhaseRef.current,
            isMoving,
            timeSec,
          }),
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const item of drawables) {
        item.draw();
      }

      // 4) 상호작용 키 [E] & 오브젝트 이름 표시
      if (nearest && !isPausedRef.current) {
        drawInteractPrompt(ctx, nearest, activeRoom.width, timeSec);
      }

      ctx.restore();
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleCanvasClick = () => {
    if (!isPaused && nearestRef.current) {
      onInteract(nearestRef.current);
    }
  };

  return (
    <div className="game-stage-frame">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onClick={handleCanvasClick}
        aria-label={`${room.title} 2D 방탈출 맵`}
      />
      {nearestLabel && !isPaused && (
        <button
          type="button"
          className="game-mobile-interact"
          onClick={handleCanvasClick}
        >
          <kbd>E</kbd>
          <span>{nearestLabel}</span>
        </button>
      )}
    </div>
  );
};

export default GameCanvas;

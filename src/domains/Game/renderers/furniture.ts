import type { RoomObject } from '../types';
import { getCachedSprite } from './spriteCache';

const CHAIR_COLORS = {
  charcoal: { main: '#3c4148', dark: '#272b30', rim: '#555c66' },
  burgundy: { main: '#82464f', dark: '#5e2f36', rim: '#9f5d66' },
  teal: { main: '#3f6a6b', dark: '#2a4b4c', rim: '#578788' },
  stone: { main: '#8d8c89', dark: '#6a6966', rim: '#aba9a5' },
};

const drawShadow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 6, w, h, 6);
  ctx.fill();
};

const drawSolvedBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) => {
  ctx.save();
  ctx.fillStyle = '#3bb273';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 0.5);
  ctx.lineTo(x - 1, y + 3.5);
  ctx.lineTo(x + 4.5, y - 3);
  ctx.stroke();
  ctx.restore();
};

const drawDoor = (
  ctx: CanvasRenderingContext2D,
  obj: RoomObject,
  side: 'left' | 'right',
  highlighted: boolean
) => {
  const { x, y, w, h, variant } = obj;
  const tone = variant?.doorTone ?? 'warm';
  const label = variant?.doorLabel ?? '';

  const palette =
    tone === 'lavender'
      ? { frame: '#6e6285', panel: '#594e70', glow: 'rgba(196, 174, 245, 0.34)', text: '#efe8ff' }
      : tone === 'dark'
        ? { frame: '#3b4240', panel: '#262b2a', glow: 'rgba(196, 214, 154, 0.26)', text: '#dce6c0' }
        : { frame: '#7d5c42', panel: '#5e422e', glow: 'rgba(255, 212, 138, 0.35)', text: '#fff5df' };

  // 바닥 진입 표시 매트
  const matX = side === 'right' ? x - 44 : x + w + 2;
  ctx.save();
  ctx.fillStyle = highlighted ? palette.glow : 'rgba(255, 255, 255, 0.09)';
  ctx.beginPath();
  ctx.roundRect(matX, y + 8, 42, h - 16, 6);
  ctx.fill();
  ctx.strokeStyle = highlighted ? 'rgba(255, 232, 160, 0.85)' : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 문틀 & 문짝
  ctx.fillStyle = palette.frame;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = palette.panel;
  ctx.fillRect(x + 4, y + 5, w - 8, h - 10);

  // 손잡이
  ctx.fillStyle = '#e8c47a';
  ctx.beginPath();
  ctx.arc(side === 'right' ? x + 8 : x + w - 8, y + h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // 방향 화살표 + 라벨
  if (label) {
    ctx.fillStyle = palette.text;
    ctx.font = '700 10px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = matX + 21;
    const ly = y + h / 2;
    ctx.fillText(side === 'right' ? '→' : '←', lx, ly - 8);
    ctx.fillText(label, lx, ly + 7);
  }
  ctx.restore();
};

export const drawRoomObject = (
  ctx: CanvasRenderingContext2D,
  obj: RoomObject,
  opts: {
    highlighted: boolean;
    solved: boolean;
    timeSec: number;
  }
) => {
  const { x, y, w, h, kind } = obj;
  const { highlighted, solved, timeSec } = opts;

  ctx.save();

  // 상호작용 가능 오브젝트가 하이라이트됐을 때 소프트 글로우
  if (highlighted) {
    ctx.shadowColor = 'rgba(255, 224, 130, 0.72)';
    ctx.shadowBlur = 16;
  }

  // 실제 이미지 에셋이 지정돼 있으면 우선 표시 (교체 가능한 구조)
  const sprite = getCachedSprite(obj.spriteUrl);
  if (sprite) {
    ctx.drawImage(sprite, x, y, w, h);
    ctx.shadowBlur = 0;
    if (solved) drawSolvedBadge(ctx, x + w - 8, y + 10);
    ctx.restore();
    return;
  }

  switch (kind) {
    case 'whiteboard': {
      ctx.fillStyle = '#a89f96';
      ctx.fillRect(x + 4, y, w - 12, h);
      ctx.fillStyle = '#f5f2ea';
      ctx.fillRect(x + 8, y + 6, w - 18, h - 12);
      // 낙서 선
      ctx.strokeStyle = '#536f8c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 24);
      ctx.lineTo(x + 28, y + 32);
      ctx.moveTo(x + 12, y + 48);
      ctx.lineTo(x + 26, y + 54);
      ctx.stroke();
      ctx.strokeStyle = '#b45353';
      ctx.beginPath();
      ctx.moveTo(x + 13, y + 76);
      ctx.lineTo(x + 27, y + 84);
      ctx.stroke();
      break;
    }

    case 'standby-tv': {
      drawShadow(ctx, x + 16, y + h - 22, w - 32, 18);
      // 스탠드 다리
      ctx.strokeStyle = '#2c2f36';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h - 30);
      ctx.lineTo(x + w / 2, y + h - 8);
      ctx.moveTo(x + 24, y + h - 8);
      ctx.lineTo(x + w - 24, y + h - 8);
      ctx.stroke();
      // TV 본체
      ctx.fillStyle = '#1e2128';
      ctx.beginPath();
      ctx.roundRect(x + 6, y, w - 12, h - 26, 6);
      ctx.fill();
      // 화면 미세 글로우
      const pulse = 0.28 + Math.sin(timeSec * 3) * 0.08;
      ctx.fillStyle = `rgba(92, 132, 178, ${pulse})`;
      ctx.fillRect(x + 12, y + 6, w - 24, h - 38);
      // "ON" 안내 텍스트
      ctx.fillStyle = '#d7e8ff';
      ctx.font = '700 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LIVE · TV', x + w / 2, y + (h - 26) / 2 + 3);
      break;
    }

    case 'coat-rack': {
      drawShadow(ctx, x + 8, y + h - 18, w - 16, 14);
      // 행거 프레임
      ctx.strokeStyle = '#3c3a3a';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 10, y + 6, w - 20, h - 14);
      // 겨울 코트들
      const coatColors = ['#2e3640', '#3d4048', '#293038', '#44413e'];
      coatColors.forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.roundRect(x + 16 + idx * 17, y + 12, 14, h - 26, 4);
        ctx.fill();
      });
      break;
    }

    case 'desk': {
      drawShadow(ctx, x + 2, y + 6, w - 4, h - 2);
      // 책상 다리
      ctx.fillStyle = '#4f4439';
      ctx.fillRect(x + 8, y + h - 6, 8, 12);
      ctx.fillRect(x + w - 16, y + h - 6, 8, 12);
      // 상판 앞면 두께
      ctx.fillStyle = '#c09c6d';
      ctx.fillRect(x, y + h - 10, w, 10);
      // 상판 윗면
      ctx.fillStyle = '#e1be8d';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h - 8, 4);
      ctx.fill();
      ctx.strokeStyle = '#b18b5c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 소품 (노트북 / 머그컵 / 루빅스 큐브)
      const prop = obj.variant?.deskProp;
      if (prop === 'laptop') {
        ctx.fillStyle = '#494d57';
        ctx.fillRect(x + w - 58, y + 14, 38, 24);
        ctx.fillStyle = '#6f7787';
        ctx.fillRect(x + w - 55, y + 17, 32, 15);
      } else if (prop === 'mug') {
        ctx.fillStyle = '#f2ede4';
        ctx.beginPath();
        ctx.arc(x + w - 46, y + 26, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6a462f';
        ctx.beginPath();
        ctx.arc(x + w - 46, y + 26, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop === 'cube') {
        // 루빅스 큐브
        const cx = x + 36;
        const cy = y + 18;
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 1, cy - 1, 18, 18);
        const cubeColors = ['#e05252', '#f2cf49', '#4a90e2', '#4db86a'];
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            ctx.fillStyle = cubeColors[r * 2 + c];
            ctx.fillRect(cx + c * 8 + 1, cy + r * 8 + 1, 6, 6);
          }
        }
      }
      break;
    }

    case 'chair': {
      const palette = CHAIR_COLORS[obj.variant?.chairColor ?? 'charcoal'];
      // 좌석
      ctx.fillStyle = palette.dark;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 6);
      ctx.fill();
      // 등받이
      ctx.fillStyle = palette.main;
      const backY = obj.variant?.facing === 'down' ? y : y + h - 14;
      ctx.beginPath();
      ctx.roundRect(x + 2, backY, w - 4, 14, 5);
      ctx.fill();
      ctx.strokeStyle = palette.rim;
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }

    case 'printer-table': {
      drawShadow(ctx, x, y + 6, w, h - 6);
      // 붉은 나무 상판
      ctx.fillStyle = '#a76347';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = '#75412b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // 프린터 본체
      ctx.fillStyle = '#2c2f36';
      ctx.beginPath();
      ctx.roundRect(x + 26, y + 14, 56, 38, 5);
      ctx.fill();
      ctx.fillStyle = '#e7e4dc';
      ctx.fillRect(x + 36, y + 44, 34, 10);
      // 커피 컵 & 문서
      ctx.fillStyle = '#eee9dd';
      ctx.fillRect(x + 14, y + 66, 26, 28);
      ctx.fillStyle = '#4e392d';
      ctx.beginPath();
      ctx.arc(x + 56, y + 76, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'mirror': {
      drawShadow(ctx, x + 2, y + 6, w - 4, h - 4);
      ctx.fillStyle = '#d4cabd';
      ctx.beginPath();
      ctx.roundRect(x + 4, y, w - 8, h, 4);
      ctx.fill();
      const glass = ctx.createLinearGradient(x, y, x + w, y + h);
      glass.addColorStop(0, '#c2ccd4');
      glass.addColorStop(0.45, '#e8eff5');
      glass.addColorStop(1, '#9ca9b5');
      ctx.fillStyle = glass;
      ctx.fillRect(x + 9, y + 6, w - 18, h - 12);
      break;
    }

    case 'cabinet-box': {
      drawShadow(ctx, x, y + 4, w, h - 4);
      ctx.fillStyle = '#9e8264';
      ctx.beginPath();
      ctx.roundRect(x, y + 10, w, h - 10, 4);
      ctx.fill();
      ctx.strokeStyle = '#6f5942';
      ctx.strokeRect(x + 6, y + 16, w / 2 - 8, h - 22);
      ctx.strokeRect(x + w / 2 + 2, y + 16, w / 2 - 8, h - 22);
      // 위 택배 상자
      ctx.fillStyle = '#c9a06c';
      ctx.fillRect(x + 18, y - 6, 44, 24);
      ctx.strokeStyle = '#8b6a42';
      ctx.strokeRect(x + 18, y - 6, 44, 24);
      break;
    }

    case 'mini-fridge': {
      drawShadow(ctx, x, y + 4, w, h - 4);
      ctx.fillStyle = '#e7e4dc';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.fill();
      ctx.strokeStyle = '#bab5aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 포스트잇
      ctx.fillStyle = '#f5de7a';
      ctx.fillRect(x + w - 24, y + 18, 14, 14);
      break;
    }

    case 'mini-arcade': {
      drawShadow(ctx, x, y + 4, w, h - 4);
      ctx.fillStyle = '#3d3942';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.fill();
      ctx.fillStyle = '#6e8c9e';
      ctx.fillRect(x + 10, y + 10, w - 20, 22);
      ctx.fillStyle = '#e6b85c';
      ctx.beginPath();
      ctx.arc(x + 22, y + 42, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d45b5b';
      ctx.beginPath();
      ctx.arc(x + 44, y + 42, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'copier': {
      drawShadow(ctx, x, y + 4, w, h - 4);
      ctx.fillStyle = '#dad7d2';
      ctx.beginPath();
      ctx.roundRect(x, y + 4, w, h - 4, 5);
      ctx.fill();
      ctx.fillStyle = '#f3f1ed';
      ctx.fillRect(x + 8, y, w - 16, 18);
      ctx.fillStyle = '#474c54';
      ctx.fillRect(x + 14, y + 26, w - 28, 10);
      break;
    }

    case 'door-right':
      drawDoor(ctx, obj, 'right', highlighted);
      break;

    case 'door-left':
      drawDoor(ctx, obj, 'left', highlighted);
      break;

    // ===================== STAGE 1 (오락실) =====================
    case 'mannequin': {
      drawShadow(ctx, x + 12, y + h - 18, w - 24, 14);
      // 받침대
      ctx.fillStyle = '#524b63';
      ctx.fillRect(x + 14, y + h - 12, w - 28, 7);
      ctx.fillRect(x + w / 2 - 3, y + h - 38, 6, 28);
      // 몸통 & 머리
      ctx.fillStyle = '#464154';
      ctx.beginPath();
      ctx.roundRect(x + 14, y + 22, w - 28, 42, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 12, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bulletin-board': {
      ctx.fillStyle = '#dcd6eb';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = '#978db0';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 종이 메모들
      ctx.fillStyle = '#fff9e6';
      ctx.fillRect(x + 10, y + 10, 48, 36);
      ctx.fillStyle = '#e7dcff';
      ctx.fillRect(x + 68, y + 12, 56, 48);
      // 메모 줄
      ctx.fillStyle = '#9b8fb8';
      ctx.fillRect(x + 16, y + 18, 34, 3);
      ctx.fillRect(x + 16, y + 26, 28, 3);
      ctx.fillRect(x + 16, y + 34, 32, 3);
      // 포스터 표시
      ctx.fillStyle = '#6f5c96';
      ctx.font = '700 9px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POSTER', x + 96, y + 40);
      break;
    }

    case 'arcade-runner': {
      drawShadow(ctx, x + 6, y + 22, w - 12, h - 18);
      // 캐비닛 본체
      ctx.fillStyle = '#615775';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#8b7da6';
      ctx.beginPath();
      ctx.roundRect(x + 6, y + 6, w - 12, h - 22, 6);
      ctx.fill();
      // 화면 (연보라-하양 글로우 + 달리는 실루엣)
      const glow = 0.85 + Math.sin(timeSec * 3.2) * 0.1;
      ctx.fillStyle = `rgba(218, 212, 245, ${glow})`;
      ctx.beginPath();
      ctx.roundRect(x + 16, y + 22, w - 32, 52, 4);
      ctx.fill();
      // 달리는 사람 아이콘
      const runX = x + w / 2 + Math.sin(timeSec * 5) * 6;
      const runY = y + 46;
      ctx.strokeStyle = '#473c63';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(runX + 2, runY - 12, 4.5, 0, Math.PI * 2);
      ctx.moveTo(runX + 1, runY - 7);
      ctx.lineTo(runX - 2, runY + 6);
      ctx.moveTo(runX - 2, runY + 6);
      ctx.lineTo(runX - 11, runY + 17);
      ctx.moveTo(runX - 2, runY + 6);
      ctx.lineTo(runX + 9, runY + 16);
      ctx.moveTo(runX, runY - 2);
      ctx.lineTo(runX + 10, runY + 2);
      ctx.stroke();
      // 조이스틱 패널
      ctx.fillStyle = '#4c435e';
      ctx.fillRect(x + 12, y + 80, w - 24, 24);
      ctx.fillStyle = '#e4dcff';
      ctx.beginPath();
      ctx.arc(x + 34, y + 92, 5, 0, Math.PI * 2);
      ctx.arc(x + w / 2, y + 92, 6, 0, Math.PI * 2);
      ctx.arc(x + w - 34, y + 92, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'arcade-rhythm': {
      drawShadow(ctx, x + 6, y + 18, w - 12, h - 14);
      // 본체
      ctx.fillStyle = '#5c5273';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#8b7ca8';
      ctx.beginPath();
      ctx.roundRect(x + 6, y + 6, w - 12, h - 20, 6);
      ctx.fill();
      // 4레인 리듬 화면 (C V B N)
      ctx.fillStyle = '#3b3352';
      ctx.beginPath();
      ctx.roundRect(x + 14, y + 18, w - 28, 58, 4);
      ctx.fill();
      for (let lane = 0; lane < 4; lane++) {
        const lx = x + 22 + lane * 19;
        ctx.strokeStyle = 'rgba(218, 206, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx + 6, y + 20);
        ctx.lineTo(lx + 6, y + 74);
        ctx.stroke();
        // 떨어지는 노트 애니메이션
        const ny = y + 22 + ((timeSec * 36 + lane * 17) % 44);
        ctx.fillStyle = lane % 2 === 0 ? '#dcd0ff' : '#a792f2';
        ctx.fillRect(lx, ny, 12, 6);
      }
      // CVBN 버튼 4개
      ctx.fillStyle = '#473e5c';
      ctx.fillRect(x + 12, y + 82, w - 24, 24);
      const keys = ['C', 'V', 'B', 'N'];
      keys.forEach((k, idx) => {
        const bx = x + 18 + idx * 20;
        ctx.fillStyle = '#ded4ff';
        ctx.beginPath();
        ctx.roundRect(bx, y + 87, 15, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#352d4a';
        ctx.font = '700 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(k, bx + 7.5, y + 97);
      });
      break;
    }

    case 'photo-booth': {
      drawShadow(ctx, x + 6, y + 18, w - 12, h - 14);
      ctx.fillStyle = '#675c80';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#978ab5';
      ctx.beginPath();
      ctx.roundRect(x + 6, y + 6, w - 12, h - 22, 6);
      ctx.fill();
      // 프로필 실루엣 화면
      ctx.fillStyle = '#4b4066';
      ctx.beginPath();
      ctx.roundRect(x + 16, y + 20, w - 32, 62, 5);
      ctx.fill();
      ctx.fillStyle = '#ece6ff';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 42, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + 70, 18, 12, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // 카드 배출구
      ctx.fillStyle = '#3a324d';
      ctx.fillRect(x + 28, y + 94, w - 56, 8);
      break;
    }

    case 'counter-usb': {
      drawShadow(ctx, x + 2, y + 8, w - 4, h - 6);
      // 책상
      ctx.fillStyle = '#8b7fa1';
      ctx.fillRect(x, y + h - 12, w, 12);
      ctx.fillStyle = '#cbbfe0';
      ctx.beginPath();
      ctx.roundRect(x, y + 10, w, h - 20, 4);
      ctx.fill();
      // 스탠드 조명
      ctx.strokeStyle = '#3a3548';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 22, y + 36);
      ctx.lineTo(x + 28, y + 14);
      ctx.lineTo(x + 42, y + 18);
      ctx.stroke();
      const lampGlow = ctx.createRadialGradient(x + 46, y + 36, 4, x + 46, y + 36, 42);
      lampGlow.addColorStop(0, 'rgba(255, 246, 204, 0.55)');
      lampGlow.addColorStop(1, 'rgba(255, 246, 204, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(x + 46, y + 36, 42, 0, Math.PI * 2);
      ctx.fill();
      // 서류 & USB 스틱
      ctx.fillStyle = '#f8f5ff';
      ctx.fillRect(x + 64, y + 24, 48, 32);
      ctx.fillStyle = '#4e4273';
      ctx.beginPath();
      ctx.roundRect(x + 126, y + 32, 24, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#cfd5e0';
      ctx.fillRect(x + 148, y + 34, 8, 8);
      break;
    }

    case 'prize-kiosk': {
      drawShadow(ctx, x + 4, y + 10, w - 8, h - 6);
      ctx.fillStyle = '#756991';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#a79bc4';
      ctx.beginPath();
      ctx.roundRect(x + 6, y + 6, w - 12, h - 24, 6);
      ctx.fill();
      // 티켓 아이콘 글로우
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x + w / 2 - 22, y + 20, 44, 26);
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 4, y + 20);
      ctx.lineTo(x + w / 2 + 4, y + 46);
      ctx.stroke();
      // 투입구
      ctx.fillStyle = '#3b334f';
      ctx.fillRect(x + w / 2 - 18, y + 60, 36, 8);
      break;
    }

    // ===================== STAGE 2 (뒤틀린 동방) =====================
    case 'distorted-whiteboard': {
      ctx.fillStyle = '#3a403e';
      ctx.fillRect(x + 4, y, w - 12, h);
      ctx.fillStyle = '#79827e';
      ctx.fillRect(x + 8, y + 6, w - 18, h - 12);
      // 지워지고 덧쓴 낙서
      ctx.strokeStyle = '#1f2322';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x + 11, y + 24);
      ctx.lineTo(x + 28, y + 34);
      ctx.moveTo(x + 28, y + 24);
      ctx.lineTo(x + 11, y + 34);
      ctx.moveTo(x + 12, y + 58);
      ctx.lineTo(x + 27, y + 62);
      ctx.moveTo(x + 12, y + 74);
      ctx.lineTo(x + 27, y + 78);
      ctx.stroke();
      break;
    }

    case 'crt-tv': {
      drawShadow(ctx, x + 6, y + 16, w - 12, h - 12);
      // 카트 스탠드
      ctx.fillStyle = '#2d3230';
      ctx.fillRect(x + 8, y + 46, w - 16, h - 46);
      // 레트로 CRT 본체
      ctx.fillStyle = '#3d443e';
      ctx.beginPath();
      ctx.roundRect(x + 4, y, w - 8, 52, 6);
      ctx.fill();
      // 기괴한 연두-노랑 CRT 글로우
      const flicker = 0.78 + Math.sin(timeSec * 9) * 0.08;
      ctx.fillStyle = `rgba(218, 228, 130, ${flicker})`;
      ctx.shadowColor = 'rgba(218, 228, 130, 0.75)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(x + 12, y + 8, w - 24, 34, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 스캔라인
      ctx.fillStyle = 'rgba(30, 36, 22, 0.28)';
      for (let sy = y + 12; sy < y + 40; sy += 5) {
        ctx.fillRect(x + 12, sy, w - 24, 1.5);
      }
      break;
    }

    case 'clone-table': {
      drawShadow(ctx, x + 4, y + 8, w - 8, h - 4);
      ctx.fillStyle = '#2a2f2e';
      ctx.fillRect(x, y + h - 10, w, 10);
      ctx.fillStyle = '#3b4140';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h - 8, 4);
      ctx.fill();
      ctx.strokeStyle = '#525b58';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 중앙 판별기 단말 화면
      ctx.fillStyle = '#202622';
      ctx.fillRect(x + w / 2 - 40, y + 12, 80, 28);
      ctx.fillStyle = '#d9e38a';
      ctx.font = '700 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHECK: OK', x + w / 2, y + 29);
      break;
    }

    case 'laptop-desk': {
      drawShadow(ctx, x + 2, y + 8, w - 4, h - 6);
      ctx.fillStyle = '#262a29';
      ctx.fillRect(x, y + h - 10, w, 10);
      ctx.fillStyle = '#393f3e';
      ctx.beginPath();
      ctx.roundRect(x, y + 8, w, h - 18, 4);
      ctx.fill();
      // 노트북 (은은한 연두 화면)
      ctx.fillStyle = '#1f2322';
      ctx.fillRect(x + 26, y + 18, 52, 34);
      ctx.fillStyle = '#b9c478';
      ctx.fillRect(x + 30, y + 22, 44, 20);
      // 쌓인 문서 더미
      ctx.fillStyle = '#5a615d';
      ctx.fillRect(x + 104, y + 20, 48, 34);
      ctx.fillStyle = '#737a75';
      ctx.fillRect(x + 110, y + 14, 42, 30);
      break;
    }

    case 'disposal-locker': {
      drawShadow(ctx, x + 2, y + 8, w - 4, h - 6);
      ctx.fillStyle = '#262b2a';
      ctx.fillRect(x, y + h - 10, w, 10);
      ctx.fillStyle = '#373d3c';
      ctx.beginPath();
      ctx.roundRect(x, y + 8, w, h - 18, 4);
      ctx.fill();
      // 보관함 박스 + 터미널
      ctx.fillStyle = '#2b302f';
      ctx.fillRect(x + 18, y + 16, 62, 42);
      ctx.strokeStyle = '#59615d';
      ctx.strokeRect(x + 18, y + 16, 62, 42);
      ctx.fillStyle = '#9aa678';
      ctx.font = '700 8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DISPOSED', x + 49, y + 40);
      // 오른쪽 노트북
      ctx.fillStyle = '#1e2221';
      ctx.fillRect(x + 102, y + 20, 52, 34);
      ctx.fillStyle = '#cfd984';
      ctx.fillRect(x + 106, y + 24, 44, 18);
      break;
    }

    case 'kiosk-terminal': {
      drawShadow(ctx, x + 6, y + 14, w - 12, h - 10);
      ctx.fillStyle = '#383e3c';
      ctx.beginPath();
      ctx.roundRect(x + 8, y, w - 16, h, 6);
      ctx.fill();
      ctx.fillStyle = '#dde68c';
      ctx.shadowColor = 'rgba(221, 230, 140, 0.7)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(x + 18, y + 16, w - 36, 36, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#242920';
      ctx.fillRect(x + 24, y + 24, w - 48, 3);
      ctx.fillRect(x + 24, y + 32, w - 58, 3);
      ctx.fillRect(x + 24, y + 40, w - 52, 3);
      break;
    }

    case 'exit-door': {
      // 문 본체
      ctx.fillStyle = '#2b2424';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#573636';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // 빨간 EXIT 사인
      ctx.save();
      ctx.fillStyle = '#e84545';
      ctx.shadowColor = 'rgba(255, 62, 62, 0.9)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(x + 12, y - 18, w - 24, 14, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff5f5';
      ctx.font = '800 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', x + w / 2, y - 8);
      ctx.restore();
      // 문손잡이
      ctx.fillStyle = '#c47a7a';
      ctx.beginPath();
      ctx.arc(x + 12, y + h / 2 + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.shadowBlur = 0;

  // 해결 완료된 문제 오브젝트는 우상단 체크 뱃지 표시
  if (solved) {
    drawSolvedBadge(ctx, x + w - 8, y + 10);
  }

  ctx.restore();
};

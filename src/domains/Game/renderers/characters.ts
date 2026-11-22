import type { CharacterSkin } from '../types';
import { getCachedSprite } from './spriteCache';

export interface DrawCharacterOptions {
  x: number;
  y: number;
  radius: number;
  skin: CharacterSkin;
  lookX?: number;
  lookY?: number;
  walkPhase?: number;
  isMoving?: boolean;
  isHighlighted?: boolean;
  displayTag?: string;
  spriteUrl?: string;
  timeSec: number;
}

const SKIN_PALETTE: Record<
  CharacterSkin,
  {
    body: string;
    shade: string;
    highlight: string;
    outline: string;
    eyeWhite: string;
    pupil: string;
    squishY: number;
  }
> = {
  white: {
    body: '#f4f2eb',
    shade: '#c8d6e5',
    highlight: '#ffffff',
    outline: '#1f222d',
    eyeWhite: '#1d202b',
    pupil: '#1d202b',
    squishY: 0.96,
  },
  red: {
    body: '#a3443a',
    shade: '#7c2f27',
    highlight: '#be5b4f',
    outline: '#1d161a',
    eyeWhite: '#f7f1e3',
    pupil: '#1d161a',
    squishY: 0.96,
  },
  dark: {
    body: '#2c2938',
    shade: '#1c1926',
    highlight: '#5d477a',
    outline: '#110f17',
    eyeWhite: '#f3f0e0',
    pupil: '#15141c',
    squishY: 0.96,
  },
  teal: {
    body: '#608788',
    shade: '#466769',
    highlight: '#7ca3a4',
    outline: '#172325',
    eyeWhite: '#f5f1e2',
    pupil: '#172325',
    squishY: 0.84,
  },
  clone: {
    body: '#2a2e2c',
    shade: '#1a1d1c',
    highlight: '#3d453f',
    outline: '#0e100f',
    eyeWhite: '#e6ec9e',
    pupil: '#e6ec9e',
    squishY: 0.94,
  },
};

export const drawBlobCharacter = (
  ctx: CanvasRenderingContext2D,
  opts: DrawCharacterOptions
) => {
  const {
    x,
    y,
    radius,
    skin,
    lookX = 0,
    lookY = 0,
    walkPhase = 0,
    isMoving = false,
    isHighlighted = false,
    displayTag,
    spriteUrl,
    timeSec,
  } = opts;

  const palette = SKIN_PALETTE[skin];
  const bob = isMoving
    ? Math.abs(Math.sin(walkPhase)) * -3.5
    : Math.sin(timeSec * 2.3 + x * 0.05) * 0.9;
  const rx = radius * (skin === 'teal' ? 1.12 : 1.0);
  const ry = radius * palette.squishY;
  const cy = y - ry * 0.45 + bob;

  ctx.save();

  // Stage 2 복제 NPC 바닥 구분 링 (스토리 기획안: 이름 앞 [NPC]와 바닥 표식으로 구분)
  if (skin === 'clone') {
    ctx.beginPath();
    ctx.ellipse(x, y + 4, rx + 7, ry * 0.55 + 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(218, 226, 132, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 상호작용 하이라이트 링
  if (isHighlighted) {
    ctx.beginPath();
    ctx.ellipse(x, y + 4, rx + 9, ry * 0.58 + 5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 224, 130, 0.92)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // 바닥 그림자
  ctx.beginPath();
  ctx.ellipse(x, y + 5, rx * 0.92, ry * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.fill();

  // 커스텀 스프라이트 이미지가 등록돼 있으면 바로 교체 렌더링
  const sprite = getCachedSprite(spriteUrl);
  if (sprite) {
    const size = radius * 2.5;
    ctx.drawImage(sprite, x - size / 2, cy - size / 2, size, size);
  } else {
    // 본체 원형
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.body;
    ctx.fill();

    // 입체 음영 (우하단 쉐이딩)
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.35, cy + ry * 0.38, rx * 0.95, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.shade;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x - rx * 0.12, cy - ry * 0.14, rx * 0.88, ry * 0.82, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.body;
    ctx.fill();

    // 상단 좌측 하이라이트 (시안 도트 캐릭터 반영)
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.42, cy - ry * 0.45, rx * 0.42, ry * 0.25, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = palette.highlight;
    ctx.globalAlpha = skin === 'dark' ? 0.55 : 0.35;
    ctx.fill();
    ctx.restore();

    // 윤곽선
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 빨간 캐릭터 우상단 작은 홈 디테일
    if (skin === 'red') {
      ctx.beginPath();
      ctx.arc(x + rx * 0.56, cy - ry * 0.62, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = palette.outline;
      ctx.fill();
    }

    // 눈 두 개 (이동 방향에 따라 미세하게 시선 이동)
    const eyeShiftX = Math.max(-2.6, Math.min(2.6, lookX * 2.6));
    const eyeShiftY = Math.max(-1.8, Math.min(1.8, lookY * 1.8));
    const eyeGap = rx * 0.34;
    const eyeY = cy + (skin === 'teal' ? 1.5 : 0.5) + eyeShiftY;

    if (skin === 'white') {
      // 흰 캐릭터: 깔끔한 작은 점 눈 두 개
      ctx.fillStyle = palette.pupil;
      ctx.beginPath();
      ctx.arc(x - eyeGap + eyeShiftX, eyeY, 2.3, 0, Math.PI * 2);
      ctx.arc(x + eyeGap + eyeShiftX, eyeY, 2.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (skin === 'clone') {
      // Stage 2 복제 부원: 미세하게 빛나는 두 눈
      ctx.save();
      ctx.shadowColor = 'rgba(230, 236, 158, 0.85)';
      ctx.shadowBlur = 7;
      ctx.fillStyle = palette.eyeWhite;
      ctx.beginPath();
      ctx.arc(x - eyeGap, eyeY, 2.5, 0, Math.PI * 2);
      ctx.arc(x + eyeGap, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (skin === 'teal') {
      // 부회장: 반쯤 감긴 나른한 눈
      for (const dir of [-1, 1]) {
        const ex = x + dir * eyeGap + eyeShiftX * 0.5;
        ctx.fillStyle = palette.eyeWhite;
        ctx.fillRect(ex - 4.2, eyeY - 1.5, 8.4, 5.2);
        ctx.fillStyle = palette.pupil;
        ctx.fillRect(ex - 1.6 + eyeShiftX * 0.3, eyeY - 0.3, 3.2, 3.2);
        // 반감긴 눈꺼풀 선
        ctx.fillStyle = palette.outline;
        ctx.fillRect(ex - 5, eyeY - 2.6, 10, 2.1);
      }
    } else {
      // 빨강/다크 캐릭터: 흰자 + 동공
      for (const dir of [-1, 1]) {
        const ex = x + dir * eyeGap + eyeShiftX * 0.55;
        ctx.fillStyle = palette.eyeWhite;
        ctx.beginPath();
        ctx.roundRect(ex - 3.6, eyeY - 3.8, 7.2, 7.6, 2);
        ctx.fill();

        ctx.fillStyle = palette.pupil;
        ctx.beginPath();
        ctx.arc(ex + eyeShiftX * 0.45, eyeY + eyeShiftY * 0.25, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // NPC 이름표
  if (displayTag) {
    ctx.font = '600 11px Pretendard, sans-serif';
    const textW = ctx.measureText(displayTag).width;
    const tagW = textW + 14;
    const tagH = 20;
    const tagX = x - tagW / 2;
    const tagY = cy - ry - 26;

    ctx.fillStyle =
      skin === 'clone' ? 'rgba(22, 26, 22, 0.86)' : 'rgba(20, 24, 34, 0.78)';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 6);
    ctx.fill();

    ctx.strokeStyle =
      skin === 'clone'
        ? 'rgba(220, 232, 138, 0.55)'
        : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = skin === 'clone' ? '#e7efa8' : '#f4f4f6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayTag, x, tagY + tagH / 2 + 0.5);
  }

  ctx.restore();
};

import type { RoomDefinition } from '../types';

const FRAME = 18;
const BACK_WALL_BOTTOM = 190;
const SIDE_TOP = 64;
const SIDE_BOTTOM = 44;

const drawRoomShell = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: {
    frame: string;
    backWall: string;
    leftWall: string;
    rightWall: string;
    floorTop: string;
    floorBottom: string;
    baseboard: string;
  }
) => {
  // 바깥 두꺼운 시안 스타일 테두리
  ctx.fillStyle = colors.frame;
  ctx.fillRect(0, 0, w, h);

  // 바닥 (약간 따뜻한/차가운 위-아래 그라데이션)
  const floorGrad = ctx.createLinearGradient(0, BACK_WALL_BOTTOM, 0, h - FRAME);
  floorGrad.addColorStop(0, colors.floorTop);
  floorGrad.addColorStop(1, colors.floorBottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(FRAME, BACK_WALL_BOTTOM, w - FRAME * 2, h - BACK_WALL_BOTTOM - FRAME);

  // 뒷벽
  ctx.fillStyle = colors.backWall;
  ctx.fillRect(SIDE_TOP, FRAME, w - SIDE_TOP * 2, BACK_WALL_BOTTOM - FRAME);

  // 왼쪽 벽 (2.5D 실내 원근)
  ctx.beginPath();
  ctx.moveTo(FRAME, FRAME);
  ctx.lineTo(SIDE_TOP, FRAME);
  ctx.lineTo(SIDE_TOP, BACK_WALL_BOTTOM);
  ctx.lineTo(SIDE_BOTTOM, h - FRAME);
  ctx.lineTo(FRAME, h - FRAME);
  ctx.closePath();
  ctx.fillStyle = colors.leftWall;
  ctx.fill();

  // 오른쪽 벽
  ctx.beginPath();
  ctx.moveTo(w - FRAME, FRAME);
  ctx.lineTo(w - SIDE_TOP, FRAME);
  ctx.lineTo(w - SIDE_TOP, BACK_WALL_BOTTOM);
  ctx.lineTo(w - SIDE_BOTTOM, h - FRAME);
  ctx.lineTo(w - FRAME, h - FRAME);
  ctx.closePath();
  ctx.fillStyle = colors.rightWall;
  ctx.fill();

  // 벽-바닥 경계선(걸레받이)
  ctx.strokeStyle = colors.baseboard;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SIDE_BOTTOM, h - FRAME);
  ctx.lineTo(SIDE_TOP, BACK_WALL_BOTTOM);
  ctx.lineTo(w - SIDE_TOP, BACK_WALL_BOTTOM);
  ctx.lineTo(w - SIDE_BOTTOM, h - FRAME);
  ctx.stroke();

  // 벽 코너 라인
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SIDE_TOP, FRAME);
  ctx.lineTo(SIDE_TOP, BACK_WALL_BOTTOM);
  ctx.moveTo(w - SIDE_TOP, FRAME);
  ctx.lineTo(w - SIDE_TOP, BACK_WALL_BOTTOM);
  ctx.stroke();

  // 벽 아래 소프트 그림자
  const wallShadow = ctx.createLinearGradient(0, BACK_WALL_BOTTOM, 0, BACK_WALL_BOTTOM + 24);
  wallShadow.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
  wallShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = wallShadow;
  ctx.fillRect(SIDE_TOP - 8, BACK_WALL_BOTTOM, w - (SIDE_TOP - 8) * 2, 24);
};

const drawWinterWindow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  timeSec: number,
  withBlinds: boolean
) => {
  ctx.save();
  // 창틀 외곽
  ctx.fillStyle = '#524943';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);

  // 겨울 밤하늘
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#0f1c2e');
  sky.addColorStop(1, '#1d324d');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // 겨울 나뭇가지 실루엣
  ctx.strokeStyle = '#2d3f58';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h);
  ctx.lineTo(x + w * 0.34, y + h * 0.42);
  ctx.lineTo(x + w * 0.52, y + h * 0.2);
  ctx.moveTo(x + w * 0.34, y + h * 0.56);
  ctx.lineTo(x + w * 0.14, y + h * 0.34);
  ctx.moveTo(x + w * 0.72, y + h);
  ctx.lineTo(x + w * 0.66, y + h * 0.48);
  ctx.lineTo(x + w * 0.84, y + h * 0.26);
  ctx.stroke();

  // 창문 하단 쌓인 눈
  ctx.fillStyle = '#c8d7ea';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + h + 2, w * 0.36, 9, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(x + w * 0.75, y + h + 2, w * 0.34, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // 내리는 눈송이
  ctx.fillStyle = 'rgba(230, 240, 255, 0.78)';
  for (let i = 0; i < 14; i++) {
    const sx = x + ((i * 37 + Math.sin(timeSec + i) * 6) % w);
    const sy = y + ((i * 19 + timeSec * (14 + (i % 4) * 4)) % h);
    ctx.beginPath();
    ctx.arc(sx, sy, i % 3 === 0 ? 1.8 : 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 블라인드 (로비 창문)
  if (withBlinds) {
    const blindH = h * 0.28;
    ctx.fillStyle = '#cbbca5';
    ctx.fillRect(x, y, w, blindH);
    ctx.strokeStyle = 'rgba(92, 76, 58, 0.35)';
    ctx.lineWidth = 1;
    for (let by = y + 4; by < y + blindH; by += 5) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
    }
    ctx.fillStyle = '#9e8e78';
    ctx.fillRect(x, y + blindH - 2, w, 3);
  }

  ctx.restore();

  // 창살
  ctx.strokeStyle = '#3c3633';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();

  // 창틀 선반
  ctx.fillStyle = '#7b6d5e';
  ctx.fillRect(x - 6, y + h + 2, w + 12, 5);
  ctx.restore();
};

const drawWallClock = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hourAngle: number,
  minuteAngle: number,
  darkTheme: boolean
) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = darkTheme ? '#3f4544' : '#30333c';
  ctx.fill();
  ctx.strokeStyle = darkTheme ? '#1c2020' : '#1b1d24';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.fillStyle = darkTheme ? '#545b5a' : '#262b36';
  ctx.fill();

  // 눈금
  ctx.strokeStyle = darkTheme ? '#aeb6b2' : '#d8d4c8';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
    ctx.lineTo(cx + Math.cos(a) * (r - 3.5), cy + Math.sin(a) * (r - 3.5));
    ctx.stroke();
  }

  // 시침/분침
  ctx.strokeStyle = darkTheme ? '#dfe5d5' : '#f5efe0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourAngle) * (r * 0.48), cy + Math.sin(hourAngle) * (r * 0.48));
  ctx.stroke();

  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minuteAngle) * (r * 0.7), cy + Math.sin(minuteAngle) * (r * 0.7));
  ctx.stroke();

  ctx.restore();
};

const drawCeilingLight = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  barColor: string,
  glowColor: string,
  glowRadius: number
) => {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const grad = ctx.createRadialGradient(cx, cy + 25, 10, cx, cy + 75, glowRadius);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - glowRadius, 18, glowRadius * 2, glowRadius * 1.4);

  ctx.fillStyle = barColor;
  ctx.shadowColor = barColor;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.restore();
};

export const drawRoomBackdrop = (
  ctx: CanvasRenderingContext2D,
  room: RoomDefinition,
  timeSec: number
) => {
  const { width: w, height: h, theme } = room;

  if (theme === 'lobby') {
    drawRoomShell(ctx, w, h, {
      frame: '#e5d4bb',
      backWall: '#d6c3a7',
      leftWall: '#c6b194',
      rightWall: '#baa487',
      floorTop: '#9c8971',
      floorBottom: '#b09b81',
      baseboard: '#7f6c56',
    });

    // 따뜻한 천장등 2개
    drawCeilingLight(ctx, 188, 28, 170, 10, '#fff4cf', 'rgba(255, 224, 152, 0.28)', 220);
    drawCeilingLight(ctx, 542, 28, 170, 10, '#fff4cf', 'rgba(255, 224, 152, 0.28)', 220);

    // 실제 동방 구조: 창 두 개 + 창 사이 시계
    drawWinterWindow(ctx, 154, 62, 232, 92, timeSec, true);
    drawWinterWindow(ctx, 514, 62, 232, 92, timeSec, true);
    drawWallClock(ctx, 450, 96, 20, -Math.PI * 0.32, Math.PI * 0.12, false);

    // 따뜻한 전체 조명 톤
    const warmWash = ctx.createRadialGradient(w / 2, 160, 40, w / 2, h / 2, 520);
    warmWash.addColorStop(0, 'rgba(255, 223, 160, 0.14)');
    warmWash.addColorStop(1, 'rgba(65, 42, 20, 0.08)');
    ctx.fillStyle = warmWash;
    ctx.fillRect(FRAME, FRAME, w - FRAME * 2, h - FRAME * 2);
    return;
  }

  if (theme === 'stage1') {
    drawRoomShell(ctx, w, h, {
      frame: '#d7cfe6',
      backWall: '#bfb6d3',
      leftWall: '#aba1c2',
      rightWall: '#9e94b5',
      floorTop: '#9289a6',
      floorBottom: '#a097b5',
      baseboard: '#756d89',
    });

    // 흰 천장등 2개 (밝고 차분한 오락실 분위기)
    drawCeilingLight(ctx, 176, 28, 185, 11, '#ffffff', 'rgba(244, 240, 255, 0.34)', 240);
    drawCeilingLight(ctx, 538, 28, 185, 11, '#ffffff', 'rgba(244, 240, 255, 0.34)', 240);

    // 오른쪽 뒤 눈 내리는 창문
    drawWinterWindow(ctx, 578, 62, 212, 92, timeSec, false);

    // 바닥 중앙 테이프 마킹 (시안 반영)
    ctx.save();
    ctx.strokeStyle = 'rgba(236, 232, 248, 0.65)';
    ctx.lineWidth = 4;
    // 좌상 대각선 마크
    ctx.beginPath();
    ctx.moveTo(318, 412);
    ctx.lineTo(342, 388);
    ctx.stroke();
    // 좌하 L 마크
    ctx.beginPath();
    ctx.moveTo(228, 488);
    ctx.lineTo(228, 512);
    ctx.lineTo(256, 512);
    ctx.stroke();
    // 우중 ㄱ 마크
    ctx.beginPath();
    ctx.moveTo(576, 444);
    ctx.lineTo(604, 444);
    ctx.lineTo(604, 470);
    ctx.stroke();
    ctx.restore();

    // 연보라 소프트 글로우
    const lavWash = ctx.createRadialGradient(w / 2, 240, 40, w / 2, h / 2, 480);
    lavWash.addColorStop(0, 'rgba(218, 200, 255, 0.14)');
    lavWash.addColorStop(1, 'rgba(54, 42, 82, 0.06)');
    ctx.fillStyle = lavWash;
    ctx.fillRect(FRAME, FRAME, w - FRAME * 2, h - FRAME * 2);
    return;
  }

  // STAGE 2: 어둡고 뒤틀린 동방
  drawRoomShell(ctx, w, h, {
    frame: '#3d4245',
    backWall: '#1b1e1e',
    leftWall: '#161919',
    rightWall: '#141717',
    floorTop: '#1c201f',
    floorBottom: '#151817',
    baseboard: '#2d3331',
  });

  // 관찰창 (창문 밖에도 같은 방, 노란 형광등 아래 복제 부원 3명 실루엣)
  const obsX = 248;
  const obsY = 44;
  const obsW = 398;
  const obsH = 128;
  ctx.save();
  ctx.fillStyle = '#2d3130';
  ctx.fillRect(obsX - 5, obsY - 5, obsW + 10, obsH + 10);

  // 안쪽 복제된 방
  const innerGrad = ctx.createLinearGradient(obsX, obsY, obsX, obsY + obsH);
  innerGrad.addColorStop(0, '#2a2f22');
  innerGrad.addColorStop(0.65, '#3b422d');
  innerGrad.addColorStop(1, '#20241b');
  ctx.fillStyle = innerGrad;
  ctx.fillRect(obsX, obsY, obsW, obsH);

  // 관찰방 안쪽 천장 형광등
  ctx.fillStyle = '#e8f19c';
  ctx.shadowColor = '#e8f19c';
  ctx.shadowBlur = 18;
  ctx.fillRect(obsX + obsW / 2 - 52, obsY + 12, 104, 6);
  ctx.shadowBlur = 0;

  // 관찰방 안쪽 문 윤곽
  ctx.fillStyle = 'rgba(20, 24, 18, 0.55)';
  ctx.fillRect(obsX + obsW - 58, obsY + 34, 34, 74);

  // 관찰방 안쪽 책상과 3명의 노란빛 복제 부원
  ctx.fillStyle = '#24271f';
  ctx.fillRect(obsX + 114, obsY + 84, 170, 30);
  const cloneXs = [obsX + 154, obsX + 199, obsX + 244];
  for (const cx of cloneXs) {
    ctx.fillStyle = '#e7ec9c';
    ctx.shadowColor = 'rgba(231, 236, 156, 0.65)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, obsY + 69, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 작은 눈
    ctx.fillStyle = '#23271e';
    ctx.beginPath();
    ctx.arc(cx - 4, obsY + 69, 1.6, 0, Math.PI * 2);
    ctx.arc(cx + 4, obsY + 69, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 유리 반사선
  ctx.strokeStyle = 'rgba(200, 220, 195, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(obsX + 22, obsY + obsH);
  ctx.lineTo(obsX + 74, obsY);
  ctx.moveTo(obsX + 42, obsY + obsH);
  ctx.lineTo(obsX + 86, obsY);
  ctx.stroke();

  // 관찰창이 바닥으로 드리우는 기괴한 연두-노랑 빛
  const obsGlow = ctx.createRadialGradient(
    obsX + obsW / 2,
    BACK_WALL_BOTTOM + 20,
    20,
    obsX + obsW / 2,
    BACK_WALL_BOTTOM + 90,
    280
  );
  obsGlow.addColorStop(0, 'rgba(218, 228, 128, 0.16)');
  obsGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = obsGlow;
  ctx.fillRect(100, BACK_WALL_BOTTOM, 700, 320);
  ctx.restore();

  // 서로 다른 시각 + 하나는 역회전하는 시계 두 개
  drawWallClock(ctx, 694, 72, 18, -Math.PI * 0.4, timeSec * 0.35, true);
  drawWallClock(ctx, 744, 72, 18, Math.PI * 0.22, -timeSec * 0.6, true);

  // 약한 실내 눈 연출 (왼쪽은 아래로, 오른쪽은 위로 천천히 이동 — 스토리 기획안 §6)
  ctx.save();
  ctx.fillStyle = 'rgba(210, 222, 214, 0.22)';
  for (let i = 0; i < 16; i++) {
    const isRight = i % 2 === 1;
    const baseX = isRight ? 470 + ((i * 53) % 340) : 80 + ((i * 59) % 340);
    const drift = timeSec * (isRight ? -11 : 12);
    const rawY = (i * 47 + drift) % 420;
    const py = 205 + (rawY < 0 ? rawY + 420 : rawY);
    ctx.beginPath();
    ctx.arc(baseX + Math.sin(timeSec + i) * 5, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

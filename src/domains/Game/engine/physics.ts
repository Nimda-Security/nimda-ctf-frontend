import type {
  InteractTarget,
  Point,
  Rect,
  RoomDefinition,
  RoomObject,
} from '../types';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const circleIntersectsRect = (
  cx: number,
  cy: number,
  radius: number,
  rect: Rect
): boolean => {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
};

export const circleIntersectsCircle = (
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean => {
  const dx = ax - bx;
  const dy = ay - by;
  const minDist = ar + br;
  return dx * dx + dy * dy < minDist * minDist;
};

const isBlockedAt = (
  x: number,
  y: number,
  radius: number,
  room: RoomDefinition
): boolean => {
  for (const obj of room.objects) {
    if (obj.collider && circleIntersectsRect(x, y, radius, obj.collider)) {
      return true;
    }
  }
  for (const npc of room.npcs) {
    if (npc.solid && circleIntersectsCircle(x, y, radius, npc.x, npc.y, npc.radius)) {
      return true;
    }
  }
  return false;
};

/**
 * 맵 좌표 기반 이동 충돌 처리.
 * 벽(walkBounds), 가구(collider), NPC(solid)를 통과하지 못하게 X/Y 축 분리 슬라이딩을 적용한다.
 */
export const moveWithCollision = (
  current: Point,
  dx: number,
  dy: number,
  radius: number,
  room: RoomDefinition
): Point => {
  const { walkBounds } = room;
  const minX = walkBounds.x + radius;
  const maxX = walkBounds.x + walkBounds.w - radius;
  const minY = walkBounds.y + radius;
  const maxY = walkBounds.y + walkBounds.h - radius;

  let nextX = clamp(current.x + dx, minX, maxX);
  let nextY = current.y;

  if (isBlockedAt(nextX, nextY, radius, room)) {
    nextX = current.x;
  }

  const candidateY = clamp(current.y + dy, minY, maxY);
  if (!isBlockedAt(nextX, candidateY, radius, room)) {
    nextY = candidateY;
  }

  return { x: nextX, y: nextY };
};

const objectInteractOrigin = (obj: RoomObject): Point =>
  obj.interactPoint ?? { x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 };

const distSq = (a: Point, b: Point) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

/**
 * 플레이어 맵 좌표를 기준으로 상호작용 반경 안에 있는 가장 가까운 오브젝트/NPC를 찾는다.
 */
export const findNearestInteractable = (
  player: Point,
  room: RoomDefinition
): InteractTarget | null => {
  let best: { target: InteractTarget; d2: number } | null = null;

  for (const obj of room.objects) {
    if (!obj.action) continue;
    const origin = objectInteractOrigin(obj);
    const radius = obj.interactRadius ?? 74;
    const d2 = distSq(player, origin);
    if (d2 <= radius * radius && (!best || d2 < best.d2)) {
      best = {
        d2,
        target: {
          id: obj.id,
          name: obj.name,
          x: obj.x + obj.w / 2,
          y: Math.max(obj.y - 10, 48),
          source: { kind: 'object', object: obj },
        },
      };
    }
  }

  for (const npc of room.npcs) {
    const radius = npc.interactRadius ?? 72;
    const d2 = distSq(player, npc);
    if (d2 <= radius * radius && (!best || d2 < best.d2)) {
      best = {
        d2,
        target: {
          id: npc.id,
          name: npc.name,
          x: npc.x,
          y: npc.y - npc.radius - 22,
          source: { kind: 'npc', npc },
        },
      };
    }
  }

  return best?.target ?? null;
};

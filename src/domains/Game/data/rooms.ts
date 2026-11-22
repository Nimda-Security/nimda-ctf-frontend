import type { RoomDefinition, RoomId } from '../types';

export const ROOM_WIDTH = 900;
export const ROOM_HEIGHT = 680;
export const PLAYER_RADIUS = 16;

export const ROOMS: Record<RoomId, RoomDefinition> = {
  // ============================================================================
  // LOBBY — 실제 동아리방 (따뜻한 조명, 창 2개, 시계, TV, 화이트보드, 책상 4개, 프린터, 거울)
  // ============================================================================
  lobby: {
    id: 'lobby',
    code: 'LOBBY',
    title: '동아리방 로비',
    subtitle: '실제 동방 · 안전한 대기 및 휴식 공간',
    theme: 'lobby',
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    walkBounds: { x: 64, y: 192, w: 772, h: 454 },
    spawns: {
      default: { x: 422, y: 408 },
      fromStage1: { x: 760, y: 492 },
    },
    objects: [
      // 왼쪽 벽 화이트보드 (벽 부착, 비충돌)
      {
        id: 'lobby-whiteboard',
        name: '화이트보드',
        kind: 'whiteboard',
        x: 20,
        y: 204,
        w: 44,
        h: 124,
        interactPoint: { x: 74, y: 266 },
        interactRadius: 72,
        sortY: 210,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '화이트보드',
              speakerRole: 'object',
              text: '지난 세미나 일정과 장난스러운 낙서들이 가득하다. 구석에 "오늘은 아무도 먼저 집에 가지 말기!"라고 적혀 있다.',
            },
            {
              speaker: '탐색 메모',
              speakerRole: 'system',
              text: '동아리방 곳곳의 물건에 가까이 가서 E 키로 조사할 수 있습니다. 오른쪽 문으로 가면 첫 번째 방(오락실)으로 이동합니다.',
            },
          ],
        },
      },

      // 왼쪽 창가 스탠바이미 TV (회장 메시지 & 안내)
      {
        id: 'lobby-tv',
        name: '스탠바이미 TV',
        kind: 'standby-tv',
        x: 102,
        y: 146,
        w: 112,
        h: 82,
        collider: { x: 112, y: 192, w: 92, h: 34 },
        interactPoint: { x: 158, y: 232 },
        interactRadius: 74,
        sortY: 226,
        action: {
          type: 'tv',
          targetRoom: 'stage1',
          lines: [
            {
              speaker: '시스템',
              speakerRole: 'system',
              text: 'TV가 지지직 켜지고 화면 속에 평행세계 서윤 회장이 나타난다.',
            },
            {
              speaker: '평행세계 서윤 회장',
              speakerRole: 'president',
              text: '다 왔냐ㅋㅋ 오늘 좀 재밌게 준비했어. 밖에 있는 나한테 물어봐도 소용없음. 걔는 몰라.',
            },
            {
              speaker: '평행세계 서윤 회장',
              speakerRole: 'president',
              text: '두 스테이지 끝까지 깨면 보내 줄게. 이건 약속. 일단 들어와. 첫 번째 방은 내 취향으로 꾸며 놨음.',
            },
            {
              speaker: '안내',
              speakerRole: 'system',
              text: '아래 [특별활동 참가]를 누르거나, 오른쪽 벽의 방 1 입구에서 E 키를 눌러 오락실로 이동할 수 있습니다. 로비로 언제든 돌아올 수 있습니다.',
            },
          ],
        },
      },

      // 창문 아래 옷걸이
      {
        id: 'lobby-coat-rack',
        name: '겨울 외투 행거',
        kind: 'coat-rack',
        x: 266,
        y: 150,
        w: 96,
        h: 74,
        collider: { x: 274, y: 192, w: 80, h: 30 },
        interactPoint: { x: 314, y: 228 },
        interactRadius: 62,
        sortY: 222,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '겨울 외투 행거',
              speakerRole: 'object',
              text: '부원들의 두꺼운 겨울 코트와 패딩이 걸려 있다. 창밖에는 조용히 눈이 내리고 있다.',
            },
          ],
        },
      },

      // 오른쪽 프린터 테이블
      {
        id: 'lobby-printer-table',
        name: '프린터 테이블',
        kind: 'printer-table',
        x: 724,
        y: 194,
        w: 110,
        h: 110,
        collider: { x: 730, y: 200, w: 100, h: 98 },
        interactPoint: { x: 724, y: 256 },
        interactRadius: 72,
        sortY: 298,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '프린터 테이블',
              speakerRole: 'object',
              text: '잉크가 늘 간당간당한 동방 프린터와 식어버린 커피 컵이 놓여 있다. 출력 대기열에 "완벽한_하루_기획안_최종_진짜최종.pdf"가 걸려 있다.',
            },
          ],
        },
      },

      // 오른쪽 전신 거울
      {
        id: 'lobby-mirror',
        name: '전신 거울',
        kind: 'mirror',
        x: 802,
        y: 314,
        w: 40,
        h: 112,
        collider: { x: 806, y: 318, w: 32, h: 102 },
        interactPoint: { x: 794, y: 370 },
        interactRadius: 68,
        sortY: 420,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '전신 거울',
              speakerRole: 'object',
              text: '동그란 눈 두 개가 거울 너머로 나를 빤히 쳐다보고 있다. 오늘따라 표정이 아주 결연해 보인다.',
            },
          ],
        },
      },

      // 오른쪽 벽 방 1 입장 지점 (오락실 이동)
      {
        id: 'lobby-door-stage1',
        name: '방 1 입구 (오락실)',
        kind: 'door-right',
        x: 830,
        y: 444,
        w: 32,
        h: 108,
        interactPoint: { x: 814, y: 498 },
        interactRadius: 78,
        sortY: 445,
        variant: { doorLabel: 'STAGE 1', doorTone: 'warm' },
        action: {
          type: 'portal',
          targetRoom: 'stage1',
          spawnKey: 'fromLobby',
        },
      },

      // ===== 중앙 책상 4개 + 색이 다른 의자 (책상 사이 통로 충분히 확보) =====
      // 좌상 책상 (노트북)
      {
        id: 'lobby-chair-tl-1',
        name: '회색 의자',
        kind: 'chair',
        x: 172,
        y: 280,
        w: 38,
        h: 30,
        variant: { chairColor: 'stone', facing: 'down' },
        sortY: 294,
      },
      {
        id: 'lobby-chair-tl-2',
        name: '청록 의자',
        kind: 'chair',
        x: 268,
        y: 280,
        w: 38,
        h: 30,
        variant: { chairColor: 'teal', facing: 'down' },
        sortY: 294,
      },
      {
        id: 'lobby-desk-tl',
        name: '왼쪽 앞 책상',
        kind: 'desk',
        x: 152,
        y: 296,
        w: 186,
        h: 62,
        collider: { x: 154, y: 292, w: 182, h: 78 },
        variant: { deskProp: 'laptop' },
        sortY: 358,
      },
      {
        id: 'lobby-chair-tl-3',
        name: '검은 회전의자',
        kind: 'chair',
        x: 176,
        y: 344,
        w: 44,
        h: 38,
        variant: { chairColor: 'charcoal', facing: 'up' },
        sortY: 378,
      },
      {
        id: 'lobby-chair-tl-4',
        name: '버건디 의자',
        kind: 'chair',
        x: 268,
        y: 344,
        w: 40,
        h: 34,
        variant: { chairColor: 'burgundy', facing: 'up' },
        sortY: 376,
      },

      // 우상 책상 (책상 위 큐브 — 상호작용 가능!)
      {
        id: 'lobby-chair-tr-1',
        name: '회색 의자',
        kind: 'chair',
        x: 526,
        y: 280,
        w: 38,
        h: 30,
        variant: { chairColor: 'stone', facing: 'down' },
        sortY: 294,
      },
      {
        id: 'lobby-chair-tr-2',
        name: '청록 의자',
        kind: 'chair',
        x: 622,
        y: 280,
        w: 38,
        h: 30,
        variant: { chairColor: 'teal', facing: 'down' },
        sortY: 294,
      },
      {
        id: 'lobby-desk-tr',
        name: '책상 위 큐브',
        kind: 'desk',
        x: 506,
        y: 296,
        w: 186,
        h: 62,
        collider: { x: 508, y: 292, w: 182, h: 78 },
        interactPoint: { x: 599, y: 332 },
        interactRadius: 118,
        variant: { deskProp: 'cube' },
        sortY: 358,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '책상 위 큐브',
              speakerRole: 'object',
              text: '한 면만 절묘하게 어긋나 있는 루빅스 큐브다. 누군가 맞추다 말고 그대로 두고 간 모양이다.',
            },
          ],
        },
      },
      {
        id: 'lobby-chair-tr-3',
        name: '버건디 의자',
        kind: 'chair',
        x: 530,
        y: 344,
        w: 40,
        h: 34,
        variant: { chairColor: 'burgundy', facing: 'up' },
        sortY: 376,
      },
      {
        id: 'lobby-chair-tr-4',
        name: '청록 회전의자',
        kind: 'chair',
        x: 620,
        y: 344,
        w: 44,
        h: 38,
        variant: { chairColor: 'teal', facing: 'up' },
        sortY: 378,
      },

      // 좌하 책상 (머그컵)
      {
        id: 'lobby-desk-bl',
        name: '왼쪽 뒤 책상',
        kind: 'desk',
        x: 152,
        y: 448,
        w: 186,
        h: 62,
        collider: { x: 154, y: 448, w: 182, h: 74 },
        variant: { deskProp: 'mug' },
        sortY: 510,
      },
      {
        id: 'lobby-chair-bl-1',
        name: '검은 회전의자',
        kind: 'chair',
        x: 176,
        y: 494,
        w: 44,
        h: 38,
        variant: { chairColor: 'charcoal', facing: 'up' },
        sortY: 528,
      },
      {
        id: 'lobby-chair-bl-2',
        name: '버건디 의자',
        kind: 'chair',
        x: 268,
        y: 494,
        w: 40,
        h: 34,
        variant: { chairColor: 'burgundy', facing: 'up' },
        sortY: 526,
      },

      // 우하 책상
      {
        id: 'lobby-desk-br',
        name: '오른쪽 뒤 책상',
        kind: 'desk',
        x: 506,
        y: 448,
        w: 186,
        h: 62,
        collider: { x: 508, y: 448, w: 182, h: 74 },
        variant: { deskProp: 'none' },
        sortY: 510,
      },
      {
        id: 'lobby-chair-br-1',
        name: '버건디 의자',
        kind: 'chair',
        x: 530,
        y: 494,
        w: 40,
        h: 34,
        variant: { chairColor: 'burgundy', facing: 'up' },
        sortY: 526,
      },
      {
        id: 'lobby-chair-br-2',
        name: '검은 회전의자',
        kind: 'chair',
        x: 620,
        y: 494,
        w: 44,
        h: 38,
        variant: { chairColor: 'charcoal', facing: 'up' },
        sortY: 528,
      },

      // ===== 하단 가전/가구 (시안 배치 그대로) =====
      {
        id: 'lobby-cabinet',
        name: '수납장과 택배 상자',
        kind: 'cabinet-box',
        x: 84,
        y: 590,
        w: 96,
        h: 58,
        collider: { x: 86, y: 594, w: 92, h: 52 },
        sortY: 648,
      },
      {
        id: 'lobby-fridge',
        name: '동방 냉장고',
        kind: 'mini-fridge',
        x: 244,
        y: 590,
        w: 70,
        h: 58,
        collider: { x: 246, y: 594, w: 66, h: 52 },
        interactPoint: { x: 279, y: 590 },
        interactRadius: 68,
        sortY: 648,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '동방 냉장고',
              speakerRole: 'object',
              text: '앞면에 포스트잇이 붙어 있다. "이름 안 쓴 음료수는 선착순 공용입니다."',
            },
          ],
        },
      },
      {
        id: 'lobby-arcade-mini',
        name: '죽림고수 게임기',
        kind: 'mini-arcade',
        x: 374,
        y: 590,
        w: 70,
        h: 58,
        collider: { x: 376, y: 594, w: 66, h: 52 },
        interactPoint: { x: 409, y: 590 },
        interactRadius: 68,
        sortY: 648,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '죽림고수 게임기',
              speakerRole: 'object',
              text: '냉장고 오른쪽에 놓인 번외 미니게임기다. 이번 프로토타입에서는 대기 화면만 켜져 있다.',
            },
          ],
        },
      },
      {
        id: 'lobby-copier',
        name: '복합기',
        kind: 'copier',
        x: 562,
        y: 590,
        w: 96,
        h: 58,
        collider: { x: 564, y: 594, w: 92, h: 52 },
        sortY: 648,
      },
    ],
    npcs: [
      {
        id: 'npc-vice-president',
        name: '부회장 NPC',
        displayTag: '부회장',
        skin: 'teal',
        x: 448,
        y: 248,
        radius: 17,
        solid: true,
        interactRadius: 74,
        lines: [
          {
            speaker: '부회장',
            speakerRole: 'vice',
            text: '어, 왔구나! 평행세계 회장이 또 거창하게 판을 깔아 놨더라고. 일단 TV에 뜬 메시지부터 한 번 봐 봐.',
          },
          {
            speaker: '부회장',
            speakerRole: 'vice',
            text: '조작은 WASD나 방향키로 이동, 물건 근처에서 E 키로 조사하면 돼. 팝업은 Esc로 닫을 수 있고.',
          },
          {
            speaker: '부회장',
            speakerRole: 'vice',
            text: '참고로 난 그냥 로비 안내 담당이야. 배후도 아니고 문제 정답도 절대 안 알려 주니까 괜히 떠보지 마라ㅋㅋ',
          },
          {
            speaker: '부회장',
            speakerRole: 'vice',
            text: '준비되면 오른쪽 문으로 들어가서 첫 번째 방부터 둘러봐. 쉬고 싶으면 언제든 로비로 돌아와도 돼!',
          },
        ],
      },
    ],
  },

  // ============================================================================
  // STAGE 1 — 회장 취향 100% 오락실 (흰 천장등, 밝고 차분한 연보라 톤)
  // ============================================================================
  stage1: {
    id: 'stage1',
    code: 'STAGE 1',
    title: '회장 취향 100% 오락실',
    subtitle: '흰 천장등과 연보라 게임기 · 5개의 기념품을 모아보자',
    theme: 'stage1',
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    walkBounds: { x: 64, y: 192, w: 772, h: 454 },
    spawns: {
      default: { x: 158, y: 486 },
      fromLobby: { x: 158, y: 486 },
      fromStage2: { x: 746, y: 476 },
    },
    objects: [
      // 뒤 왼쪽 구석 마네킹 (복선 소품)
      {
        id: 'stage1-mannequin',
        name: '구석 마네킹',
        kind: 'mannequin',
        x: 92,
        y: 146,
        w: 58,
        h: 98,
        collider: { x: 98, y: 196, w: 46, h: 44 },
        interactPoint: { x: 124, y: 244 },
        interactRadius: 72,
        sortY: 242,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '구석 마네킹',
              speakerRole: 'object',
              text: '부원들과 묘하게 비슷한 옷차림을 한 마네킹이 서 있다. 처음에는 단순한 스킨 전시처럼 보인다.',
            },
          ],
        },
      },

      // 뒤 왼쪽 벽 게시판 & 포스터
      {
        id: 'stage1-bulletin',
        name: '게시판과 포스터',
        kind: 'bulletin-board',
        x: 186,
        y: 108,
        w: 136,
        h: 72,
        interactPoint: { x: 254, y: 204 },
        interactRadius: 78,
        sortY: 190,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '게시판',
              speakerRole: 'object',
              text: '‘종강하면 하고 싶은 것’ 목록이 붙어 있다. — 같이 게임하기, 시간 신경 안 쓰기, 아무도 먼저 집에 가지 않기, 준비만 하지 않기.',
            },
            {
              speaker: '헌터×헌터 포스터',
              speakerRole: 'object',
              text: '게시판 옆 작은 포스터 귀퉁이에 메모가 적혀 있다. "클로로 정말 잘생겼다…"',
            },
          ],
        },
      },

      // R1: 뒤 중앙 달리기 게임기
      {
        id: 'stage1-runner',
        name: '달리기 게임기',
        kind: 'arcade-runner',
        x: 382,
        y: 136,
        w: 136,
        h: 126,
        collider: { x: 388, y: 194, w: 124, h: 64 },
        interactPoint: { x: 450, y: 266 },
        interactRadius: 84,
        sortY: 260,
        action: {
          type: 'challenge',
          challengeId: 'R1',
        },
      },

      // R2: 왼쪽 벽 리듬 게임기
      {
        id: 'stage1-rhythm',
        name: '리듬 게임기',
        kind: 'arcade-rhythm',
        x: 78,
        y: 288,
        w: 112,
        h: 128,
        collider: { x: 84, y: 312, w: 100, h: 98 },
        interactPoint: { x: 190, y: 360 },
        interactRadius: 86,
        sortY: 412,
        action: {
          type: 'challenge',
          challengeId: 'R2',
        },
      },

      // W1: 오른쪽 벽 캐릭터 꾸미기 부스
      {
        id: 'stage1-booth',
        name: '캐릭터 꾸미기 부스',
        kind: 'photo-booth',
        x: 710,
        y: 264,
        w: 112,
        h: 132,
        collider: { x: 716, y: 292, w: 100, h: 98 },
        interactPoint: { x: 708, y: 342 },
        interactRadius: 84,
        sortY: 392,
        action: {
          type: 'challenge',
          challengeId: 'W1',
        },
      },

      // 왼쪽 벽 하단: 로비로 돌아가기
      {
        id: 'stage1-door-lobby',
        name: '로비로 돌아가기',
        kind: 'door-left',
        x: 38,
        y: 440,
        w: 32,
        h: 98,
        interactPoint: { x: 84, y: 488 },
        interactRadius: 78,
        sortY: 442,
        variant: { doorLabel: 'LOBBY', doorTone: 'lavender' },
        action: {
          type: 'portal',
          targetRoom: 'lobby',
          spawnKey: 'fromStage1',
        },
      },

      // 오른쪽 벽 하단: 방 2 입구 (완벽한 동아리)
      {
        id: 'stage1-door-stage2',
        name: '방 2 입구 (완벽한 동아리)',
        kind: 'door-right',
        x: 830,
        y: 428,
        w: 32,
        h: 100,
        interactPoint: { x: 814, y: 478 },
        interactRadius: 78,
        sortY: 430,
        variant: { doorLabel: 'STAGE 2', doorTone: 'lavender' },
        action: {
          type: 'portal',
          targetRoom: 'stage2',
          spawnKey: 'fromStage1',
          requiresStage1Complete: true,
        },
      },

      // F1: 왼쪽 아래 카운터 USB
      {
        id: 'stage1-counter-usb',
        name: '카운터 USB',
        kind: 'counter-usb',
        x: 86,
        y: 554,
        w: 174,
        h: 86,
        collider: { x: 90, y: 562, w: 166, h: 74 },
        interactPoint: { x: 176, y: 556 },
        interactRadius: 88,
        sortY: 638,
        action: {
          type: 'challenge',
          challengeId: 'F1',
        },
      },

      // P1: 오른쪽 아래 경품 교환기
      {
        id: 'stage1-prize-kiosk',
        name: '경품 교환기',
        kind: 'prize-kiosk',
        x: 682,
        y: 546,
        w: 132,
        h: 94,
        collider: { x: 688, y: 556, w: 120, h: 78 },
        interactPoint: { x: 744, y: 548 },
        interactRadius: 86,
        sortY: 638,
        action: {
          type: 'challenge',
          challengeId: 'P1',
        },
      },
    ],
    npcs: [],
  },

  // ============================================================================
  // STAGE 2 — 완벽한 동아리 (어두운 뒤틀린 동방, 관찰창, 복제 부원 NPC, 붉은 EXIT)
  // ============================================================================
  stage2: {
    id: 'stage2',
    code: 'STAGE 2',
    title: '완벽한 동아리',
    subtitle: '뒤틀린 동방 · 출구 조각 5개를 모아 탈출하자',
    theme: 'stage2',
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    walkBounds: { x: 64, y: 192, w: 772, h: 454 },
    spawns: {
      default: { x: 158, y: 438 },
      fromStage1: { x: 158, y: 438 },
    },
    objects: [
      // 왼쪽 벽 뒤틀린 화이트보드
      {
        id: 'stage2-whiteboard',
        name: '뒤틀린 화이트보드',
        kind: 'distorted-whiteboard',
        x: 20,
        y: 252,
        w: 44,
        h: 118,
        interactPoint: { x: 76, y: 312 },
        interactRadius: 74,
        sortY: 256,
        action: {
          type: 'dialogue',
          lines: [
            {
              speaker: '화이트보드',
              speakerRole: 'object',
              text: '‘오늘 끝낼 것’이 여러 번 거칠게 지워지고, 그 위에 ‘끝내지 말 것’이라고 덧씌워져 있다.',
            },
            {
              speaker: '평행세계 서윤 회장',
              speakerRole: 'president',
              text: '어려운 건 고쳤어. 싫다는 건 다 뺐고. …아니. 아직 덜 고쳤나? 괜찮아. 더 고치면 돼.',
            },
          ],
        },
      },

      // W2: 왼쪽 위 출석·평가 단말 (기괴한 노란 CRT TV)
      {
        id: 'stage2-crt',
        name: '출석·평가 단말',
        kind: 'crt-tv',
        x: 84,
        y: 162,
        w: 84,
        h: 92,
        collider: { x: 90, y: 196, w: 72, h: 54 },
        interactPoint: { x: 132, y: 258 },
        interactRadius: 82,
        sortY: 252,
        action: {
          type: 'challenge',
          challengeId: 'W2',
        },
      },

      // R3: 뒤 중앙 부원 판별기 (복제 부원 앞 테이블)
      {
        id: 'stage2-verifier',
        name: '부원 판별기',
        kind: 'clone-table',
        x: 300,
        y: 274,
        w: 300,
        h: 62,
        collider: { x: 304, y: 278, w: 292, h: 54 },
        interactPoint: { x: 450, y: 342 },
        interactRadius: 96,
        sortY: 334,
        action: {
          type: 'challenge',
          challengeId: 'R3',
        },
      },

      // 뒤 오른쪽 빨간 EXIT 탈출 문
      {
        id: 'stage2-exit-door',
        name: '탈출구 (출구 문)',
        kind: 'exit-door',
        x: 750,
        y: 122,
        w: 68,
        h: 82,
        interactPoint: { x: 784, y: 214 },
        interactRadius: 82,
        sortY: 194,
        variant: { doorLabel: 'EXIT', doorTone: 'exit' },
        action: {
          type: 'stage2-exit',
        },
      },

      // 왼쪽 벽: 오락실(방 1)로 돌아가기
      {
        id: 'stage2-door-stage1',
        name: '방 1 (오락실)로 돌아가기',
        kind: 'door-left',
        x: 38,
        y: 392,
        w: 32,
        h: 98,
        interactPoint: { x: 84, y: 440 },
        interactRadius: 78,
        sortY: 394,
        variant: { doorLabel: 'STAGE 1', doorTone: 'dark' },
        action: {
          type: 'portal',
          targetRoom: 'stage1',
          spawnKey: 'fromStage2',
        },
      },

      // W3: 오른쪽 벽 건의함·결재 단말
      {
        id: 'stage2-kiosk',
        name: '건의함·결재 단말',
        kind: 'kiosk-terminal',
        x: 740,
        y: 356,
        w: 88,
        h: 102,
        collider: { x: 746, y: 374, w: 76, h: 80 },
        interactPoint: { x: 736, y: 414 },
        interactRadius: 84,
        sortY: 454,
        action: {
          type: 'challenge',
          challengeId: 'W3',
        },
      },

      // F2: 왼쪽 아래 제작용 노트북
      {
        id: 'stage2-laptop',
        name: '제작용 노트북',
        kind: 'laptop-desk',
        x: 92,
        y: 552,
        w: 184,
        h: 84,
        collider: { x: 96, y: 560, w: 176, h: 72 },
        interactPoint: { x: 184, y: 554 },
        interactRadius: 88,
        sortY: 636,
        action: {
          type: 'challenge',
          challengeId: 'F2',
        },
      },

      // P2: 오른쪽 아래 폐기 부원 보관함
      {
        id: 'stage2-disposal',
        name: '폐기 부원 보관함',
        kind: 'disposal-locker',
        x: 638,
        y: 546,
        w: 184,
        h: 90,
        collider: { x: 644, y: 556, w: 172, h: 76 },
        interactPoint: { x: 728, y: 550 },
        interactRadius: 88,
        sortY: 636,
        action: {
          type: 'challenge',
          challengeId: 'P2',
        },
      },
    ],
    npcs: [
      {
        id: 'npc-clone-1',
        name: '[NPC] 복제 부원 A',
        displayTag: '[NPC] 복제 부원',
        skin: 'clone',
        x: 364,
        y: 256,
        radius: 16,
        solid: true,
        interactRadius: 72,
        lines: [
          {
            speaker: '[NPC] 복제 부원',
            speakerRole: 'clone',
            text: '재밌어요. 계속할 수 있어요. 회장님 말씀이 다 맞습니다.',
          },
          {
            speaker: '평행세계 서윤 회장',
            speakerRole: 'president',
            text: '너희 말고. 지금 들어온 애들한테 물었잖아. — 너희는?',
          },
        ],
      },
      {
        id: 'npc-clone-2',
        name: '[NPC] 복제 부원 B',
        displayTag: '[NPC] 복제 부원',
        skin: 'clone',
        x: 450,
        y: 256,
        radius: 16,
        solid: true,
        interactRadius: 72,
        lines: [
          {
            speaker: '[NPC] 복제 부원',
            speakerRole: 'clone',
            text: '재밌어요. 재밌어요. 재밌어요. 다음 활동을 시작할까요?',
          },
          {
            speaker: '평행세계 서윤 회장',
            speakerRole: 'president',
            text: '걔네는 여기서 늘 같은 걸 골라. 너희는 왜 자꾸 이상한 방법으로 푸냐ㅋㅋ',
          },
        ],
      },
      {
        id: 'npc-clone-3',
        name: '[NPC] 복제 부원 C',
        displayTag: '[NPC] 복제 부원',
        skin: 'clone',
        x: 536,
        y: 256,
        radius: 16,
        solid: true,
        interactRadius: 72,
        lines: [
          {
            speaker: '[NPC] 복제 부원',
            speakerRole: 'clone',
            text: '거절하지 않습니다. 집에 가지 않습니다. 완벽한 하루입니다.',
          },
        ],
      },
    ],
  },
};

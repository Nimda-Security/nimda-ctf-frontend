import type { ChallengeData, SouvenirData } from '../types';

/**
 * 로컬 프로토타입용 문제 & 기념품 데이터.
 * 추후 실제 CTF 백엔드 API(플래그 채점, 팀 인벤토리, 첨부파일/인스턴스)로 교체한다.
 */
export const CHALLENGES: ChallengeData[] = [
  // ======================== STAGE 1: 회장 취향 100% 오락실 ========================
  {
    id: 'F1',
    stage: 'stage1',
    objectName: '카운터 USB',
    title: '예전 행사 사진 복구',
    category: 'FORENSICS',
    difficulty: 'Stage 1',
    points: 100,
    flavorQuote: '라벨: "예전 행사 사진" · 쪽지: "추억은 소중하니까 지우지 마셈"',
    description:
      '카운터 위 USB에서 삭제된 예전 동아리 행사 사진과 기록을 복구해 숨겨진 플래그를 찾으세요. (프로토타입에서는 아래 개발용 테스트 플래그로 제출을 확인할 수 있습니다.)',
    artifactHint: '배포 예정: club_memories_usb.img (삭제 파일 복구)',
    testFlag: 'NIMDA{f1_faded_photo}',
    souvenir: {
      id: 'souvenir-f1',
      name: '빛바랜 참가 사진',
      stage: 'stage1',
      icon: '📷',
      challengeId: 'F1',
      challengeTitle: '예전 행사 사진 복구',
      category: 'FORENSICS',
      story:
        '비슷한 구도의 행사 사진이 여러 장이다. 닮은 얼굴들인데 표정이 조금씩 다르다.',
    },
  },
  {
    id: 'R1',
    stage: 'stage1',
    objectName: '달리기 게임기',
    title: '봉인된 달리기 게임',
    category: 'REVERSING',
    difficulty: '실버 3~4',
    points: 100,
    flavorQuote:
      '"5년 전까지만 해도 열심히 했는데, 요즘은 잘 안 해…" · 시작하기도 전에 GAME OVER. 쪽지: "실력 차이 ㅋㅋ"',
    description:
      '정상 진행을 막아 둔 달리기 게임 바이너리를 디버깅하고 패치해 봉인된 클리어 화면의 플래그를 획득하세요.',
    artifactHint: '배포 예정: runner_arcade.zip (디버깅 · 패치)',
    testFlag: 'NIMDA{r1_sealed_runner}',
    souvenir: {
      id: 'souvenir-r1',
      name: '봉인된 플레이 화면',
      stage: 'stage1',
      icon: '🏃',
      challengeId: 'R1',
      challengeTitle: '봉인된 달리기 게임',
      category: 'REVERSING',
      story:
        '난도·연출을 여러 번 수정한 흔적. ‘이번엔 다 같이 할 수 있음’이라는 메모가 남아 있다.',
    },
  },
  {
    id: 'R2',
    stage: 'stage1',
    objectName: '리듬 게임기',
    title: 'KING — 숨겨진 곡 해금',
    category: 'REVERSING',
    difficulty: '브론즈 2~4',
    points: 100,
    flavorQuote:
      '"이거 진짜 재미있어! 같이 할래?" · C·V·B·N 키와 잠긴 곡 KING이 보인다.',
    description:
      '리듬 게임기의 숨겨진 곡 KING 해금 로직을 분석하세요. XOR·회전·배열 검색으로 검증되는 입력값을 역산하면 플래그를 얻을 수 있습니다.',
    artifactHint: '배포 예정: cvbn_king.zip (XOR · 회전 · 배열 검색 역산)',
    testFlag: 'NIMDA{r2_king_rhythm}',
    souvenir: {
      id: 'souvenir-r2',
      name: '플레이 분석표',
      stage: 'stage1',
      icon: '🎵',
      challengeId: 'R2',
      challengeTitle: 'KING — 숨겨진 곡 해금',
      category: 'REVERSING',
      story:
        '점수보다 재도전·흥미·도움 요청·중단 시점을 집요하게 기록한다.',
    },
  },
  {
    id: 'W1',
    stage: 'stage1',
    objectName: '캐릭터 꾸미기 부스',
    title: '나만의 캐릭터 등록',
    category: 'WEB',
    difficulty: '브론즈 2',
    points: 100,
    flavorQuote:
      '"나만의 캐릭터를 등록하세요!" · 작은 안내문: "등록된 이미지는 다른 용도로 활용될 수 있습니다."',
    description:
      '프로필·스킨 등록 웹 서비스의 파일 업로드 검증 취약점을 분석하고 웹 쉘을 통해 서버의 플래그를 읽어오세요.',
    artifactHint: '인스턴스 예정: 캐릭터 꾸미기 웹 서비스 (파일 업로드 · 웹 쉘)',
    testFlag: 'NIMDA{w1_character_card}',
    souvenir: {
      id: 'souvenir-w1',
      name: '캐릭터 등록증',
      stage: 'stage1',
      icon: '🪪',
      challengeId: 'W1',
      challengeTitle: '나만의 캐릭터 등록',
      category: 'WEB',
      story: '등록 용도가 ‘부원 외형 제작’으로 적혀 있다.',
    },
  },
  {
    id: 'P1',
    stage: 'stage1',
    objectName: '경품 교환기',
    title: '맞춤 경품 추천 시스템',
    category: 'PWN',
    difficulty: '브론즈 2',
    points: 100,
    flavorQuote: '"귀하와 가장 비슷한 상품을 추천해 드립니다."',
    description:
      '이름과 정보를 입력받아 경품을 추천하는 바이너리에서 struct person_t 구조와 스택 레이아웃을 분석하고 canary를 우회해 플래그를 획득하세요.',
    artifactHint: '배포/인스턴스 예정: prize_kiosk (스택 오버플로우 · canary 우회)',
    testFlag: 'NIMDA{p1_prototype_voucher}',
    souvenir: {
      id: 'souvenir-p1',
      name: '시제품 교환권',
      stage: 'stage1',
      icon: '🎟️',
      challengeId: 'P1',
      challengeTitle: '맞춤 경품 추천 시스템',
      category: 'PWN',
      story: '경품명 ‘신규 부원’. 수량은 해당 팀 인원수.',
    },
  },

  // ======================== STAGE 2: 완벽한 동아리 ========================
  {
    id: 'F2',
    stage: 'stage2',
    objectName: '제작용 노트북',
    title: '수정 로그의 변질',
    category: 'FORENSICS',
    difficulty: 'Stage 2',
    points: 200,
    flavorQuote:
      '노트북 화면에 지워진 수정 이력이 깜빡인다. 초기 게임 패치 기록이 어느 순간부터 다른 항목으로 바뀌어 있다.',
    description:
      '초기 게임 수정 기록이 참가자 반응 수정 기록으로 변질된 흔적과 삭제 로그를 분석해 플래그를 복구하세요.',
    artifactHint: '배포 예정: dev_laptop_logs.tar.gz (삭제 기록 · 수정 흔적 분석)',
    testFlag: 'NIMDA{f2_edit_history}',
    souvenir: {
      id: 'souvenir-f2',
      name: '출구 조각 ①',
      stage: 'stage2',
      icon: '🧩',
      challengeId: 'F2',
      challengeTitle: '수정 로그의 변질',
      category: 'FORENSICS',
      story:
        '처음에는 게임만 수정했다. 어느 순간부터 참가자 반응을 수정하기 시작했다.',
    },
  },
  {
    id: 'R3',
    stage: 'stage2',
    objectName: '부원 판별기',
    title: '정상 부원 적합성 검사',
    category: 'REVERSING',
    difficulty: 'Stage 2',
    points: 200,
    flavorQuote:
      '관찰창 앞 단말이 깜빡인다. [상태: 흥미 있음 → 통과 / 그 외 → 오류]',
    description:
      '‘흥미 있음’ 반응만 정상으로 인정하는 부원 판별기 프로그램을 역분석해 검증을 통과하는 플래그를 추출하세요.',
    artifactHint: '배포 예정: member_verifier.zip (역산 · 안티 디버깅)',
    testFlag: 'NIMDA{r3_member_check}',
    souvenir: {
      id: 'souvenir-r3',
      name: '출구 조각 ②',
      stage: 'stage2',
      icon: '🧩',
      challengeId: 'R3',
      challengeTitle: '정상 부원 적합성 검사',
      category: 'REVERSING',
      story: '거절·중단·예상 밖 선택은 오류로 분류된다.',
    },
  },
  {
    id: 'P2',
    stage: 'stage2',
    objectName: '폐기 부원 보관함',
    title: '폐기 완료된 인사',
    category: 'PWN',
    difficulty: '실버 3',
    points: 200,
    flavorQuote:
      '폐기 완료라고 적혀 있다. 그런데 안쪽에서 인사 소리가 난다. "안녕하세요! 활동 너무 재밌어요!"',
    description:
      '부원을 생성·조회·폐기하는 관리 프로그램의 Use-After-Free(UAF) 취약점을 이용해 숨겨진 플래그를 획득하세요.',
    artifactHint: '배포/인스턴스 예정: disposal_mgr (UAF · uaf_overwrite)',
    testFlag: 'NIMDA{p2_disposed_uaf}',
    souvenir: {
      id: 'souvenir-p2',
      name: '출구 조각 ③',
      stage: 'stage2',
      icon: '🧩',
      challengeId: 'P2',
      challengeTitle: '폐기 완료된 인사',
      category: 'PWN',
      story:
        '잘 따르는 복제품도 계속 폐기됐다. 사유는 ‘반응이 예상됨. 재미없음.’',
    },
  },
  {
    id: 'W2',
    stage: 'stage2',
    objectName: '출석·평가 단말',
    title: '만점짜리 만족도 보고서',
    category: 'WEB',
    difficulty: '브론즈 2',
    points: 200,
    flavorQuote:
      '평가표 낙서: ‘재밌다고 했음’에 여러 번 밑줄. 옆에는 ‘근데 왜 나가지?’.',
    description:
      '출석·만족도·실패 보고서가 저장된 관리 페이지의 WAF 필터를 우회하고 SQL Injection으로 숨겨진 기록과 플래그를 조회하세요.',
    artifactHint: '인스턴스 예정: attendance-portal (SQLi · WAF 우회)',
    testFlag: 'NIMDA{w2_perfect_score}',
    souvenir: {
      id: 'souvenir-w2',
      name: '출구 조각 ④',
      stage: 'stage2',
      icon: '🧩',
      challengeId: 'W2',
      challengeTitle: '만점짜리 만족도 보고서',
      category: 'WEB',
      story:
        '출석률과 만족도는 만점인데, 회장의 실제 플레이 시간은 거의 없다.',
    },
  },
  {
    id: 'W3',
    stage: 'stage2',
    objectName: '건의함·결재 단말',
    title: '읽기만 하는 건의함',
    category: 'WEB',
    difficulty: '실버 4',
    points: 200,
    flavorQuote: '"회장님이 모든 건의를 직접 읽습니다." · 아래 낙서: "읽기만 함".',
    description:
      '회장 계정이 게시물을 자동 검토하는 건의함 서비스에서 CSRF 취약점을 이용해 승인 권한을 실행하고 플래그를 획득하세요.',
    artifactHint: '인스턴스 예정: suggestion-box (CSRF Advanced)',
    testFlag: 'NIMDA{w3_read_only_box}',
    souvenir: {
      id: 'souvenir-w3',
      name: '출구 조각 ⑤',
      stage: 'stage2',
      icon: '🧩',
      challengeId: 'W3',
      challengeTitle: '읽기만 하는 건의함',
      category: 'WEB',
      story:
        '칭찬과 승인 반응은 모두 미리 정해졌다. 실제 대화는 남아 있지 않다.',
    },
  },
];

export const CHALLENGE_BY_ID: Record<string, ChallengeData> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c])
);

export const ALL_SOUVENIRS: SouvenirData[] = CHALLENGES.map((c) => c.souvenir);

export const SOUVENIR_BY_ID: Record<string, SouvenirData> = Object.fromEntries(
  ALL_SOUVENIRS.map((s) => [s.id, s])
);

export const STAGE1_SOUVENIRS = ALL_SOUVENIRS.filter((s) => s.stage === 'stage1');
export const STAGE2_SOUVENIRS = ALL_SOUVENIRS.filter((s) => s.stage === 'stage2');

export interface LocalFlagCheckResult {
  correct: boolean;
  alreadySolved: boolean;
  souvenir: SouvenirData | null;
}

/**
 * 로컬 테스트용 플래그 검증.
 * 추후 서버 API(`/api/ctf/challenge/:id`) 응답으로 대체할 수 있도록 인터페이스를 분리한다.
 */
export const verifyLocalFlag = (
  challengeId: string,
  submittedFlag: string,
  solvedIds: string[]
): LocalFlagCheckResult => {
  const challenge = CHALLENGE_BY_ID[challengeId];
  if (!challenge) {
    return { correct: false, alreadySolved: false, souvenir: null };
  }
  const normalized = submittedFlag.trim();
  const isCorrect = normalized === challenge.testFlag;
  if (!isCorrect) {
    return { correct: false, alreadySolved: false, souvenir: null };
  }
  const alreadySolved = solvedIds.includes(challengeId);
  return {
    correct: true,
    alreadySolved,
    souvenir: alreadySolved ? null : challenge.souvenir,
  };
};

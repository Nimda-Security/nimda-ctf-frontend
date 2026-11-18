import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { isDev, logoutAPI, type CurrentUser } from '@/api/auth';
import {
  CATEGORIES,
  deleteChallenge,
  getChallenges,
  toggleChallengePublic,
  type Category,
  type Challenge,
} from '@/api/ctf';
import {
  getGameItemLinks,
  getGameObjects,
  type GameItemLinks,
  type GameObject,
} from '@/api/gameItems';
import Layout from '@/components/Layout';
import LinkPanel, { type KnownItem } from './LinkPanel';
import './Challenges.css';

/**
 * 문제 관리 + 게임 ↔ 문제 연결 대시보드 (Figma G06·G09·G10, ROLE_DEV 만).
 * 전체 문제(초안 포함)·해결 팀 수·연결된 게임 물건 key. 공개 전환과 삭제를 여기서 하고,
 * key 칸을 누르면 연결 패널(LinkPanel)이 열린다. 문제 수정 API 는 없다 (삭제 후 다시 등록).
 */

type Filter = 'ALL' | 'PUBLIC' | 'DRAFT' | 'UNLINKED' | 'MISSING' | Category;
type Notice = { tone: 'ok' | 'error'; message: string } | null;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; challenges: Challenge[] };

const FILTER_LABEL: Partial<Record<Filter, string>> = {
  ALL: '전체',
  PUBLIC: '공개',
  DRAFT: '초안',
  UNLINKED: '연결 없음',
  MISSING: '맵에 없는 key',
};

const Forbidden = () => (
  <section className="devc__forbidden">
    <p className="devc__crumb">403 · DEV ONLY</p>
    <h1 className="devc__title">문제 관리는 DEV 권한이 필요합니다</h1>
    <p className="devc__lead">
      게임 모드에서는 문제 목록·등록·공개 전환·삭제·게임 물건 연결을 ROLE_DEV 만 할 수 있습니다.
    </p>
    <Link className="devc__btn" to="/">
      해결한 문제로
    </Link>
  </section>
);

function DevChallengesPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();
  const dev = isDev(user);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  /** null: 게임 물건 API 가 꺼져 있거나(CTF_GAME_ENABLED=false) 실패 */
  const [links, setLinks] = useState<GameItemLinks | null>(null);
  /** undefined: 받는 중, null: 못 받음 (게임 꺼짐·CORS) */
  const [objects, setObjects] = useState<GameObject[] | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Challenge | null>(null);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const toLogin = useCallback(() => navigate('/login', { replace: true }), [navigate]);

  const fetchAll = useCallback(
    async (signal?: AbortSignal) => {
      const [list, linkResult] = await Promise.all([
        getChallenges(signal),
        getGameItemLinks(signal),
      ]);
      if (list.status === 'unauthenticated') {
        toLogin();
        return;
      }
      if (list.status !== 'ok') {
        setLoad({ status: 'error', message: list.message });
        return;
      }
      setLoad({ status: 'ok', challenges: list.challenges });
      setLinks(linkResult.status === 'ok' ? linkResult.data : null);
    },
    [toLogin]
  );

  const fetchObjects = useCallback(async (signal?: AbortSignal) => {
    setObjects(undefined);
    setObjects(await getGameObjects(signal));
  }, []);

  useEffect(() => {
    if (!dev) return;
    const controller = new AbortController();
    fetchAll(controller.signal).catch(() => {});
    fetchObjects(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [dev, fetchAll, fetchObjects]);

  const challenges = useMemo(
    () => (load.status === 'ok' ? load.challenges : []),
    [load]
  );

  const itemsByCode = useMemo(
    () => new Map((links?.links ?? []).map((l) => [l.challengeCode, l.items])),
    [links]
  );

  /** key → 이름·공개·연결된 문제 (연결 패널이 "다른 문제에 연결됨" 을 보여 줄 때) */
  const known = useMemo(() => {
    const map = new Map<string, KnownItem>();
    for (const l of links?.links ?? []) {
      for (const item of l.items) {
        map.set(item.key, { name: item.name, visible: item.visible, challengeCode: l.challengeCode });
      }
    }
    for (const item of links?.unlinkedItems ?? []) {
      map.set(item.key, { name: item.name, visible: item.visible, challengeCode: null });
    }
    return map;
  }, [links]);

  const objectKeys = useMemo(
    () => (objects ? new Set(objects.map((o) => o.key)) : null),
    [objects]
  );
  const isMissing = (key: string) => objectKeys !== null && !objectKeys.has(key);

  const publicCount = challenges.filter((c) => c.isPublic).length;
  const linkedCount = challenges.filter((c) => (itemsByCode.get(c.code) ?? []).length > 0).length;
  const missingCount = challenges.filter((c) =>
    (itemsByCode.get(c.code) ?? []).some((i) => isMissing(i.key))
  ).length;

  const shown = challenges.filter((c) => {
    const items = itemsByCode.get(c.code) ?? [];
    if (filter === 'ALL') return true;
    if (filter === 'PUBLIC') return c.isPublic;
    if (filter === 'DRAFT') return !c.isPublic;
    if (filter === 'UNLINKED') return items.length === 0;
    if (filter === 'MISSING') return items.some((i) => isMissing(i.key));
    return c.category === filter;
  });

  const handleLogout = async () => {
    await logoutAPI();
    toLogin();
  };

  const togglePublic = async (challenge: Challenge) => {
    setBusyId(challenge.id);
    const result = await toggleChallengePublic(challenge.id);
    setBusyId(null);
    if (result.status === 'unauthenticated') return toLogin();
    if (result.status === 'error') return setNotice({ tone: 'error', message: result.message });
    setNotice({
      tone: 'ok',
      message: `${challenge.code} 을(를) ${result.data ? '공개' : '초안'}로 바꿨습니다.`,
    });
    fetchAll().catch(() => {});
  };

  const remove = async (challenge: Challenge) => {
    setBusyId(challenge.id);
    const result = await deleteChallenge(challenge.id);
    setBusyId(null);
    setConfirmDelete(null);
    if (result.status === 'unauthenticated') return toLogin();
    if (result.status === 'error') return setNotice({ tone: 'error', message: result.message });
    setNotice({ tone: 'ok', message: `${challenge.code} 을(를) 삭제했습니다.` });
    fetchAll().catch(() => {});
  };

  const filters: Filter[] = [
    'ALL',
    'PUBLIC',
    'DRAFT',
    ...(links ? (['UNLINKED'] as Filter[]) : []),
    ...(links && objectKeys ? (['MISSING'] as Filter[]) : []),
    ...CATEGORIES,
  ];

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="devc">
        {!dev ? (
          <Forbidden />
        ) : (
          <>
            <header className="devc__head">
              <div>
                <p className="devc__crumb">DEV / CHALLENGES · GAME LINKS</p>
                <h1 className="devc__title">문제 관리</h1>
                <p className="devc__lead">
                  맵 오브젝트(게임)와 문제를 key 로 잇습니다. 연결은 저장 즉시 게임에 반영되고 배포가
                  필요 없습니다.
                </p>
              </div>
              <Link className="devc__btn devc__btn--primary" to="/admin/challenges/new">
                + 문제 추가
              </Link>
            </header>

            <dl className="devc__stats">
              <div>
                <dt>전체 문제</dt>
                <dd>{challenges.length}</dd>
                <small>
                  공개 {publicCount} · 초안 {challenges.length - publicCount}
                </small>
              </div>
              <div>
                <dt>게임에 연결됨</dt>
                <dd>{links ? linkedCount : '-'}</dd>
              </div>
              <div>
                <dt>연결 없음</dt>
                <dd className={links && challenges.length - linkedCount > 0 ? 'devc__stat--warn' : undefined}>
                  {links ? challenges.length - linkedCount : '-'}
                </dd>
              </div>
              <div>
                <dt>장식 물건</dt>
                <dd>{links ? links.unlinkedItems.length : '-'}</dd>
                <small>
                  {objects === undefined
                    ? 'objects.json 받는 중'
                    : objects === null
                      ? 'objects.json 못 받음'
                      : `objects.json ${objects.length}개`}
                </small>
              </div>
            </dl>

            {links === null && load.status === 'ok' && (
              <p className="devc__notice devc__notice--error" role="status">
                게임 물건 API 를 불러오지 못했습니다 (CTF_GAME_ENABLED=false 이거나 오류). 연결 칸은
                비어 보입니다.
              </p>
            )}

            <div className="devc__filters" role="tablist" aria-label="필터">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  className={filter === f ? 'devc__chip devc__chip--on' : 'devc__chip'}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABEL[f] ?? f}
                  {f === 'UNLINKED' && ` ${challenges.length - linkedCount}`}
                  {f === 'MISSING' && ` ${missingCount}`}
                </button>
              ))}
            </div>

            {notice && (
              <p className={`devc__notice devc__notice--${notice.tone}`} role="status">
                {notice.message}
              </p>
            )}

            {load.status === 'loading' && <p className="devc__message">불러오는 중입니다.</p>}
            {load.status === 'error' && (
              <div className="devc__message" role="alert">
                <p>{load.message}</p>
                <button type="button" className="devc__btn" onClick={() => fetchAll()}>
                  다시 시도
                </button>
              </div>
            )}

            {load.status === 'ok' && (
              <div className="devc__table" role="table" aria-label="문제 목록">
                <div className="devc__row devc__row--head" role="row">
                  <span role="columnheader">코드</span>
                  <span role="columnheader">제목</span>
                  <span role="columnheader">분야</span>
                  <span role="columnheader">점수</span>
                  <span role="columnheader">공개</span>
                  <span role="columnheader">해결 팀</span>
                  <span role="columnheader">게임 물건 key</span>
                  <span role="columnheader" />
                </div>
                {shown.length === 0 && <p className="devc__message">해당하는 문제가 없습니다.</p>}
                {shown.map((c) => {
                  const items = itemsByCode.get(c.code) ?? [];
                  const open = selected?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={open ? 'devc__row devc__row--selected' : 'devc__row'}
                      role="row"
                    >
                      <span role="cell" className="devc__mono">
                        <Link to={`/challenges/${encodeURIComponent(c.code)}`}>{c.code}</Link>
                      </span>
                      <span role="cell" className="devc__name">
                        {c.title}
                      </span>
                      <span role="cell">{c.category}</span>
                      <span role="cell" className="devc__mono">
                        {c.points ?? '-'}
                        <small> / {c.maxPoint}</small>
                      </span>
                      <span role="cell">
                        <span className={c.isPublic ? 'devc__badge devc__badge--on' : 'devc__badge'}>
                          {c.isPublic ? '공개' : '초안'}
                        </span>
                      </span>
                      <span role="cell" className="devc__mono">
                        {c.solveCount ?? 0}
                      </span>
                      <span role="cell">
                        {links === null ? (
                          '-'
                        ) : (
                          <button
                            type="button"
                            className="devc__items"
                            aria-label={`${c.code} 게임 물건 연결`}
                            onClick={() => setSelected(c)}
                          >
                            {items.length === 0 ? (
                              <span className="devc__none">— 연결 없음 · 연결 +</span>
                            ) : (
                              items.map((item) => (
                                <span
                                  key={item.id}
                                  title={`${item.name}${item.visible ? '' : ' (숨김)'}`}
                                  className={[
                                    'devc__key',
                                    item.visible ? '' : 'devc__hidden-item',
                                    isMissing(item.key) ? 'devc__missing' : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                >
                                  {item.key}
                                  {isMissing(item.key) && ' ⚠ 맵에 없음'}
                                </span>
                              ))
                            )}
                          </button>
                        )}
                      </span>
                      <span role="cell" className="devc__actions">
                        <button
                          type="button"
                          className="devc__btn devc__btn--small"
                          disabled={busyId === c.id}
                          onClick={() => togglePublic(c)}
                        >
                          {c.isPublic ? '초안으로' : '공개'}
                        </button>
                        <button
                          type="button"
                          className="devc__btn devc__btn--small devc__btn--danger"
                          disabled={busyId === c.id}
                          onClick={() => setConfirmDelete(c)}
                        >
                          삭제
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="devc__note">
              "연결 없음" 문제는 참가자가 게임에서 만날 수 없고 상세도 열리지 않습니다. key 칸을 누르면
              연결 패널이 열립니다. 문제 수정 API 는 없습니다 (삭제 후 다시 등록).
            </p>

            {links && links.unlinkedItems.length > 0 && (
              <section className="devc__decor">
                <h2 className="devc__decor-title">
                  장식 물건 · {links.unlinkedItems.length}
                  <small>
                    어느 문제에도 연결되지 않은 물건. 문제 행의 연결 패널에서 이 key 를 고르면 연결됩니다.
                  </small>
                </h2>
                <ul>
                  {links.unlinkedItems.map((item) => (
                    <li key={item.id}>
                      <span className="devc__mono">{item.key}</span>
                      <span>{item.name}</span>
                      {isMissing(item.key) && <span className="devc__missing">⚠ 맵에 없음</span>}
                      {!item.visible && <span className="devc__badge">숨김</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {selected && (
        <LinkPanel
          challenge={selected}
          objects={objects}
          known={known}
          onClose={() => setSelected(null)}
          onChanged={() => fetchAll().catch(() => {})}
          onReloadObjects={() => fetchObjects().catch(() => {})}
          onUnauthenticated={toLogin}
        />
      )}

      {confirmDelete && (
        <div className="devc__modal" role="dialog" aria-modal="true" aria-label="문제 삭제">
          <div className="devc__modal-box">
            <h2>{confirmDelete.code} 삭제</h2>
            <p>
              "{confirmDelete.title}" 을(를) 삭제합니다. 정답 기록과 점수도 함께 사라지고 되돌릴 수
              없습니다.
              {(confirmDelete.solveCount ?? 0) > 0 &&
                ` 이미 ${confirmDelete.solveCount}팀이 푼 문제입니다.`}
            </p>
            <div className="devc__modal-actions">
              <button type="button" className="devc__btn" onClick={() => setConfirmDelete(null)}>
                취소
              </button>
              <button
                type="button"
                className="devc__btn devc__btn--danger"
                disabled={busyId === confirmDelete.id}
                onClick={() => remove(confirmDelete)}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default DevChallengesPage;

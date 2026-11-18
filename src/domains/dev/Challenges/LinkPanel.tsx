import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Challenge } from '@/api/ctf';
import {
  getChallengeItems,
  ITEM_KEY_PATTERN,
  linkItem,
  unlinkItem,
  type AdminGameItem,
  type GameObject,
} from '@/api/gameItems';
import { zoneName } from '@/constants/game';
import './LinkPanel.css';

/**
 * 게임 물건 ↔ 문제 연결 패널 (Figma G09 오른쪽, G10 상태 A~F).
 * 명세: nimda-web-backend/docs/api/CTF 게임 물건 연결 API.md
 *   - 위: 이 문제에 연결된 물건 (수정 · 해제)
 *   - 아래: 맵 오브젝트(objects.json)에서 고르기 → 이름·이야기·공개 → 연결
 *   - objects.json 을 못 받으면 key 직접 입력 (G10 B)
 */

/** 다른 문제·장식 물건의 이름·공개 (문제 관리 화면이 /admin/links 로 만든다) */
export interface KnownItem {
  name: string;
  visible: boolean;
  /** 연결된 문제 코드. 장식 물건이면 null */
  challengeCode: string | null;
}

interface LinkPanelProps {
  challenge: Challenge;
  /** undefined: 받는 중, null: 못 받음 */
  objects: GameObject[] | null | undefined;
  known: Map<string, KnownItem>;
  onClose: () => void;
  /** 연결이 바뀌었다 → 표를 다시 받는다 */
  onChanged: () => void;
  onReloadObjects: () => void;
  onUnauthenticated: () => void;
}

type ItemsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; items: AdminGameItem[] };

type ZoneFilter = 'ALL' | number;

interface Form {
  key: string;
  name: string;
  description: string;
  visible: boolean;
  /** 이미 있는 물건이면 비운 칸은 그대로 둔다 */
  exists: boolean;
}

const excerpt = (text: string | null, size = 70) =>
  !text ? '' : text.length > size ? `${text.slice(0, size)}…` : text;

const LinkPanel = ({
  challenge,
  objects,
  known,
  onClose,
  onChanged,
  onReloadObjects,
  onUnauthenticated,
}: LinkPanelProps) => {
  const code = challenge.code;
  const [items, setItems] = useState<ItemsState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<ZoneFilter>('ALL');
  const [manualKey, setManualKey] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** G10 A: 다른 문제에 연결된 key → 옮길지 확인 */
  const [conflict, setConflict] = useState<string | null>(null);
  /** G10 D: 해제 확인 */
  const [confirmUnlink, setConfirmUnlink] = useState<AdminGameItem | null>(null);

  const loadItems = useCallback(
    async (signal?: AbortSignal) => {
      const result = await getChallengeItems(code, signal);
      if (result.status === 'unauthenticated') return onUnauthenticated();
      setItems(
        result.status === 'ok'
          ? { status: 'ok', items: result.data }
          : { status: 'error', message: result.message }
      );
    },
    [code, onUnauthenticated]
  );

  useEffect(() => {
    const controller = new AbortController();
    setItems({ status: 'loading' });
    setForm(null);
    setNotice(null);
    setError(null);
    loadItems(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [loadItems]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const linked = useMemo(() => (items.status === 'ok' ? items.items : []), [items]);
  const objectByKey = useMemo(
    () => new Map((objects ?? []).map((o) => [o.key, o])),
    [objects]
  );

  const zones = useMemo(
    () => [...new Set((objects ?? []).map((o) => o.zone))].sort((a, b) => a - b),
    [objects]
  );

  const shownObjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (objects ?? []).filter(
      (o) =>
        (zone === 'ALL' || o.zone === zone) &&
        (!q || o.key.includes(q) || (o.hint ?? '').toLowerCase().includes(q))
    );
  }, [objects, query, zone]);

  /** 이 key 가 지금 어디에 연결돼 있는가 */
  const ownerOf = (key: string): 'this' | 'free' | string => {
    if (linked.some((i) => i.key === key)) return 'this';
    const other = known.get(key)?.challengeCode;
    if (other && other !== code) return other;
    return 'free';
  };

  const pick = (key: string) => {
    setError(null);
    setNotice(null);
    const mine = linked.find((i) => i.key === key);
    if (mine) {
      setForm({ key, name: mine.name, description: mine.description ?? '', visible: mine.visible, exists: true });
      return;
    }
    const other = known.get(key);
    setForm({
      key,
      name: other?.name ?? '',
      description: '',
      visible: other?.visible ?? true,
      exists: Boolean(other),
    });
  };

  const submit = async (move = false) => {
    if (!form) return;
    const name = form.name.trim();
    if (!form.exists && !name) {
      setError('새 물건은 이름이 필요합니다.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await linkItem(code, form.key, {
      name: name || undefined,
      description: form.description.trim() || undefined,
      visible: form.visible,
      moveFromOtherChallenge: move || undefined,
    });
    setBusy(false);
    if (result.status === 'unauthenticated') return onUnauthenticated();
    if (result.status === 'conflict') {
      setConflict(result.challengeCode ?? '다른 문제');
      return;
    }
    setConflict(null);
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    setNotice(
      result.created
        ? `${form.key} 을(를) 만들어 연결했습니다.`
        : `${form.key} 을(를) 연결했습니다.`
    );
    setForm(null);
    setManualKey('');
    await loadItems();
    onChanged();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(false);
  };

  const doUnlink = async (item: AdminGameItem) => {
    setBusy(true);
    const result = await unlinkItem(code, item.key);
    setBusy(false);
    setConfirmUnlink(null);
    if (result.status === 'unauthenticated') return onUnauthenticated();
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    setNotice(`${item.key} 연결을 해제했습니다. 게임에서는 장식이 됩니다.`);
    if (form?.key === item.key) setForm(null);
    await loadItems();
    onChanged();
  };

  const manualValid = ITEM_KEY_PATTERN.test(manualKey);

  return (
    <div className="lp__backdrop" onClick={onClose}>
      <aside
        className="lp"
        role="dialog"
        aria-modal="true"
        aria-label={`${code} 게임 물건 연결`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lp__head">
          <div>
            <p className="lp__crumb">
              {code} · {challenge.category}
            </p>
            <h2 className="lp__title">{challenge.title}</h2>
            <p className="lp__meta">
              {challenge.isPublic ? '공개' : '초안'} · 해결 {challenge.solveCount ?? 0}팀 · 연결된 물건{' '}
              {items.status === 'ok' ? linked.length : '…'}개
            </p>
          </div>
          <button type="button" className="lp__close" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>

        {notice && (
          <p className="lp__notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="lp__notice lp__notice--error" role="alert">
            {error}
          </p>
        )}

        {/* 위: 연결된 물건 */}
        <section className="lp__section">
          <h3 className="lp__label">연결된 물건 · {items.status === 'ok' ? linked.length : '…'}</h3>
          {items.status === 'loading' && <p className="lp__muted">불러오는 중입니다.</p>}
          {items.status === 'error' && <p className="lp__muted">{items.message}</p>}
          {items.status === 'ok' && linked.length === 0 && (
            <div className="lp__empty">
              <strong>이 문제를 여는 물건이 없습니다</strong>
              <p>
                참가자는 게임에서 이 문제를 만날 수 없고, 상세도 열리지 않습니다. 아래 맵 오브젝트에서
                골라 연결하세요.
              </p>
            </div>
          )}
          {linked.map((item) => {
            const obj = objectByKey.get(item.key);
            const missing = objects != null && !obj;
            return (
              <div key={item.id} className={missing ? 'lp__item lp__item--missing' : 'lp__item'}>
                <div className="lp__item-row">
                  <span className="lp__key">{item.key}</span>
                  <span className={item.visible ? 'lp__pill lp__pill--on' : 'lp__pill'}>
                    {item.visible ? '공개' : '숨김'}
                  </span>
                  {obj && <span className="lp__pill">{zoneName(obj.zone)}</span>}
                  <span className="lp__grow" />
                  <button type="button" className="lp__link" onClick={() => pick(item.key)}>
                    수정
                  </button>
                  <button
                    type="button"
                    className="lp__link lp__link--danger"
                    onClick={() => setConfirmUnlink(item)}
                  >
                    해제
                  </button>
                </div>
                <strong className="lp__item-name">{item.name}</strong>
                {item.description && <p className="lp__muted">이야기 {excerpt(item.description)}</p>}
                {obj?.hint && <p className="lp__muted lp__muted--light">맵 {obj.hint}</p>}
                {missing && (
                  <p className="lp__warn">
                    ⚠ objects.json 에 없는 key 입니다. 게임에 나타나지 않습니다. 맵에 추가되면 자동으로
                    보입니다.
                  </p>
                )}
                {!item.visible && (
                  <p className="lp__muted lp__muted--light">
                    숨김: 게임에서 장식으로만 보이고, 아직 안 푼 팀에게 이 문제가 열리지 않습니다.
                  </p>
                )}
              </div>
            );
          })}
        </section>

        {/* 아래: 맵 오브젝트 고르기 */}
        <section className="lp__section">
          <div className="lp__label-row">
            <h3 className="lp__label">맵 오브젝트에서 고르기</h3>
            {objects !== null && objects !== undefined && (
              <button type="button" className="lp__refresh" onClick={onReloadObjects}>
                objects.json · {objects.length}개 ↻
              </button>
            )}
          </div>

          {objects === undefined && <p className="lp__muted">맵 오브젝트를 받는 중입니다.</p>}

          {objects === null && (
            <>
              <div className="lp__warnbox">
                <strong>맵 오브젝트 목록을 받지 못했습니다</strong>
                <p>게임 서버가 꺼져 있거나 응답이 없습니다. key 를 직접 입력하세요.</p>
              </div>
              <label className="lp__field">
                <span>물건 key *</span>
                <input
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value.trim())}
                  placeholder="예: broken-tv"
                  aria-invalid={manualKey !== '' && !manualValid}
                />
                <small>a-z 0-9 -, 50자 이하. 맵에 없는 key 는 게임에 나타나지 않습니다</small>
              </label>
              <div className="lp__actions">
                <button
                  type="button"
                  className="devc__btn devc__btn--primary"
                  disabled={!manualValid}
                  onClick={() => pick(manualKey)}
                >
                  다음
                </button>
                <button type="button" className="devc__btn" onClick={onReloadObjects}>
                  목록 다시 받기
                </button>
              </div>
            </>
          )}

          {objects && (
            <>
              <input
                className="lp__search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="key 나 설명으로 찾기"
                aria-label="맵 오브젝트 찾기"
              />
              <div className="lp__zones" role="tablist" aria-label="구역">
                {(['ALL', ...zones] as ZoneFilter[]).map((z) => (
                  <button
                    key={String(z)}
                    type="button"
                    role="tab"
                    aria-selected={zone === z}
                    className={zone === z ? 'devc__chip devc__chip--on' : 'devc__chip'}
                    onClick={() => setZone(z)}
                  >
                    {z === 'ALL' ? '전체' : zoneName(z)}
                  </button>
                ))}
              </div>
              {shownObjects.length === 0 && <p className="lp__muted">맞는 오브젝트가 없습니다.</p>}
              <ul className="lp__objects">
                {shownObjects.map((o) => {
                  const owner = ownerOf(o.key);
                  const selected = form?.key === o.key;
                  const state = selected
                    ? 'selected'
                    : owner === 'this'
                      ? 'this'
                      : owner === 'free'
                        ? 'free'
                        : 'other';
                  return (
                    <li key={o.key}>
                      <button
                        type="button"
                        className={`lp__object lp__object--${state}`}
                        aria-pressed={selected}
                        onClick={() => pick(o.key)}
                      >
                        <span className="lp__object-text">
                          <span className="lp__key">{o.key}</span>
                          <span className="lp__hint">{o.hint || '설명 없음'}</span>
                        </span>
                        <span className="lp__pill">{zoneName(o.zone)}</span>
                        <span className={`lp__pill lp__pill--${state}`}>
                          {state === 'selected'
                            ? '선택함'
                            : state === 'this'
                              ? '이 문제'
                              : state === 'free'
                                ? '연결 없음'
                                : `다른 문제 · ${owner}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* 고른 물건 입력 */}
        {form && (
          <form className="lp__form" onSubmit={onSubmit}>
            <p className="lp__form-title">
              {form.key} → {code} 에 연결
            </p>
            <label className="lp__field">
              <span>이름{form.exists ? '' : ' *'}</span>
              <input
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.exists ? '비워 두면 그대로' : '예: 꺼진 TV'}
              />
              <small>게임 이름표와 획득 표시에 쓰입니다. 100자 이하</small>
            </label>
            <label className="lp__field">
              <span>이야기</span>
              <textarea
                rows={4}
                value={form.description}
                maxLength={5000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.exists ? '비워 두면 기존 이야기를 그대로 둡니다' : ''}
              />
              <small>팀이 문제를 푼 뒤에만 보입니다. 5000자 이하</small>
            </label>
            <label className="lp__toggle">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm({ ...form, visible: e.target.checked })}
              />
              <span>
                <strong>참가자에게 공개</strong>
                <small>끄면 게임에서 장식으로만 보입니다.</small>
              </span>
            </label>
            <div className="lp__actions">
              <button type="submit" className="devc__btn devc__btn--primary" disabled={busy}>
                {busy ? '연결 중…' : '연결'}
              </button>
              <button type="button" className="devc__btn" onClick={() => setForm(null)}>
                취소
              </button>
            </div>
            <code className="lp__api">
              PUT /api/ctf/game/admin/challenges/{code}/items/{form.key}
            </code>
          </form>
        )}

        {/* G10 A: 다른 문제에서 옮기기 */}
        {conflict && form && (
          <div className="lp__confirm" role="alertdialog" aria-label="다른 문제에 연결된 물건">
            <strong>다른 문제에 연결된 물건입니다</strong>
            <p>
              {form.key} 는 지금 {conflict} 에 연결돼 있습니다. 이 문제로 옮기면 {conflict} 에서는
              빠지고, 게임에서 이 물건은 {code} 를 엽니다.
            </p>
            <div className="lp__actions">
              <button
                type="button"
                className="devc__btn devc__btn--primary"
                disabled={busy}
                onClick={() => submit(true)}
              >
                이 문제로 옮기기
              </button>
              <button type="button" className="devc__btn" onClick={() => setConflict(null)}>
                취소
              </button>
            </div>
          </div>
        )}

        {/* G10 D: 해제 확인 */}
        {confirmUnlink && (
          <div className="lp__confirm" role="alertdialog" aria-label="연결 해제">
            <strong>{confirmUnlink.key} 연결을 끊을까요?</strong>
            <p>
              물건과 이름·이야기는 남고, 게임에서는 장식이 됩니다. 언제든 다시 연결할 수 있습니다.
            </p>
            <div className="lp__actions">
              <button
                type="button"
                className="devc__btn devc__btn--danger"
                disabled={busy}
                onClick={() => doUnlink(confirmUnlink)}
              >
                연결 해제
              </button>
              <button type="button" className="devc__btn" onClick={() => setConfirmUnlink(null)}>
                취소
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default LinkPanel;
